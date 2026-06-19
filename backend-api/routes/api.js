const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const chatController = require("../controllers/chatController");
const referralController = require("../controllers/referralController");

const router = express.Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);

router.get("/chat/history", authenticateToken, chatController.getHistory);
router.get("/chat/sessions", authenticateToken, chatController.getSessions);
router.get("/chat/session", authenticateToken, chatController.ensureSession);
router.get("/chat/room/:roomId", authenticateToken, chatController.getRoom);
router.post("/chat/send", authenticateToken, chatController.sendMessage);

router.post("/referral/submit", authenticateToken, referralController.submitReferral);
router.get("/referral/list", authenticateToken, referralController.getReferrals);

module.exports = router;
