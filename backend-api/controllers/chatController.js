const ChatHistory = require("../models/ChatHistory");
const User = require("../models/User");
const thenvoi = require("../services/thenvoiService");

const getHistory = async (req, res) => {
  try {
    const history = await ChatHistory.find({ userId: req.user.userId }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat chat." });
  }
};

const getSessions = async (req, res) => {
  try {
    if (thenvoi.isThenvoiConfigured()) {
      const data = await thenvoi.listChats({ page: 1, pageSize: 50 });
      const chats = data?.data || data?.chats || [];
      const sessions = chats.map((c) => ({
        roomId: c.id,
        title: c.title || "Konsultasi Medis",
        insertedAt: c.inserted_at || c.insertedAt || null,
      }));
      return res.status(200).json({ success: true, data: sessions });
    }

    const docs = await ChatHistory.find({ userId: req.user.userId }).sort({ createdAt: 1 }).lean();
    const byRoom = new Map();
    for (const item of docs) {
      const rid = item.roomId || "default-room";
      if (!byRoom.has(rid) && item.sender === "user") {
        byRoom.set(rid, {
          roomId: rid,
          title: item.message?.slice(0, 40) || "Konsultasi Medis",
          insertedAt: item.createdAt || item.timestamp || null,
        });
      }
    }
    return res.status(200).json({ success: true, data: Array.from(byRoom.values()).reverse() });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar sesi chat." });
  }
};

const ensureSession = async (req, res) => {
  try {
    const fresh = String(req.query.fresh || "").toLowerCase() === "true";
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

    if (!thenvoi.isThenvoiConfigured()) {
      return res.status(200).json({ success: true, roomId: user.bandChatId || "default-room", mode: "local" });
    }

    if (fresh || !user.bandChatId) {
      const chatId = await thenvoi.createChat();
      user.bandChatId = chatId;
      await user.save();
    }

    return res.status(200).json({ success: true, roomId: user.bandChatId, mode: "thenvoi" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal membuat sesi chat." });
  }
};

const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (thenvoi.isThenvoiConfigured()) {
      const data = await thenvoi.listMessages({ chatId: roomId, page: 1, pageSize: 100 });
      const items = data?.data || data?.messages || [];
      const messages = items
        .slice()
        .reverse()
        .map((m) => ({
          id: m.id,
          text: m.content,
          isAi: m.sender_type === "agent",
          senderType: m.sender_type,
          senderId: m.sender_id,
          createdAt: m.inserted_at || null,
        }));
      return res.status(200).json({ success: true, messages });
    }

    const history = await ChatHistory.find({ userId: req.user.userId, roomId }).sort({ createdAt: 1 }).lean();
    const messages = history.map((h) => ({
      id: h._id.toString(),
      text: h.message,
      isAi: h.sender !== "user",
      createdAt: h.createdAt || h.timestamp || null,
    }));
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil chat room." });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId, message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Pesan wajib diisi." });
    }

    if (!thenvoi.isThenvoiConfigured()) {
      await ChatHistory.create({
        userId: req.user.userId,
        roomId: roomId || "default-room",
        sender: "user",
        message,
      });

      return res.status(201).json({
        success: true,
        roomId: roomId || "default-room",
        aiResponse: {
          id: Date.now().toString(),
          text: `Patient Navigator menerima pesan: ${message}`,
        },
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

    const chatId = roomId || user.bandChatId || (await thenvoi.createChat());
    if (!user.bandChatId) {
      user.bandChatId = chatId;
      await user.save();
    }

    const agentId = process.env.THENVOI_AGENT_ID;
    const agentHandle = process.env.THENVOI_AGENT_HANDLE;
    if (!agentId) return res.status(500).json({ success: false, message: "THENVOI_AGENT_ID belum di-set di server." });

    const mentions = [{ id: agentId }];
    const prefixHandle = agentHandle ? (agentHandle.startsWith("@") ? agentHandle : `@${agentHandle}`) : null;
    const content = prefixHandle && !message.includes(prefixHandle) ? `${prefixHandle} ${message}` : message;

    await thenvoi.sendMessage({ chatId, content, mentions });

    return res.status(201).json({
      success: true,
      roomId: chatId,
      queued: true,
      aiResponse: {
        id: Date.now().toString(),
        text: "Diproses oleh agen...",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengirim pesan." });
  }
};

module.exports = {
  getHistory,
  getSessions,
  ensureSession,
  getRoom,
  sendMessage,
};
