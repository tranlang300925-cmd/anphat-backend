const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Đường dẫn file lưu dữ liệu
const DATA_FILE = path.join(__dirname, "quotes.json");

// Hàm đọc dữ liệu an toàn
function readQuotes() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// Hàm ghi dữ liệu
function writeQuotes(quotes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(quotes, null, 2), "utf-8");
}

// Test nhanh
app.get("/", (req, res) => {
  res.send("Backend An Phát đang chạy 🚀");
});

// 1) Lấy danh sách báo giá
app.get("/api/quotes", requireAdminKey, (req, res) => {
  const quotes = readQuotes();
  res.json(quotes);
});

// 2) Tạo báo giá mới (từ form)
app.post("/api/quotes", (req, res) => {
  const { fullname, phone, email, message } = req.body || {};

  // Validate tối thiểu
  if (!fullname || !phone || !email || !message) {
    return res.status(400).json({ ok: false, error: "Thiếu thông tin!" });
  }

  const quotes = readQuotes();
  const item = {
    id: Date.now(),
    fullname: String(fullname).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  };

  quotes.unshift(item);
  writeQuotes(quotes);

  res.json({ ok: true, item });
});

// Chạy server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
app.use(cors());
app.use(express.json());
// ====== ADMIN KEY (bảo vệ API) ======
const ADMIN_KEY = process.env.ADMIN_KEY || "anphat123"; // đổi mật khẩu ở đây

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}
