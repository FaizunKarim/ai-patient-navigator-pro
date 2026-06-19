# API Contracts - AI Patient Navigator Pro

## Format Umum Response

Semua response dari API backend Express menggunakan format JSON seragam:

### Sukses
```json
{
  "success": true,
  "data": { ... },
  "message": "Pesan sukses (opsional)"
}
```

### Error
```json
{
  "success": false,
  "message": "Deskripsi error"
}
```

---

## Endpoint Autentikasi

### POST `/api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User berhasil didaftarkan!"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email ini sudah terdaftar di sistem kami!"
}
```

### POST `/api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "64a1b2c3d4e5f6...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email atau Password yang Anda ketikkan salah!"
}
```

---

## Endpoint Chat

Semua endpoint chat memerlukan **Authorization header**: `Bearer <token>`

### GET `/api/chat/session`

**Query Parameters:**
- `fresh` (optional, boolean): Jika `true`, paksa buat room baru

**Response (200):**
```json
{
  "success": true,
  "roomId": "default-room",
  "mode": "local"
}
```

Atau (mode Band):
```json
{
  "success": true,
  "roomId": "chat-uuid-here",
  "mode": "band"
}
```

### POST `/api/chat/send`

**Request Body:**
```json
{
  "roomId": "default-room",
  "message": "Saya sakit kepala sejak 3 hari",
  "lat": -7.870,
  "lon": 111.463
}
```

Catatan: `lat` dan `lon` bersifat opsional (dikirim saat GPS tersedia).

**Response (201) - Mode Local:**
```json
{
  "success": true,
  "roomId": "default-room",
  "aiResponse": {
    "id": "1718000000000",
    "text": "Patient Navigator menerima pesan: Saya sakit kepala sejak 3 hari"
  }
}
```

**Response (201) - Mode Band:**
```json
{
  "success": true,
  "roomId": "chat-uuid",
  "queued": true,
  "aiResponse": {
    "id": "1718000000000",
    "text": "Diproses oleh agen..."
  }
}
```

### GET `/api/chat/room/:roomId`

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1",
      "text": "Halo! Ada yang bisa saya bantu?",
      "isAi": true,
      "createdAt": "2024-06-10T10:00:00.000Z"
    },
    {
      "id": "msg-2",
      "text": "Saya sakit kepala",
      "isAi": false,
      "createdAt": "2024-06-10T10:01:00.000Z"
    }
  ]
}
```

### GET `/api/chat/sessions`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "roomId": "chat-uuid-1",
      "title": "Konsultasi Medis",
      "insertedAt": "2024-06-10T10:00:00.000Z"
    }
  ]
}
```

### GET `/api/chat/history`

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64a1b2c3...",
      "userId": "user-id",
      "roomId": "default-room",
      "sender": "user",
      "message": "Saya sakit kepala",
      "timestamp": "2024-06-10T10:01:00.000Z",
      "createdAt": "2024-06-10T10:01:00.000Z"
    }
  ]
}
```

---

## Endpoint Referral

### POST `/api/referral/submit`

**Request Body:**
```json
{
  "facilityName": "RSUD Ponorogo",
  "distance": 1.5,
  "roomId": "chat-uuid-1"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Anda telah dirujuk ke RSUD Ponorogo. Silakan menuju ke fasilitas tersebut.",
  "data": {
    "userId": "user-id",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "facilityName": "RSUD Ponorogo",
    "distance": 1.5,
    "roomId": "chat-uuid-1",
    "referredAt": "2024-06-10T10:30:00.000Z"
  }
}
```

### GET `/api/referral/list`

**Response (200):**
```json
{
  "success": true,
  "message": "Fitur dashboard klinik akan segera tersedia.",
  "data": []
}
```

---

## Format Data Agent (Python - Internal)

### TriageOutput (Pydantic Model)
```json
{
  "status": "INCOMPLETE | COMPLETE",
  "urgency": "LOW | MEDIUM | HIGH",
  "specialization": "dokter_umum | jantung | saraf | anak | igd",
  "otc_recommendations": ["paracetamol"],
  "clarifying_question": "Boleh jelaskan gejalanya lebih spesifik?",
  "summary": "Ringkasan klinis singkat",
  "red_flags": ["tanda bahaya terdeteksi"]
}
```

### RoutingResult (Dataclass)
```json
{
  "specialization_used": "dokter_umum",
  "fallback_used": false,
  "recommendations": [
    {
      "id": 1,
      "name": "RSUD Ponorogo",
      "lat": -7.868,
      "lon": 111.462,
      "specializations": ["dokter_umum", "jantung", "saraf"],
      "insurance": ["BPJS", "Mandiri"],
      "distance_km": 1.23
    }
  ]
}
```

---

## Environment Variables

| Variable | Deskripsi | Contoh |
|---|---|---|
| `PORT` | Port backend server | `5000` |
| `MONGODB_URI` | URI koneksi MongoDB | `mongodb://127.0.0.1:27017/ai_patient_navigator` |
| `JWT_SECRET` | Secret key untuk JWT | `rahasia_super_aman` |
| `BAND_API_KEY` | API Key Band Platform | `band_key_xxx` |
| `BAND_AGENT_ID` | Agent ID Band | `agent-uuid` |
| `BAND_AGENT_HANDLE` | Handle mention agent | `@triage_agent` |
| `GROQ_API_KEY` | API Key Groq | `gsk_xxx` |
| `GROQ_BASE_URL` | Base URL Groq | `https://api.groq.com/openai/v1` |
| `AI_MODEL` | Model LLM | `llama-3.3-70b-versatile` |
| `AI_TEMPERATURE` | Temperature LLM | `0.2` |
| `DEFAULT_PATIENT_LAT` | Default latitude GPS | `-7.870` |
| `DEFAULT_PATIENT_LON` | Default longitude GPS | `111.463` |
| `DEFAULT_PATIENT_INSURANCE` | Default asuransi | `BPJS` |