// src/pages/LoginPage.jsx
import React from "react";

const LoginPage = () => {
  const loginWithTwitch = () => {
    window.location.href = "http://localhost:5000/auth/twitch/login";
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">
          🎥 AI Hype Clip Generator
        </h1>
        <p className="text-gray-600">
          Login with Twitch to start capturing hype moments
        </p>
        <button
          onClick={loginWithTwitch}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded shadow transition duration-200"
        >
          Login with Twitch
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
