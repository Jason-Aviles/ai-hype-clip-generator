// API Calls
import axios from "axios";

export const fetchClips = () => axios.get("http://localhost:5000/api/clips");
export const fetchSpikes = () => axios.get("http://localhost:5000/api/spikes");
export const fetchStats = () => axios.get("http://localhost:5000/api/stats");
export const checkSession = () =>
  axios.get("http://localhost:5000/check-session", { withCredentials: true });

export const stopMonitoringAPI = () =>
  axios.get("http://localhost:5000/stop-monitoring", { withCredentials: true });
