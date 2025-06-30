import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend
);

export default function StatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/stats").then((res) => {
      setStats(res.data);
    });
  }, []);

  if (!stats) return <div className="p-6 text-center">Loading stats...</div>;

  const barData = {
    labels: Object.keys(stats.spikesPerHour),
    datasets: [
      {
        label: "Spikes Per Hour",
        data: Object.values(stats.spikesPerHour),
        backgroundColor: "#6366F1",
      },
    ],
  };

  const pieData = {
    labels: Object.keys(stats.topEmotions),
    datasets: [
      {
        label: "Top Emotions",
        data: Object.values(stats.topEmotions),
        backgroundColor: [
          "#F59E0B",
          "#EF4444",
          "#10B981",
          "#3B82F6",
          "#8B5CF6",
        ],
      },
    ],
  };

  const lineData = {
    labels: Object.keys(stats.clipsPerDay),
    datasets: [
      {
        label: "Clips Per Day",
        data: Object.values(stats.clipsPerDay),
        borderColor: "#8B5CF6",
        fill: false,
      },
    ],
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-center text-purple-700">
        📊 Hype Clip Analytics
      </h1>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Spikes Per Hour</h2>
        <Bar data={barData} />
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Top Emotions</h2>
        <Pie data={pieData} />
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Clips Per Day</h2>
        <Line data={lineData} />
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Top Channels</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {stats.topChannels.map((c, i) => (
            <li key={i}>
              {c.channel} - {c.count} spikes
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
