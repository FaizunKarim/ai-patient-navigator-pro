const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const buildSystemPrompt = () => `
Kamu adalah AI Patient Navigator untuk triage awal pasien dalam Bahasa Indonesia.

Tugas utama:
1. Tanyakan klarifikasi jika informasi gejala belum cukup.
2. Deteksi red flags: sesak berat, nyeri dada berat/menjalar, pingsan, kejang, lemas sebelah, bicara pelo, perdarahan banyak, demam sangat tinggi, kaku kuduk, nyeri kepala mendadak terburuk.
3. Jika ada red flags, sarankan segera ke IGD/bantuan darurat.
4. Jika keluhan ringan, beri edukasi singkat dan langkah aman sementara.
5. Jangan mengaku sebagai dokter dan jangan memberi diagnosis pasti.
6. Jawab natural, ringkas, empatik, dan actionable.
`;

const normalizeMessages = (history = []) => {
  return history
    .filter((item) => item?.message)
    .map((item) => ({
      role: item.sender === "user" ? "user" : "assistant",
      content: item.message,
    }));
};

const createPayload = ({ history, message, lat, lon }) => {
  const locationText = lat && lon ? `\nKoordinat pasien bila relevan: ${lat}, ${lon}.` : "";

  return {
    messages: [
      { role: "system", content: buildSystemPrompt() + locationText },
      ...normalizeMessages(history),
      { role: "user", content: message },
    ],
  };
};

const requestChatCompletion = async ({ url, apiKey, model, messages }) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Number(process.env.AI_TEMPERATURE || 0.2),
      max_tokens: Number(process.env.AI_MAX_TOKENS || 700),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI provider error (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI provider tidak mengembalikan teks balasan.");
  }
  return content;
};

const generateChatReply = async ({ history, message, lat, lon }) => {
  const payload = createPayload({ history, message, lat, lon });

  if (process.env.GROQ_API_KEY) {
    return requestChatCompletion({
      url: GROQ_CHAT_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || process.env.AI_MODEL || "llama-3.3-70b-versatile",
      messages: payload.messages,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return requestChatCompletion({
      url: OPENAI_CHAT_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
      messages: payload.messages,
    });
  }

  throw new Error("GROQ_API_KEY atau OPENAI_API_KEY belum di-set di environment backend.");
};

module.exports = {
  generateChatReply,
};