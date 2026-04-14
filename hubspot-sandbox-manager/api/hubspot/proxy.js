const https = require("https");

module.exports = async (req, res) => {
  // Reconstruct the HubSpot path from the original URL
  const path = req.url.replace(/^\/api\/hubspot/, "") || "/";
  const url = `https://api.hubapi.com${path}`;

  const options = {
    method: req.method,
    headers: {
      Authorization: req.headers.authorization || "",
      "Content-Type": "application/json",
    },
  };

  const body = await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });

  const hsReq = https.request(url, options, (hsRes) => {
    res.status(hsRes.statusCode);
    res.setHeader("Content-Type", "application/json");
    hsRes.pipe(res);
  });

  hsReq.on("error", (err) => res.status(500).json({ message: err.message }));
  if (body) hsReq.write(body);
  hsReq.end();
};
