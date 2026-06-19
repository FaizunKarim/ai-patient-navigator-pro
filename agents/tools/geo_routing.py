from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .insurance import filter_insurance


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def load_facilities(db_path: str | Path | None = None) -> list[dict[str, Any]]:
    path = Path(db_path) if db_path else (Path(__file__).resolve().parent / "db.json")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Database fasilitas harus berbentuk list JSON")
    return data


def _rank_by_distance(
    facilities: list[dict[str, Any]],
    patient_lat: float,
    patient_lon: float,
) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for facility in facilities:
        lat = float(facility.get("lat"))
        lon = float(facility.get("lon"))
        distance_km = haversine(patient_lat, patient_lon, lat, lon)
        ranked.append(
            {
                **facility,
                "distance_km": round(distance_km, 2),
            }
        )
    ranked.sort(key=lambda x: x.get("distance_km", 10**9))
    return ranked


def filter_by_specialization(
    facilities: list[dict[str, Any]],
    specialization: str | None,
) -> list[dict[str, Any]]:
    if not specialization:
        return facilities
    spec = specialization.strip().lower()
    out: list[dict[str, Any]] = []
    for facility in facilities:
        specializations = facility.get("specializations") or []
        if any(str(s).lower() == spec for s in specializations):
            out.append(facility)
    return out


@dataclass(frozen=True)
class RoutingResult:
    specialization_used: str | None
    fallback_used: bool
    recommendations: list[dict[str, Any]]


def recommend_facilities(
    *,
    patient_lat: float,
    patient_lon: float,
    specialization: str | None,
    patient_insurance: str | None,
    limit: int = 3,
    db_path: str | Path | None = None,
    fallback_specialization: str = "dokter_umum",
) -> RoutingResult:
    facilities = load_facilities(db_path=db_path)
    fallback_used = False
    specialization_used = specialization.strip().lower() if specialization else None

    filtered = filter_by_specialization(facilities, specialization_used)
    if not filtered and specialization_used and specialization_used != fallback_specialization:
        fallback_used = True
        specialization_used = fallback_specialization
        filtered = filter_by_specialization(facilities, specialization_used)

    ranked = _rank_by_distance(filtered or facilities, patient_lat, patient_lon)

    if patient_insurance:
        ranked = filter_insurance(ranked, patient_insurance)
        if not ranked:
            ranked = _rank_by_distance(filtered or facilities, patient_lat, patient_lon)

    return RoutingResult(
        specialization_used=specialization_used,
        fallback_used=fallback_used,
        recommendations=ranked[: max(1, limit)],
    )
