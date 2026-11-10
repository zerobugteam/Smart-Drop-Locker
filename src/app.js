const path = require("path");
const express = require("express");
const webRoutes = require("./routes/web");
const apiRoutes = require("./routes/api");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api", apiRoutes);
app.use("/", webRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ ok: false, message: err.message || "Internal Server Error" });
  }
  return res.status(500).send(`<pre>Terjadi kesalahan server:\n${err.message}</pre>`);
});

module.exports = app;

