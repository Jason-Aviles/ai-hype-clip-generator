const express = require("express");
const axios = require("axios");
const router = express.Router();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.TWITCH_CALLBACK_URL;
console.log("CLIENT_ID:", CLIENT_ID);
console.log("CLIENT_SECRET:", CLIENT_SECRET);
console.log("REDIRECT_URI:", REDIRECT_URI);

router.get("/login", (req, res) => {
  const scope = "user:read:email chat:read chat:edit";
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("CODE:", req.query.code);
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

    // Get user info
    const userResponse = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Client-ID": CLIENT_ID,
      },
    });

    // 👇 Store this token in session for now
    req.session.access_token = access_token;
    req.session.user = userResponse.data.data[0];
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth failed");
  }
});

module.exports = router;
