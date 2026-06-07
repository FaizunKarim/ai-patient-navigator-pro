import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import MainChat from './pages/MainChat';

function App() {
  // Nanti logika cek token JWT (localStorage) akan kita taruh di sini
  // Untuk sementara, kita anggap user belum login (false) agar bisa mendesain halaman Auth
  const isAuthenticated = false;

  return (
    <Routes>
      {/* Jika ke root (/), cek login. Kalau belum, lempar ke /auth */}
      <Route
        path="/"
        element={isAuthenticated ? <MainChat /> : <Navigate to="/auth" />}
      />

      {/* Halaman Login/Signup */}
      <Route path="/auth" element={<Auth />} />
    </Routes>
  );
}

export default App;