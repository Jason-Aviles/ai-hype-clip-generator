// src/pages/RedirectHandler.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: check session if needed here
    navigate("/dashboard");
  }, []);

  return <p>Redirecting...</p>;
};

export default RedirectHandler;
