const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const connectDB = require("./db");
connectDB();

// Panggil Model
const User = require("./models/User");
const ChatHistory = require("./models/ChatHistory");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY_HACKATHON";

app.get("/", (req, res) => {
    res.json({ message: "AI Patient Navigator API Running Perfectly" });
});


app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Cek apakah email sudah terdaftar
        let userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Simpan User Baru
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "User berhasil didaftarkan!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Cari user berdasarkan email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Email atau password salah!" });
        }

        // Validasi kecocokan password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Email atau password salah!" });
        }

        // Buat Token JWT yang berlaku selama 7 Hari
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


app.post("/chat", async (req, res) => {
    try {
        const chat = new ChatHistory({
            userId: req.body.userId,
            roomId: req.body.roomId,
            sender: req.body.sender,
            message: req.body.message
        });
        await chat.save();
        res.status(201).json({ success: true, data: chat });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running professionally on port ${PORT}`);
});