"""
Triage & Geo-Routing Agent (standalone).

Logika triase medis + geo-routing fasilitas kesehatan terdekat.
Berjalan mandiri tanpa platform chat eksternal. Agent ini menerima
keluhan pasien, menjalankan triase (Groq/OpenAI bila tersedia, atau
rule-based sebagai fallback), lalu memberikan rekomendasi fasilitas
terdekat yang sesuai asuransi.

Penggunaan:
    python triage_agent.py              # mode interaktif (stdin)
    python triage_agent.py "keluhan"    # satu kali triage
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Literal

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, ValidationError

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


def _build_llm():
    # Coba Groq dulu (primary)
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


def _format_routing_message(result: TriageOutput, routing: Any, patient_insurance: str | None) -> str:
    parts: list[str] = []
    if result.summary:
        parts.append(result.summary)
    if getattr(routing, "fallback_used", False):
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


def triage_message_to_text(
    triage: TriageOutput,
    *,
    patient_lat: float,
    patient_lon: float,
    patient_insurance: str | None,
) -> str:
    """Ubah hasil triase menjadi teks jawaban untuk pasien.

    Jika INCOMPLETE -> tampilkan clarifying question.
    Jika LOW urgency dengan OTC -> tampilkan saran OTC.
    Jika butuh fasilitas -> lakukan geo-routing & rekomendasi.
    """
    if triage.status == "INCOMPLETE":
        return triage.clarifying_question or "Boleh jelaskan gejalanya lebih spesifik?"

    urgency = triage.urgency or "LOW"
    if urgency == "LOW" and triage.otc_recommendations:
        otc = ", ".join(triage.otc_recommendations)
        return (triage.summary or "Keluhan tampak ringan.") + f"\nSaran OTC: {otc}"

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
    return _format_routing_message(triage, routing, patient_insurance)


async def run_agent() -> None:
    load_dotenv()

    patient_lat = float(os.getenv("DEFAULT_PATIENT_LAT", "-7.870"))
    patient_lon = float(os.getenv("DEFAULT_PATIENT_LON", "111.463"))
    patient_insurance = os.getenv("DEFAULT_PATIENT_INSURANCE", "BPJS")

    llm = _build_llm()
    print("🤖 Triage Agent (standalone)")
    print(f"📍 Default location: {patient_lat}, {patient_lon}")
    print(f"🏥 Default insurance: {patient_insurance}")
    print(f"🧠 LLM: {'Groq/OpenAI' if llm else 'Rule-based (no LLM)'}")
    print("Ketik keluhan pasien (atau 'exit' untuk keluar).")

    history: list[dict[str, str]] = []

    while True:
        try:
            content = await asyncio.to_thread(input, "\nPasien> ")
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            break

        content = content.strip()
        if not content:
            continue
        if content.lower() in {"exit", "quit", "keluar"}:
            break

        history.append({"role": "user", "content": content})

        if llm:
            triage = await _llm_triage(llm, history[-6:])
        else:
            triage = _rule_based_triage(content)

        answer = triage_message_to_text(
            triage,
            patient_lat=patient_lat,
            patient_lon=patient_lon,
            patient_insurance=patient_insurance,
        )
        print(f"🩺 {answer}")
        history.append({"role": "assistant", "content": answer})


def main() -> None:
    # Mode argumen: triage satu kali untuk keluhan yang diberikan.
    if len(sys.argv) > 1:
        complaint = " ".join(sys.argv[1:])
        load_dotenv()
        patient_lat = float(os.getenv("DEFAULT_PATIENT_LAT", "-7.870"))
        patient_lon = float(os.getenv("DEFAULT_PATIENT_LON", "111.463"))
        patient_insurance = os.getenv("DEFAULT_PATIENT_INSURANCE", "BPJS")

        async def _once() -> None:
            llm = _build_llm()
            triage = await _llm_triage(llm, [{"role": "user", "content": complaint}]) if llm else _rule_based_triage(complaint)
            print(triage_message_to_text(
                triage,
                patient_lat=patient_lat,
                patient_lon=patient_lon,
                patient_insurance=patient_insurance,
            ))

        asyncio.run(_once())
        return

    asyncio.run(run_agent())


if __name__ == "__main__":
    main()
