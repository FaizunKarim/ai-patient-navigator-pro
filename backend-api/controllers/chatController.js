const ChatHistory = require("../models/ChatHistory");
const User = require("../models/User");
const { generateChatReply } = require("../services/aiAgentService");

const getUserId = (req) => req.user?.userId || null;
const createRoomId = () => `room-${Date.now()}`;

const getHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Sesi tidak valid." });

    const history = await ChatHistory.find({ userId }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat chat." });
  }
};

const getSessions = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Sesi tidak valid." });

    const docs = await ChatHistory.find({ userId }).sort({ createdAt: 1 }).lean();
    const byRoom = new Map();

    for (const item of docs) {
      const roomId = item.roomId || "default-room";
      if (!byRoom.has(roomId) && item.sender === "user") {
        byRoom.set(roomId, {
          roomId,
          title: item.message?.slice(0, 40) || "Konsultasi Medis",
          insertedAt: item.createdAt || item.timestamp || null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: Array.from(byRoom.values()).reverse(),
      mode: "ai",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar sesi chat." });
  }
};

const ensureSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Sesi tidak valid." });

    const fresh = String(req.query.fresh || "").toLowerCase() === "true";
    if (fresh) return res.status(200).json({ success: true, roomId: createRoomId(), mode: "ai" });

    const latest = await ChatHistory.findOne({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      roomId: latest?.roomId || createRoomId(),
      mode: "ai",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal membuat sesi chat." });
  }
};

const getRoom = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Sesi tidak valid." });

    const { roomId } = req.params;
    const history = await ChatHistory.find({ userId, roomId }).sort({ createdAt: 1 }).lean();
    const messages = history.map((item) => ({
      id: item._id.toString(),
      text: item.message,
      isAi: item.sender !== "user",
      createdAt: item.createdAt || item.timestamp || null,
    }));

    return res.status(200).json({ success: true, messages, mode: "ai" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil chat room." });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Sesi tidak valid." });

    const { roomId, message, lat, lon } = req.body;
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return res.status(400).json({ success: false, message: "Pesan wajib diisi." });

    const roomIdValue = roomId || createRoomId();

    if (lat !== undefined && lon !== undefined) {
      try {
        await User.findByIdAndUpdate(userId, {
          defaultLat: parseFloat(lat),
          defaultLon: parseFloat(lon),
        });
      } catch {
        // GPS update tidak boleh memblokir chat.
      }
    }

    const recentHistory = await ChatHistory.find({ userId, roomId: roomIdValue })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const orderedHistory = recentHistory.reverse();
    const userMessage = await ChatHistory.create({
      userId,
      roomId: roomIdValue,
      sender: "user",
      message: cleanMessage,
    });

    let aiText;
    try {
      aiText = await generateChatReply({ history: orderedHistory, message: cleanMessage, lat, lon });
    } catch (error) {
      await ChatHistory.findByIdAndDelete(userMessage._id).catch(() => {});
      return res.status(502).json({
        success: false,
        message: error.message || "AI agent gagal membalas.",
      });
    }

    const aiMessage = await ChatHistory.create({
      userId,
      roomId: roomIdValue,
      sender: "ai",
      message: aiText,
    });

    return res.status(201).json({
      success: true,
      roomId: roomIdValue,
      mode: "ai",
      aiResponse: {
        id: aiMessage._id.toString(),
        text: aiText,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengirim pesan ke AI agent." });
  }
};

module.exports = {
  getHistory,
  getSessions,
  ensureSession,
  getRoom,
  sendMessage,
};