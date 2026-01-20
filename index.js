const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// FCC middleware
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "urls.json");

// --------------------
// File DB helpers
// --------------------
function readDB() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  // Defensive: ensure urls is an array and only contains valid records
  if (!Array.isArray(raw.urls)) raw.urls = [];
  raw.urls = raw.urls.filter(u => {
    return u && typeof u.original_url === "string" && typeof u.short_url === "number";
  });
  return raw;
}

function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// FCC test endpoint
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

// --------------------
// POST /api/shorturl
// --------------------
app.post("/api/shorturl", (req, res) => {
  const inputUrl = req.body.url;

  let parsedUrl;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    return res.json({ error: "invalid url" });
  }

  // Only allow http or https
  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    return res.json({ error: "invalid url" });
  }

  const db = readDB();

  const record = {
    original_url: parsedUrl.href,
    short_url: db.counter
  };

  db.urls.push(record);
  db.counter++;

  writeDB(db);

  res.json(record);
});

// --------------------
// GET /api/shorturl/:short_url
// --------------------
app.get("/api/shorturl/:shorturl", (req, res) => {
  const short = Number(req.params.shorturl);

  const db = readDB();
  const found = db.urls.find(u => u.short_url === short);

  if (!found) {
    return res.json({ error: "No short URL found for given input" });
  }

  // Validate the stored original_url before redirecting
  if (typeof found.original_url !== "string" || (!found.original_url.startsWith("http://") && !found.original_url.startsWith("https://"))) {
    console.error("Invalid original_url stored for short url", short, found);
    return res.json({ error: "No short URL found for given input" });
  }

  console.log(`Redirecting /api/shorturl/${short} -> ${found.original_url}`);
  return res.redirect(found.original_url);
});

// Listen
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
