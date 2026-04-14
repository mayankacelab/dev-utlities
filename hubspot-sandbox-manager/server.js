const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 8080;
const HUBSPOT_BASE = "https://api.hubapi.com";

app.use(express.json());

// Serve index.html
app.use(express.static(path.join(__dirname)));

// Proxy all /api/hubspot/* requests to HubSpot
app.all("/api/hubspot/*", async (req, res) => {
  const hspath = req.path.replace("/api/hubspot", "");
  const url = `${HUBSPOT_BASE}${hspath}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: req.headers.authorization || "",
        "Content-Type": "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const text = await response.text();
    res.status(response.status).set("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
