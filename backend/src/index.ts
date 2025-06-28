require("dotenv").config();
const express = require("express");
const session = require("cookie-session");
const app = express();

app.use(
  session({
    name: "session",
    keys: ["secret1", "secret2"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

app.use("/auth/twitch", require("./auth/twitch"));

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/twitch/login");
  res.send(`Welcome ${req.session.user.display_name}`);
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on http://localhost:5000");
});
