import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import MainChat from "./pages/MainChat";
import { isAuthenticated } from "./utils/auth";

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated() ? <Navigate to="/chat" replace /> : <Auth />
        }
      />

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