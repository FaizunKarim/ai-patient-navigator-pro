# ============================================
# AI Patient Navigator Pro - Environment Variables
# ============================================

# --------------------------------------------
# BACKEND (Express.js)
# --------------------------------------------
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_patient_navigator
JWT_SECRET=rahasia_super_aman_12345

# --------------------------------------------
# BAND PLATFORM (Band SDK)
# --------------------------------------------
BAND_API_KEY=band_key_xxx
BAND_AGENT_ID=agent-uuid-here
BAND_AGENT_HANDLE=@triage_agent
BAND_BASE_URL=https://app.band.ai

# --------------------------------------------
# LLM - Groq (Primary)
# --------------------------------------------
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_TEMPERATURE=0.2

# --------------------------------------------
# LLM - OpenAI ChatGPT (Fallback)
# --------------------------------------------
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# --------------------------------------------
# AGENT CONFIG (Default Patient Data)
# --------------------------------------------
DEFAULT_PATIENT_LAT=-7.870
DEFAULT_PATIENT_LON=111.463
DEFAULT_PATIENT_INSURANCE=BPJS

# --------------------------------------------
# FRONTEND (Vite - VITE_ prefix required)
# --------------------------------------------
VITE_API_BASE_URL=http://localhost:5000