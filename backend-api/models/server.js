const express = require("express");
const cors = require("cors");

require("../db");
const ChatHistory = require("./ChatHistory");


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "AI Patient Navigator API Running"
    });
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

        res.status(201).json({
            success: true,
            data: chat
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

console.log("CHAT ROUTE LOADED");

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});