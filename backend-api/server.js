const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");
connectDB();

const apiRouter = require("./routes/api");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.json({ message: "🏥 AI Patient Navigator API Running Perfectly" });
});

app.use("/api", apiRouter);

// (Jaring Pengaman URL)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Jalur endpoint ${req.originalUrl} tidak ditemukan di server ini.` });
});

app.listen(PORT, () => {
    console.log(`🚀 Chat-Health Server running professionally on port ${PORT}`);
});
