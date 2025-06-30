const express = require("express");
const axios = require("axios");
const router = express.Router();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.TWITCH_CALLBACK_URL;
const FRONTEND_REDIRECT = "http://localhost:3000/auth/twitch/callback"; // Optional: frontend app route

console.log("CLIENT_ID:", CLIENT_ID);
console.log("CLIENT_SECRET:", CLIENT_SECRET);
console.log("REDIRECT_URI:", REDIRECT_URI);

router.get("/login", (req, res) => {
  const scope = "user:read:email chat:read chat:edit";
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&force_verify=true`;
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("CODE:", code);
  try {
    const response = await axios.post(
      "https://id.twitch.tv/oauth2/token",
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        },
      }
    );

    const { access_token } = response.data;

    // Fetch user info
    const userResponse = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Client-ID": CLIENT_ID,
      },
    });

    req.session.access_token = access_token;
    req.session.user = userResponse.data.data[0];

    // Optional: Send to frontend React dashboard instead of server dashboard
    res.redirect(FRONTEND_REDIRECT); // e.g. http://localhost:3000/auth/twitch/callback
  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.status(500).send("OAuth failed");
  }
});

module.exports = router;
