import { createSlice } from "@reduxjs/toolkit";

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    isMonitoring: false,
    progressLog: [],
    clips: [],
    spikes: [],
    user: null,
  },
  reducers: {
    setMonitoring: (state, action) => {
      state.isMonitoring = action.payload;
    },
    stopMonitoring: (state) => {
      state.isMonitoring = false;
    },
    addProgress: (state, action) => {
      state.progressLog.push(action.payload);
    },
    addClip: (state, action) => {
      state.clips.unshift(action.payload);
    },
    addSpike: (state, action) => {
      state.spikes.unshift(action.payload);
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearDashboard: (state) => {
      state.isMonitoring = false;
      state.progressLog = [];
      state.clips = [];
      state.spikes = [];
      state.user = null;
    },
  },
});

export const {
  setMonitoring,
  stopMonitoring,
  addProgress,
  addClip,
  addSpike,
  setUser,
  clearDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

