import { useState } from "react";
import { api } from "../utils/api";

export default function ReAuthModal({ draftMessage, onClose, onResend }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const email = JSON.parse(localStorage.getItem("patient_data") || "{}").email;
      if (!email) {
        setError("Sesi tidak ditemukan. Silakan login ulang.");
        setLoading(false);
        return;
      }

      const res = await api.post("/api/auth/login", { email, password });
      if (res.data?.success && res.data?.token) {
        localStorage.setItem("patient_token", res.data.token);
        if (res.data.user) {
          localStorage.setItem("patient_data", JSON.stringify(res.data.user));
        }
        if (onResend && draftMessage) {
          await onResend(draftMessage);
        }
        onClose();
      } else {
        setError(res.data?.message || "Login gagal.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Sesi Berakhir</h3>
        <p style={styles.text}>
          Sesi login Anda telah habis. Masukkan password untuk melanjutkan
          obrolan. Pesan darurat Anda telah disimpan.
        </p>
        {draftMessage && (
          <div style={styles.draft}>
            <strong>Pesan tersimpan:</strong>
            <p style={styles.draftText}>{draftMessage}</p>
          </div>
        )}
        <form onSubmit={handleReAuth}>
          <input
            type="password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.buttons}>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Memproses..." : "Login Ulang"}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              style={styles.cancelBtn}
            >
              Keluar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: "28px 24px",
    maxWidth: 420,
    width: "90%",
    boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
  },
  title: {
    margin: "0 0 8px",
    fontSize: 20,
    color: "#d32f2f",
  },
  text: {
    margin: "0 0 12px",
    fontSize: 14,
    color: "#555",
    lineHeight: 1.5,
  },
  draft: {
    background: "#fff3e0",
    borderRadius: 8,
    padding: "8px 12px",
    marginBottom: 16,
    fontSize: 13,
  },
  draftText: {
    margin: "4px 0 0",
    fontStyle: "italic",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  error: {
    color: "#d32f2f",
    fontSize: 13,
    margin: "4px 0",
  },
  buttons: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  submitBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "10px 16px",
    background: "#f5f5f5",
    color: "#555",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
};