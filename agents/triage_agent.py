from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any, Literal

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, ValidationError
from thenvoi.client.rest import (
    AsyncRestClient,
    ChatMessageRequest,
    ChatMessageRequestMentionsItem,
    DEFAULT_REQUEST_OPTIONS,
)
from thenvoi.platform.event import MessageEvent, RoomAddedEvent
from thenvoi.platform import ThenvoiLink

from tools.geo_routing import recommend_facilities


class TriageOutput(BaseModel):
    status: Literal["INCOMPLETE", "COMPLETE"]
    urgency: Literal["LOW", "MEDIUM", "HIGH"] | None = None
    specialization: str | None = None
    otc_recommendations: list[str] = Field(default_factory=list)
    clarifying_question: str | None = None
    summary: str | None = None
    red_flags: list[str] = Field(default_factory=list)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _should_process_message(
    *,
    payload: Any,
    agent_id: str,
) -> bool:
    if payload is None:
        return False

    if getattr(payload, "sender_type", None) == "agent" and getattr(payload, "sender_id", None) == agent_id:
        return False

    metadata = getattr(payload, "metadata", None)
    mentions = getattr(metadata, "mentions", None) if metadata else None
    if not mentions:
        return False

    for m in mentions:
        if getattr(m, "id", None) == agent_id:
            return True
    return False


def _build_llm():
    # Cobo Groq dulu (primary)
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            return ChatOpenAI(
                api_key=groq_key,
                base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
                model=os.getenv("AI_MODEL", "llama-3.3-70b-versatile"),
                temperature=float(os.getenv("AI_TEMPERATURE", "0.2")),
            )
        except Exception:
            pass

    # Fallback ke OpenAI ChatGPT
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            return ChatOpenAI(
                api_key=openai_key,
                base_url="https://api.openai.com/v1",
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=float(os.getenv("AI_TEMPERATURE", "0.2")),
            )
        except Exception:
            pass

    return None


def _rule_based_triage(text: str) -> TriageOutput:
    t = text.lower()
    if len(t.strip()) < 6 or t.strip() in {"sakit", "pusing", "demam", "batuk"}:
        return TriageOutput(
            status="INCOMPLETE",
            clarifying_question="Boleh jelaskan gejalanya lebih spesifik? (lokasi nyeri, sejak kapan, skala 1-10, ada demam/sesak/pingsan?)",
        )

    high_keywords = ["sesak", "nyeri dada", "pingsan", "kejang", "darah banyak", "stroke", "lemas sebelah"]
    if any(k in t for k in high_keywords):
        return TriageOutput(
            status="COMPLETE",
            urgency="HIGH",
            specialization="igd",
            summary="Ada tanda bahaya. Disarankan penanganan darurat.",
            red_flags=["tanda bahaya terdeteksi"],
        )

    if "jantung" in t or "dada" in t:
        return TriageOutput(
            status="COMPLETE",
            urgency="MEDIUM",
            specialization="jantung",
            summary="Kemungkinan keluhan terkait dada/jantung; perlu evaluasi lebih lanjut.",
        )

    return TriageOutput(
        status="COMPLETE",
        urgency="LOW",
        specialization="dokter_umum",
        otc_recommendations=["paracetamol"],
        summary="Keluhan tampak ringan; bisa mulai perawatan mandiri dan evaluasi bila memburuk.",
    )


async def _llm_triage(llm: ChatOpenAI, history: list[dict[str, str]]) -> TriageOutput:
    system = (
        "Kamu adalah Triage & Clarification Agent untuk pasien. "
        "Jawab SELALU dalam JSON murni, tanpa markdown. "
        "Aturan: "
        "1) Jika informasi kurang, status=INCOMPLETE dan isi clarifying_question (1 pertanyaan tajam). "
        "2) Jika cukup, status=COMPLETE, isi urgency=LOW/MEDIUM/HIGH, specialization (dokter_umum/jantung/saraf/anak/igd/dll), "
        "otc_recommendations (boleh kosong), summary singkat, red_flags bila ada. "
        "3) Hindari loop: bila pasien tidak kooperatif namun ada indikasi bahaya, jadikan COMPLETE dan arahkan dokter umum/IGD."
    )

    lines = []
    for item in history:
        role = item.get("role", "user")
        content = item.get("content", "")
        lines.append(f"{role.upper()}: {content}")
    user = "Riwayat:\n" + "\n".join(lines)

    msg = await llm.ainvoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
    )

    raw = getattr(msg, "content", "")
    try:
        data = json.loads(raw)
    except Exception:
        data = {"status": "INCOMPLETE", "clarifying_question": "Boleh jelaskan gejalanya lebih spesifik?"}

    try:
        return TriageOutput.model_validate(data)
    except ValidationError:
        return TriageOutput(status="INCOMPLETE", clarifying_question="Boleh jelaskan gejalanya lebih spesifik?")


async def _fetch_recent_history(rest: AsyncRestClient, room_id: str, limit: int = 6) -> list[dict[str, str]]:
    response = await rest.human_api_messages.list_my_chat_messages(
        chat_id=room_id,
        page=1,
        page_size=max(1, limit),
        request_options=DEFAULT_REQUEST_OPTIONS,
    )
    items = list(getattr(response, "data", []) or [])
    items.reverse()
    history: list[dict[str, str]] = []
    for m in items[-limit:]:
        role = "assistant" if getattr(m, "sender_type", "") == "agent" else "user"
        history.append({"role": role, "content": getattr(m, "content", "")})
    return history


