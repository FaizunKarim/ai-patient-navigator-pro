const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Semua kolom wajib diisi!" });
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 8 || !hasLetter || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: "Pendaftaran gagal: Password minimal 8 karakter dan wajib mengandung huruf serta angka!",
      });
    }

    const userExists = await User.findOne({ email }).lean();
    if (userExists) {
      return res.status(400).json({ success: false, message: "Email ini sudah terdaftar di sistem kami!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ name, email, password: hashedPassword });
    return res.status(201).json({ success: true, message: "User berhasil didaftarkan!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan internal server." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: "Email atau Password yang Anda ketikkan salah!" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ success: false, message: "Server belum dikonfigurasi dengan benar (JWT_SECRET)." });
    }

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "7d" });

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan internal server." });
  }
};

module.exports = { register, login };
