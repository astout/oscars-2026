import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "./auth/AuthContext.js";
import Home from "./pages/Home.js";
import Auth from "./pages/Auth.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
