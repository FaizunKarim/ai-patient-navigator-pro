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

// Fungsi ini bertugas mengecek "Paspor/Token" sebelum user masuk ke endpoint rahasia
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token_disini>"

    if (!token) {
        return res.status(401).json({ success: false, message: "Akses ditolak. Paspor digital tidak ditemukan." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Sesi telah berakhir atau token tidak valid." });
        
        // Simpan data ID user yang asli dari token ke dalam request
        req.user = user; 
        next(); // Persilakan masuk
    });
};

app.get("/", (req, res) => {
    res.json({ message: "🏥 AI Patient Navigator API Running Perfectly" });
});

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Cek kekosongan
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Semua kolom wajib diisi!" });
        }

        // 2. ATURAN PASSWORD (Min 8 karakter, ada huruf & angka)
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (password.length < 8 || !hasLetter || !hasNumber) {
            return res.status(400).json({ 
                success: false, 
                message: "Pendaftaran gagal: Password minimal 8 karakter dan wajib mengandung huruf serta angka!" 
            });
        }

        // 3. Cek Email apakah sudah dipakai
        const userExists = await User.findOne({ email }).lean();
        if (userExists) {
            return res.status(400).json({ success: false, message: "Email ini sudah terdaftar di sistem kami!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({ name, email, password: hashedPassword });
        res.status(201).json({ success: true, message: "User berhasil didaftarkan!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Terjadi kesalahan internal server." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // 4. Cek Login (Salah Email atau Salah Password akan memunculkan error ini)
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ success: false, message: "Email atau Password yang Anda ketikkan salah!" });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Terjadi kesalahan internal server." });
    }
});

//Tarik Riwayat Chat khusus untuk user yang sedang login
app.get("/api/chat/history", authenticateToken, async (req, res) => {
    try {
        // HANYA ambil data milik user yang sedang login (req.user.userId)
        const history = await ChatHistory.find({ userId: req.user.userId })
                                         .sort({ createdAt: 1 }) // Urutkan dari terlama ke terbaru
                                         .lean(); // Efisiensi pembacaan data massal
        
        res.status(200).json({ success: true, count: history.length, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: "Gagal mengambil riwayat chat." });
    }
});

//Simpan pesan baru ke database
app.post("/api/chat/send", authenticateToken, async (req, res) => {
    try {
        const { roomId, sender, message } = req.body;

        if (!message || !sender) {
            return res.status(400).json({ success: false, message: "Format pesan tidak lengkap." });
        }

        const chat = await ChatHistory.create({
            userId: req.user.userId, // Anti-Spoofing: ID diambil dari sistem Token yang tak bisa dipalsukan, bukan dari ketikan user
            roomId: roomId || "default-room",
            sender: sender,
            message: message
        });

        res.status(201).json({ success: true, data: chat });
    } catch (error) {
        res.status(500).json({ success: false, error: "Gagal menyimpan pesan ke database." });
    }
});


// (Jaring Pengaman URL)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Jalur endpoint ${req.originalUrl} tidak ditemukan di server ini.` });
});

app.listen(PORT, () => {
    console.log(`🚀 Chat-Health Server running professionally on port ${PORT}`);
});