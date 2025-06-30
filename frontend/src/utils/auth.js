// src/utils/auth.js

export async function checkSession() {
  try {
    const res = await fetch("http://localhost:5000/check-session", {
      credentials: "include",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Session check failed", err);
    return null;
  }
}
