export const setMonitoring = (status) => ({
  type: "SET_MONITORING",
  payload: status,
});

export const addProgress = (line) => ({
  type: "ADD_PROGRESS",
  payload: line,
});

export const addClip = (clip) => ({
  type: "ADD_CLIP",
  payload: clip,
});

export const addSpike = (spike) => ({
  type: "ADD_SPIKE",
  payload: spike,
});

export const setUser = (user) => ({
  type: "SET_USER",
  payload: user,
});
