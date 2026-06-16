import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { clearSession } from "../utils/auth";
import SidebarHistory from '../components/SidebarHistory';
import ChatBubble from '../components/ChatBubble';
import { LogOut, Menu, X, Paperclip, Camera, Mic, Square, Headphones, Keyboard } from "lucide-react";
import axios from 'axios';
import { getToken } from "../utils/auth";

const MainChat = () => {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const fileInputRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);

  // State audioLevel sudah tidak dipakai lagi karena kita pakai Canvas, tapi saya biarkan agar aman.
  const [audioLevel, setAudioLevel] = useState(1);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const liveStreamRef = useRef(null);

  // ---> PERUBAHAN 1: Tambahkan ref untuk Canvas Visualizer
  const canvasRef = useRef(null);
  // --------------------------------------------------------

  const chatEndRef = useRef(null);
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get('/api/chat/history');
      if (response.data?.success) setHistoryList(response.data.data);
    } catch (err) { }
  };

  useEffect(() => {
    fetchChatHistory();
    handleNewChat();
  }, []);

  const handleSelectRoom = async (roomId) => {
    if (String(roomId).includes("LOCAL")) {
      const localRoom = historyList.find(room => room.roomId === roomId);
      if (localRoom) {
        setMessages(localRoom.chatData || []);
        setActiveRoomId(roomId);
        setIsSidebarOpen(false);
      }
      return;
    }
    setLoading(true);
    setActiveRoomId(roomId);
    setIsSidebarOpen(false);
    try {
      const response = await axios.get(`/api/chat/room/${roomId}`);
      if (response.data?.success) setMessages(response.data.messages);
    } catch (err) { } finally { setLoading(false); }
  };

  const handleNewChat = () => {
    if (messages.length > 1 && !activeRoomId) {
      const firstUserMsg = messages.find(msg => !msg.isAi);
      const sessionTitle = firstUserMsg ? firstUserMsg.text : "Sesi Konsultasi Medis";
      setHistoryList(prev => [{ roomId: `LOCAL-${Date.now()}`, title: sessionTitle, chatData: messages }, ...prev]);
    }
    setActiveRoomId(null);
    setMessages([{ id: "default", text: "Halo Bos! Silakan konsultasikan keluhan Anda, kirim foto resep, video gejala, atau langsung gunakan pesan suara.", isAi: true }]);
    setIsSidebarOpen(false);
    cancelMedia();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Kamera tidak ditemukan atau izin ditolak!");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `live-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelectedMedia(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setMediaType('image');
      closeCamera();
    }, "image/jpeg");
  };

  const closeCamera = () => {
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedMedia(file);
        setPreviewUrl(URL.createObjectURL(blob));
        setMediaType('audio');
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) { alert("Gagal mengakses mikrofon!"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const cancelMedia = () => {
    setSelectedMedia(null); setPreviewUrl(null); setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---> PERUBAHAN 2: Fungsi startLiveVoice diubah untuk membaca data ke Canvas
  const startLiveVoice = async () => {
    setIsLiveVoiceMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 128;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = 70;

        ctx.beginPath();
        const innerGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, baseRadius);
        innerGradient.addColorStop(0, '#ff7eb3');
        innerGradient.addColorStop(0.5, '#8b5cf6');
        innerGradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = innerGradient;
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let i = 0; i < bufferLength; i++) {
          const amplitude = dataArray[i] / 255;
          const barHeight = amplitude * 50;

          const angle = (i / bufferLength) * Math.PI * 2;

          const xStart = centerX + Math.cos(angle) * baseRadius;
          const yStart = centerY + Math.sin(angle) * baseRadius;
          const xEnd = centerX + Math.cos(angle) * (baseRadius + barHeight);
          const yEnd = centerY + Math.sin(angle) * (baseRadius + barHeight);

          const lineGradient = ctx.createLinearGradient(xStart, yStart, xEnd, yEnd);
          lineGradient.addColorStop(0, '#8b5cf6');
          lineGradient.addColorStop(1, '#ff7eb3');

          ctx.strokeStyle = lineGradient;
          ctx.beginPath();
          ctx.moveTo(xStart, yStart);
          ctx.lineTo(xEnd, yEnd);
          ctx.stroke();
        }

        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      setTimeout(() => renderFrame(), 50);

    } catch (err) {
      alert("Izin mikrofon diperlukan!");
      setIsLiveVoiceMode(false);
    }
  };
  // --------------------------------------------------------

  const stopLiveVoice = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (liveStreamRef.current) liveStreamRef.current.getTracks().forEach(t => t.stop());
    setIsLiveVoiceMode(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedMedia) return;

    const tempId = Date.now().toString();
    const userMessage = { id: tempId, text: inputText, isAi: false, mediaUrl: previewUrl, mediaType };
    setMessages((prev) => [...prev, userMessage]);

    const textToSend = inputText;
    const mediaToSend = selectedMedia;

    setInputText(""); cancelMedia();

    try {
      const payload = {
        roomId: activeRoomId,
        message: textToSend
      };

      const token = getToken();

      const response = await axios.post(
        '/api/chat/send',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (response.data?.success) {
        if (!activeRoomId && response.data.roomId) setActiveRoomId(response.data.roomId);
        const aiMessage = { id: response.data.aiResponse.id || Date.now().toString(), text: response.data.aiResponse.text, isAi: true };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: Date.now().toString(), text: `[Offline Mode] Pesan aman tersimpan lokal.`, isAi: true }]);
      }, 1000);
    }
  };

  return (
    <div className="relative flex w-full h-screen overflow-hidden bg-[#F8FAFC] font-sans antialiased">

      {/* MODAL KAMERA LIVE */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto bg-black transform scale-x-[-1]" />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
              <button onClick={closeCamera} className="bg-slate-700/80 hover:bg-slate-600 text-white p-4 rounded-full"><X className="w-6 h-6" /></button>
              <button onClick={capturePhoto} className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]"><Camera className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      )}

      {/* UI LIVE VOICE CHAT (ORB) */}
      {isLiveVoiceMode ? (
        <div className="absolute inset-0 z-50 bg-[#09090B] flex flex-col items-center justify-between py-12 px-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="bg-[#18181B] border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="text-sm font-semibold text-white tracking-wide">AI Navigator</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">Listening</span>
            </div>
          </div>

          {/* ---> PERUBAHAN 3: Element div Orb diganti menjadi element Canvas <--- */}
          <div className="relative flex items-center justify-center w-full max-w-sm flex-1">
            <canvas
              ref={canvasRef}
              width={350}
              height={350}
              className="filter drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            />
          </div>
          {/* -------------------------------------------------------- */}

          <div className="text-center w-full mb-12">
            <p className="text-slate-300 text-lg font-medium tracking-wide">What are your symptoms today?</p>
          </div>

          <div className="flex items-center gap-8 mb-8">
            <button onClick={stopLiveVoice} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md"><Keyboard className="w-6 h-6" /></button>
            <button className="relative p-6 bg-[#A3E635] hover:bg-[#84cc16] text-slate-900 rounded-full transition-all shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:scale-105 group">
              <Mic className="w-8 h-8" />
              <div className="absolute inset-0 border-2 border-[#A3E635] rounded-full animate-ping opacity-50"></div>
            </button>
            <button onClick={stopLiveVoice} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md"><X className="w-6 h-6" /></button>
          </div>
        </div>
      ) : null}

      {/* SIDEBAR */}
      <div className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-20 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`absolute left-0 top-0 h-full w-72 bg-slate-50 border-r border-slate-200/60 z-30 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute top-6 right-4 lg:hidden"><button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto w-72">
          <SidebarHistory historyList={historyList} onNewChat={handleNewChat} onSelectRoom={handleSelectRoom} activeRoomId={activeRoomId} />
        </div>
        <div className="p-5 border-t w-72">
          <button onClick={() => { clearSession(); navigate("/"); }} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl font-semibold"><LogOut className="w-4 h-4" /> Keluar</button>
        </div>
      </div>

      {/* AREA CHAT UTAMA */}
      <div className="flex-1 h-screen flex flex-col w-full relative z-10">
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-indigo-50 rounded-xl"><Menu className="w-6 h-6" /></button>
            <div>
              <h2 className="font-bold text-slate-800 text-base">AI Navigator</h2>
              <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Sesi Aman</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#F4F7FE] scroll-smooth">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg.text} isAi={msg.isAi} mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} />
          ))}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 bg-white border-t flex flex-col items-center">
          {previewUrl && (
            <div className="max-w-4xl w-full mx-auto mb-3">
              <div className="relative inline-block">
                {mediaType === 'image' && <img src={previewUrl} className="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-indigo-100" />}
                {mediaType === 'video' && <video src={previewUrl} className="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-indigo-100 bg-black" />}
                {mediaType === 'audio' && (
                  <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100">
                    <Mic className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-semibold">Pesan Suara Terekam</span>
                  </div>
                )}
                <button onClick={cancelMedia} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto w-full flex gap-3 items-center">
            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-in fade-in">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-semibold tracking-wide">Merekam Suara...</span>
                </div>
                <button type="button" onClick={stopRecording} className="flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold shadow-md hover:bg-red-700 active:scale-95">
                  <Square className="w-4 h-4 fill-current" /> Hentikan
                </button>
              </div>
            ) : (
              // ---> PERUBAHAN 4: Kolom chat interaktif dengan hover abu-abu <---
              <div className="flex-1 flex items-center bg-[#F8FAFC] hover:bg-slate-200 transition-colors duration-200 border rounded-2xl focus-within:ring-2 focus-within:ring-indigo-600/20 p-1">
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl"><Paperclip className="w-5 h-5" /></button>
                <button type="button" onClick={openCamera} className="p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl"><Camera className="w-5 h-5" /></button>

                <input
                  type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik pesan atau masuk mode suara..."
                  className="w-full px-2 py-2 bg-transparent text-sm font-medium focus:outline-none"
                />

                <button
                  type="button"
                  onClick={startLiveVoice}
                  disabled={inputText.length > 0 || selectedMedia}
                  className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all shadow-sm disabled:opacity-0 disabled:pointer-events-none"
                  title="Masuk Mode Live Voice"
                >
                  <Headphones className="w-5 h-5" />
                </button>
              </div>
              // --------------------------------------------------------
            )}

            {/* ---> PERUBAHAN 5: Tombol Kirim dengan warna Solid/Cerah saat di Hover <--- */}
            <button
              type="submit"
              disabled={(!inputText && !selectedMedia) || isRecording}
              className="bg-indigo-400 hover:bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-md hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] disabled:opacity-40 disabled:shadow-none transition-all duration-300 ease-out active:scale-95 transform"
            >
              Kirim
            </button>
            {/* -------------------------------------------------------- */}
          </form>
        </footer>
      </div>
    </div>
  );
};

export default MainChat;