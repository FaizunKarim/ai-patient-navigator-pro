import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import MainChat from "./pages/MainChat";
import { isAuthenticated } from "./utils/auth";

// Komponen Pelindung (Guard) untuk rute yang wajib login
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Jika tidak ada token, tendang kembali ke halaman Auth
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Rute Halaman Login/Register */}
      <Route
        path="/"
        element={
          isAuthenticated() ? <Navigate to="/chat" replace /> : <Auth />
        }
      />

      {/* Rute Halaman Utama Chat (Dilindungi) */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <MainChat />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;