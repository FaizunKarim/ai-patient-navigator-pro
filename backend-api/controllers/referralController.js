const User = require("../models/User");

const submitReferral = async (req, res) => {
  try {
    const { facilityName, distance, roomId } = req.body;
    if (!facilityName) {
      return res.status(400).json({ success: false, message: "Nama fasilitas wajib diisi." });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

    // Simpan referral ke database (dalam production ini akan mengirim notifikasi ke faskes)
    // Untuk sekarang, simpan di user document atau collection terpisah
    const referral = {
      userId: req.user.userId,
      userName: user.name,
      userEmail: user.email,
      facilityName,
      distance,
      roomId: roomId || null,
      referredAt: new Date().toISOString(),
    };

    // Log referral (dapat dikembangkan dengan model sendiri)
    console.log("📋 REFERRAL:", JSON.stringify(referral, null, 2));

    return res.status(201).json({
      success: true,
      message: `Anda telah dirujuk ke ${facilityName}. Silakan menuju ke fasilitas tersebut.`,
      data: referral,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memproses rujukan." });
  }
};

const getReferrals = async (req, res) => {
  try {
    // Untuk demo, kembalikan data dari memori
    // Dalam production, baca dari database
    return res.status(200).json({
      success: true,
      message: "Fitur dashboard klinik akan segera tersedia.",
      data: [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil data rujukan." });
  }
};

module.exports = { submitReferral, getReferrals };