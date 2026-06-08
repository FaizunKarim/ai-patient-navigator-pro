import json
import math
from insurance import filter_insurance

# ==========================
# FUNGSI HITUNG JARAK
# ==========================

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Radius bumi dalam KM

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ==========================
# LOAD DATABASE KLINIK
# ==========================

with open("db.json", "r", encoding="utf-8") as file:
    hospitals = json.load(file)


# ==========================
# DATA PASIEN
# ==========================

patient_lat = -7.870
patient_lon = 111.463

# nanti dari AI Agent
required_specialization = "jantung"

# nanti dari AI Agent
patient_insurance = "BPJS"


# ==========================
# SEMUA KLINIK TERDEKAT
# ==========================

all_clinics = []

for hospital in hospitals:

    distance = haversine(
        patient_lat,
        patient_lon,
        hospital["lat"],
        hospital["lon"]
    )

    all_clinics.append({
        "name": hospital["name"],
        "distance": round(distance, 2)
    })

all_clinics.sort(key=lambda x: x["distance"])

print("\n==============================")
print("SEMUA KLINIK TERDEKAT")
print("==============================\n")

for clinic in all_clinics:
    print(f"{clinic['name']} - {clinic['distance']} km")


# ==========================
# FILTER SPESIALIS
# ==========================

specialist_clinics = []

for hospital in hospitals:

    if required_specialization not in hospital["specializations"]:
        continue

    distance = haversine(
        patient_lat,
        patient_lon,
        hospital["lat"],
        hospital["lon"]
    )

    specialist_clinics.append({
        "name": hospital["name"],
        "distance": round(distance, 2),
        "insurance": hospital["insurance"]
    })

specialist_clinics.sort(key=lambda x: x["distance"])

print("\n==============================")
print(f"KLINIK SPESIALIS {required_specialization.upper()}")
print("==============================\n")

for clinic in specialist_clinics:
    print(
        f"{clinic['name']} - "
        f"{clinic['distance']} km"
    )


# ==========================
# FILTER ASURANSI
# ==========================

insurance_clinics = filter_insurance(
    specialist_clinics,
    patient_insurance
)
print("\n==============================")
print(f"KLINIK SPESIALIS + {patient_insurance}")
print("==============================\n")

for clinic in insurance_clinics:
    print(
        f"{clinic['name']} - "
        f"{clinic['distance']} km"
    )


# ==========================
# TOP 3 REKOMENDASI
# ==========================

top3 = insurance_clinics[:3]

print("\n==============================")
print("TOP 3 REKOMENDASI")
print("==============================\n")

for i, clinic in enumerate(top3, start=1):
    print(
        f"{i}. {clinic['name']} "
        f"({clinic['distance']} km)"
    )