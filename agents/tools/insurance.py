def filter_insurance(clinics, patient_insurance):

    filtered = []

    for clinic in clinics:

        if patient_insurance in clinic["insurance"]:
            filtered.append(clinic)

    return filtered