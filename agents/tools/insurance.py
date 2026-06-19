from __future__ import annotations

from typing import Any


def filter_insurance(
    clinics: list[dict[str, Any]],
    patient_insurance: str,
) -> list[dict[str, Any]]:
    insurance = patient_insurance.strip()
    if not insurance:
        return clinics

    filtered: list[dict[str, Any]] = []
    for clinic in clinics:
        accepted = clinic.get("insurance") or []
        if insurance in accepted:
            filtered.append(clinic)
    return filtered


def insurance_match(
    clinic: dict[str, Any],
    patient_insurance: str,
) -> bool:
    accepted = clinic.get("insurance") or []
    return patient_insurance in accepted
