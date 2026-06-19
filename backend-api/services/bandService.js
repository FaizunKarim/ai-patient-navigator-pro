const BAND_BASE_URL = process.env.BAND_BASE_URL || "https://app.band.ai";

const isBandConfigured = () => {
  return !!process.env.BAND_API_KEY;
};

const bandRequest = async (path, { method = "GET", body } = {}) => {
  const apiKey = process.env.BAND_API_KEY;
  if (!apiKey) {
    throw new Error("BAND_API_KEY belum di-set");
  }

  const url = new URL(path.replace(/^\//, ""), BAND_BASE_URL.endsWith("/") ? BAND_BASE_URL : `${BAND_BASE_URL}/`);

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Band API error (${res.status}): ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return await res.json();
};

const createChat = async () => {
  const data = await bandRequest("/api/v1/me/chats", { method: "POST", body: { chat: {} } });
  return data?.chat?.id || data?.data?.id || data?.id;
};

const listChats = async ({ page = 1, pageSize = 50 } = {}) => {
  return await bandRequest(`/api/v1/me/chats?page=${page}&page_size=${pageSize}`, { method: "GET" });
};

const listMessages = async ({ chatId, page = 1, pageSize = 50 } = {}) => {
  return await bandRequest(`/api/v1/me/chats/${chatId}/messages?page=${page}&page_size=${pageSize}`, { method: "GET" });
};

const sendMessage = async ({ chatId, content, mentions }) => {
  return await bandRequest(`/api/v1/me/chats/${chatId}/messages`, {
    method: "POST",
    body: {
      message: {
        content,
        mentions,
      },
    },
  });
};

module.exports = {
  isBandConfigured,
  createChat,
  listChats,
  listMessages,
  sendMessage,
};