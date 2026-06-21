const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const app = express();
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "site-data.json");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const defaults = {
  bookings: [],
  gallery: [],
  settings: {
    restaurantName: "Spice Haven",
    facebookUrl: "#",
    instagramUrl: "#",
    twitterUrl: "#",
    googleMapsEmbed: "",
    openingHours: "Mon-Sun: 12:00 PM - 10:30 PM"
  },
  images: {
    heroImage1: "images/hero.webp",
    heroImage1Secondary: "images/about-1.webp",
    heroImage2: "images/gallery-10.webp",
    heroImage2Secondary: "images/gallery-13.webp",
    aboutImage1: "images/about-1.webp",
    aboutImage2: "images/about-2.webp",
    reservationImage: "images/gallery-16.jpg",
    menuHeaderImage: "images/gallery-13.webp",
    galleryHeaderImage: "images/gallery-8.webp",
    contactHeaderImage: "images/about-2.webp"
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(defaults, null, 2));
}

function readStore() {
  try {
    ensureStore();
    return { ...clone(defaults), ...JSON.parse(fs.readFileSync(dataFile, "utf8")) };
  } catch (error) {
    return clone(defaults);
  }
}

function writeStore(next) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(next, null, 2));
}

function publicData() {
  const store = readStore();
  return { settings: store.settings, images: store.images, gallery: store.gallery };
}

function normalizeMap(input) {
  const value = String(input || "").trim();
  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1] : value;
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Admin login required" });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  name: "spicehaven.sid",
  secret: process.env.SESSION_SECRET || "local-development-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(rootDir, { extensions: ["html"] }));

app.get("/api/settings", (req, res) => res.json(publicData()));

app.post("/api/bookings", (req, res) => {
  const { name, phone, email, date, time, guests, message } = req.body;
  if (!name || !phone || !date || !time || !guests) return res.status(400).json({ error: "Name, phone, date, time, and guests are required" });
  const store = readStore();
  const booking = { id: Date.now().toString(36), name, phone, email: email || "", date, time, guests, message: message || "", status: "new", createdAt: new Date().toISOString() };
  store.bookings.unshift(booking);
  writeStore(store);
  res.status(201).json({ ok: true, booking });
});

app.post("/api/admin/login", (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "password";
  if (req.body.username === adminUser && req.body.password === adminPass) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/admin/me", (req, res) => res.json({ authenticated: Boolean(req.session && req.session.isAdmin) }));
app.get("/api/admin/dashboard", requireAdmin, (req, res) => res.json(readStore()));

app.patch("/api/admin/bookings/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const booking = store.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  booking.status = req.body.status || booking.status;
  writeStore(store);
  res.json({ ok: true, booking });
});

app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const store = readStore();
  store.settings = { ...store.settings, ...req.body, googleMapsEmbed: normalizeMap(req.body.googleMapsEmbed) };
  writeStore(store);
  res.json({ ok: true, settings: store.settings });
});

app.put("/api/admin/images", requireAdmin, (req, res) => {
  const store = readStore();
  store.images = { ...store.images, ...req.body };
  writeStore(store);
  res.json({ ok: true, images: store.images });
});

app.post("/api/admin/gallery", requireAdmin, upload.single("image"), async (req, res) => {
  const type = req.body.type === "menu" ? "menu" : "item";
  const title = req.body.title || (type === "menu" ? "Menu Image" : "Dish Image");
  let imageUrl = req.body.imageUrl;
  if (req.file) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(400).json({ error: "Cloudinary credentials are missing" });
    }
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder: "spiceheaven-template" });
    imageUrl = result.secure_url;
  }
  if (!imageUrl) return res.status(400).json({ error: "Upload an image or paste an image URL" });
  const store = readStore();
  const item = { id: Date.now().toString(36), type, title, imageUrl, createdAt: new Date().toISOString() };
  store.gallery.unshift(item);
  writeStore(store);
  res.status(201).json({ ok: true, item });
});

app.delete("/api/admin/gallery/:id", requireAdmin, (req, res) => {
  const store = readStore();
  store.gallery = store.gallery.filter((item) => item.id !== req.params.id);
  writeStore(store);
  res.json({ ok: true });
});

module.exports = app;