def _format_routing_message(result: TriageOutput, routing: Any, patient_insurance: str | None) -> str:
    parts: list[str] = []
    if result.summary:
        parts.append(result.summary)
    if routing.fallback_used:
        parts.append("Spesialis tidak tersedia di area terdekat. Dialihkan ke layanan umum terdekat.")

    parts.append("Rekomendasi fasilitas terdekat:")
    for i, r in enumerate(routing.recommendations, start=1):
        name = r.get("name", "-")
        distance = r.get("distance_km", "-")
        accepted = r.get("insurance") or []
        if patient_insurance:
            insurance_text = "sesuai" if patient_insurance in accepted else "tidak sesuai"
        else:
            insurance_text = "tidak diketahui"
        parts.append(f"{i}. {name} ({distance} km) - asuransi {insurance_text}")

    return "\n".join(parts)


async def _reply(
    rest: AsyncRestClient,
    *,
    room_id: str,
    sender_id: str,
    sender_name: str | None,
    text: str,
) -> None:
    mention_name = (sender_name or "user").strip() or "user"
    content = f"@{mention_name} {text}".strip()
    await rest.agent_api_messages.create_agent_chat_message(
        chat_id=room_id,
        message=ChatMessageRequest(
            content=content,
            mentions=[ChatMessageRequestMentionsItem(id=sender_id)],
        ),
        request_options=DEFAULT_REQUEST_OPTIONS,
    )


async def run_agent() -> None:
    load_dotenv()

    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    if not agent_id or not api_key:
        raise RuntimeError("BAND_AGENT_ID dan BAND_API_KEY wajib di-set")

    patient_lat = float(os.getenv("DEFAULT_PATIENT_LAT", "-7.870"))
    patient_lon = float(os.getenv("DEFAULT_PATIENT_LON", "111.463"))
    patient_insurance = os.getenv("DEFAULT_PATIENT_INSURANCE", "BPJS")

    llm = _build_llm()
    print(f"🤖 Agent starting... ID: {agent_id}")
    print(f"📍 Default location: {patient_lat}, {patient_lon}")
    print(f"🏥 Default insurance: {patient_insurance}")
    print(f"🧠 LLM: {'Groq/OpenAI' if llm else 'Rule-based (no LLM)'}")
    
    link = ThenvoiLink(agent_id=agent_id, api_key=api_key)
    print("🔌 Connecting to Band Platform...")

    await link.connect()
    print("✅ Connected to Band Platform!")
    
    await link.subscribe_agent_rooms(agent_id)
    print("✅ Subscribed to agent rooms!")

    try:
        chats = await link.rest.agent_api_chats.list_agent_chats(
            page=1,
            page_size=100,
            request_options=DEFAULT_REQUEST_OPTIONS,
        )
        for room in getattr(chats, "data", []) or []:
            room_id = getattr(room, "id", None)
            if room_id:
                await link.subscribe_room(room_id)
    except Exception:
        pass

    print("\n👂 Listening for messages... (Press Ctrl+C to stop)")
    async for event in link:
        if isinstance(event, RoomAddedEvent) and event.room_id:
            print(f"📥 New room added: {event.room_id}")
            await link.subscribe_room(event.room_id)
            continue

        if not isinstance(event, MessageEvent):
            continue

        room_id = event.room_id or getattr(event.payload, "chat_room_id", None)
        payload = event.payload
        if not room_id or not payload:
            continue

        if not _should_process_message(payload=payload, agent_id=agent_id):
            continue

        message_id = getattr(payload, "id", "")
        sender_id = getattr(payload, "sender_id", "")
        sender_name = getattr(payload, "sender_name", None)
        content = getattr(payload, "content", "")

        print(f"💬 Processing message from {sender_name}: {content[:50]}...")
        await link.mark_processing(room_id, message_id)

        try:
            history = await _fetch_recent_history(link.rest, room_id, limit=6)
            if llm:
                triage = await _llm_triage(llm, history)
            else:
                triage = _rule_based_triage(content)

            if triage.status == "INCOMPLETE":
                q = triage.clarifying_question or "Boleh jelaskan gejalanya lebih spesifik?"
                print(f"❓ Clarifying: {q}")
                await _reply(link.rest, room_id=room_id, sender_id=sender_id, sender_name=sender_name, text=q)
                await link.mark_processed(room_id, message_id)
                continue

            urgency = triage.urgency or "LOW"
            if urgency == "LOW" and triage.otc_recommendations:
                otc = ", ".join(triage.otc_recommendations)
                text = (triage.summary or "Keluhan tampak ringan.") + f"\nSaran OTC: {otc}"
                print(f"💊 LOW urgency - OTC: {otc}")
                await _reply(link.rest, room_id=room_id, sender_id=sender_id, sender_name=sender_name, text=text)
                await link.mark_processed(room_id, message_id)
                continue

            spec = (triage.specialization or "dokter_umum").strip().lower()
            if spec == "igd":
                spec = "dokter_umum"

            routing = recommend_facilities(
                patient_lat=patient_lat,
                patient_lon=patient_lon,
                specialization=spec,
                patient_insurance=patient_insurance,
                limit=3,
            )
            text = _format_routing_message(triage, routing, patient_insurance)
            print(f"🏥 Routing to {spec}: {routing.recommendations[0].name if routing.recommendations else 'No facilities'}")
            await _reply(link.rest, room_id=room_id, sender_id=sender_id, sender_name=sender_name, text=text)
            await link.mark_processed(room_id, message_id)
        except Exception as e:
            print(f"❌ Error: {e}")
            await link.mark_failed(room_id, message_id, str(e))


def main() -> None:
    asyncio.run(run_agent())


if __name__ == "__main__":
    main()