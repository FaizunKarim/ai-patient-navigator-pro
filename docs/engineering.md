# Engineering Blueprint - AI Patient Navigator Pro

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│  ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Auth.jsx │  │MainChat  │  │Dashboard │  │Components│    │
│  │(Login/Reg)│  │.jsx      │  │.jsx      │  │(ChatBub  │    │
│  └─────┬─────┘  │(Chat UI) │  │(Faskes)  │  │ ble,dll) │    │
│        │        └────┬─────┘  └────┬─────┘  └──────────┘    │
│        └─────────────┴─────────────┘                        │
│                         │ utils/auth.js (JWT)               │
│                         │ utils/api.js (Axios interceptor)  │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/JSON
┌─────────────────────────┼───────────────────────────────────┐
│              BACKEND (Express.js + MongoDB)                 │
│  ┌──────────────────┐   │   ┌──────────────────────────┐    │
│  │ authController   │   │   │ chatController           │    │
│  │ - register       │   │   │ - getHistory             │    │
│  │ - login (JWT 7d) │   │   │ - getSessions            │    │
│  └────────┬─────────┘   │   │ - ensureSession          │    │
│           │             │   │ - getRoom                │    │
│           ▼             │   │ - sendMessage            │    │
│  ┌──────────────────┐   │   └───────────┬──────────────┘    │
│  │ authMiddleware   │   │               │                   │
│  │ (JWT verify)     │   │   ┌───────────▼──────────────┐    │
│  └──────────────────┘   │   │ referralController       │    │
│                         │   │ - submitReferral         │    │
│  ┌──────────────────┐   │   │ - getReferrals           │    │
│  │ Models:          │   │   └──────────────────────────┘    │
│  │ - User (Mongoose)│   │                                   │
│  │ - ChatHistory    │   │   ┌──────────────────────────┐    │
│  └──────────────────┘   │   │ bandService.js           │    │
│                         │   │ (Band API proxy)         │    │
│                         │   └──────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │ WebSocket / REST
┌─────────────────────────┼───────────────────────────────────┐
│          AGENTS (Python / Band SDK)                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │              triage_agent.py                       │     │
│  │  - Koneksi WebSocket (BandLink)                    │     │
│  │  - Mention-based message processing                │     │
│  │  - LLM Triage (Groq Llama 3.3 70B / OpenAI GPT)    │     │
│  │  - Rule-based fallback triage                      │     │
│  │  - Geo-Routing + Insurance filter pipeline         │     │
│  └───────────────────────┬────────────────────────────┘     │
│                          │                                  │
│   ┌──────────┐  ┌────────┴────────┐  ┌──────────┐           │
│   │geo_routin│  │   db.json       │  │insurance │           │
│   │g.py      │  │ (6 fasilitas    │  │.py       │           │
│   │Haversine │  │  kesehatan)     │  │filter by │           │
│   │+ fallback│  └─────────────────┘  │insurance │           │
│   └──────────┘                       └──────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Skema Database

### Users
```
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required, bcrypt hashed),
  bandChatId: String (default: null),
  defaultLat: Number (default: null),
  defaultLon: Number (default: null),
  createdAt: Date (default: now)
}
```

### ChatHistory
```
{
  _id: ObjectId,
  userId: String,
  roomId: String,
  sender: String ("user" | "agent"),
  message: String,
  timestamp: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

## Alur Autentikasi

1. **Register**: POST `/api/auth/register` → bcrypt hash password → simpan User → return success
2. **Login**: POST `/api/auth/login` → verifikasi password → JWT sign (`expiresIn: "7d"`) → return token + user data
3. **Auto-Bypass**: Frontend `isAuthenticated()` cek `localStorage` → decode JWT → validasi `exp > Date.now()` → redirect ke `/chat` atau `/`

## Alur Chat

1. `ensureSession` → GET `/api/chat/session` → buat room baru jika belum ada (Band atau local)
2. `sendMessage` → POST `/api/chat/send` { roomId, message, lat, lon } → kirim ke Band API + mention agent → return queued response
3. `getRoom` → GET `/api/chat/room/:roomId` → ambil riwayat pesan dari Band API atau MongoDB
4. Agent `triage_agent.py` → terima event via WebSocket → proses triase → reply ke room

## LLM Strategy: Groq (Primary) → OpenAI ChatGPT (Fallback)

Agent menggunakan strategi dual-LLM:
1. **Primary**: Groq API dengan model `llama-3.3-70b-versatile` (gratis, cepat)
2. **Fallback**: OpenAI ChatGPT `gpt-4o-mini` (jika Groq gagal/limit)
3. **Final Fallback**: Rule-based triage (tanpa LLM) jika kedua API tidak tersedia

Konfigurasi di `_build_llm()`:
- Cek `GROQ_API_KEY` → jika ada, gunakan Groq
- Jika Groq gagal, cek `OPENAI_API_KEY` → gunakan OpenAI
- Jika keduanya tidak ada, return `None` → pakai rule-based

## Aturan Standar Penulisan Kode

1. **Separation of Concerns**: Controller ↔ Service ↔ Model dipisah jelas
2. **Error Handling**: Semua async handler punya try-catch dengan response JSON `{ success: false, message: "..." }`
3. **JWT**: Token diverifikasi di middleware `authMiddleware.js` untuk semua route privat
4. **Environment Variables**: `.env` untuk semua konfigurasi rahasia (JWT_SECRET, MONGODB_URI, BAND_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, dll)
5. **Version Control**: Commit deskriptif, branch terpisah untuk fitur baru