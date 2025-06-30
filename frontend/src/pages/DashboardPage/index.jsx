import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";
import {
  setMonitoring,
  stopMonitoring,
  addClip,
  addSpike,
  addProgress,
  setUser,
  clearDashboard,
} from "../../store/dashboardSlice";
import { checkSession, stopMonitoringAPI, fetchClips } from "../../store/api";
import axios from "axios";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { Link } from "react-router-dom";

const socket = io("http://localhost:5000");

export default function Dashboard() {
  const dispatch = useDispatch();
  const { isMonitoring, progressLog, clips, spikes, user } = useSelector(
    (state) => state.dashboard
  );
  const [selectedClip, setSelectedClip] = useState(null);
  const [showAudio, setShowAudio] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const clipsPerPage = 5;

  const handleLogout = () => {
    dispatch(clearDashboard());
    window.location.href = "http://localhost:5000/auth/logout";
  };

  useEffect(() => {
    socket.on("clipProgress", ({ status, percent }) => {
      dispatch(addProgress(`${status} (${percent}%)`));
    });

    socket.on("new_clip", (clip) => {
      dispatch(addClip(clip));
    });

    socket.on("new_spike", (spike) => {
      dispatch(addSpike(spike));
    });

    checkSession().then((res) => {
      if (res.data.authenticated) {
        dispatch(setUser(res.data.user));

        fetchClips().then((res) => {
          if (res.data && Array.isArray(res.data)) {
            res.data.forEach((clip) => dispatch(addClip(clip)));
          }
        });
      } else {
        window.location.href = "/login";
      }
    });

    return () => {
      socket.off("clipProgress");
      socket.off("new_clip");
      socket.off("new_spike");
    };
  }, [dispatch]);
// await axios.delete("http://localhost:5000/admin/clear-clips");

  const startMonitoring = async () => {
    try {
     await axios.delete("http://localhost:5000/admin/clear-clips");
      await axios.get("http://localhost:5000/start-monitoring", {
        withCredentials: true,
      });
      dispatch(setMonitoring(true));
      toast.success("✅ Monitoring started");
    } catch (err) {
      toast.error("❌ Failed to start monitoring. Are you logged in?");
    }
  };

  const stopMonitoringHandler = async () => {
    try {
      await stopMonitoringAPI();
      dispatch(stopMonitoring());
      toast.success("🛑 Monitoring stopped");
    } catch (err) {
      toast.error("❌ Failed to stop monitoring.");
    }
  };

  const exportJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, filename);
  };

  const exportCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, filename);
  };

  const deleteClip = (id) => {
    toast("🗑️ Deleting clip from frontend list");
    setSelectedClip(null);
    dispatch(addClip(clips.filter((clip) => clip._id !== id)));
  };

  const filteredClips = clips.filter(
    (clip) =>
      clip.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clip.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedClips = filteredClips.slice(
    page * clipsPerPage,
    page * clipsPerPage + clipsPerPage
  );

  const latestFiveClips = [...clips].slice(-5).reverse();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center text-purple-700">
        🎯 AI Hype Dashboard
      </h1>

      {user && (
        <p className="text-lg text-center text-gray-700">
          Welcome, <strong>{user.display_name}</strong>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        <span className="font-semibold">Status:</span>
        <span className={isMonitoring ? "text-green-600" : "text-red-600"}>
          {isMonitoring ? "🟢 Monitoring" : "🔴 Idle"}
        </span>
        {isMonitoring ? (
          <button
            onClick={stopMonitoringHandler}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
          >
            Stop Monitoring
          </button>
        ) : (
          <button
            onClick={startMonitoring}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            Start Monitoring
          </button>
        )}
        <button
          onClick={handleLogout}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow"
        >
          Logout
        </button>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-2">🔄 Clip Progress</h2>
        <div className="max-h-48 overflow-y-auto bg-gray-100 p-4 rounded shadow">
          {progressLog.map((line, i) => (
            <div key={i} className="text-sm text-gray-800">
              {line}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">🧠 Recent Clips</h2>
          <Link to="/clips" className="text-sm text-blue-600 hover:underline">
            View All Clips →
          </Link>
        </div>
        <ul className="list-disc list-inside space-y-1">
          {latestFiveClips.map((clip, i) => (
            <li key={i} className="text-sm text-gray-700">
              {clip.username} - {clip.emotion} - {clip.transcript?.slice(0, 50)}
              ...
              {clip.filePath && clip.filePath.endsWith(".mp4") && (
                <video
                  src={clip.filePath}
                  controls
                  className="w-full mt-2 rounded shadow"
                />
              )}
              {clip.filePath && clip.filePath.endsWith(".txt") && showAudio && (
                <audio controls className="w-full mt-2" src={clip.filePath} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">🔥 Chat Spikes</h2>
          <div className="space-x-2">
            <button
              onClick={() => exportJSON(spikes, "spikes.json")}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportCSV(spikes, "spikes.csv")}
              className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow"
            >
              Export CSV
            </button>
          </div>
        </div>
        <ul className="list-disc list-inside space-y-1">
          {spikes.map((spike, i) => (
            <li key={i} className="text-sm text-gray-700">
              {spike.channel} - {spike.messageCount} messages
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
