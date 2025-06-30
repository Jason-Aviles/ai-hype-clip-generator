import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StatsPage from "./pages/StatsPage";
import RedirectHandler from "./pages/RedirectHandler";
import { checkSession } from "./utils/auth";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkSession().then((res) => {
      setAuthorized(!!res?.user);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Checking session...</p>;

  return authorized ? children : <Navigate to="/" />;
}

function App() {
  return (
    <>
      <nav className="bg-gray-800 text-white px-4 py-2 flex gap-6">
        <a href="/dashboard" className="hover:text-purple-400">
          Dashboard
        </a>
        <a href="/stats" className="hover:text-purple-400">
          Stats
        </a>
      </nav>

      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/twitch/callback" element={<RedirectHandler />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
