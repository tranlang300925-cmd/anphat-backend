const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ====== ADMIN KEY (bảo vệ API) ======
// ✅ NÊN đặt ADMIN_KEY trên Render (Environment Variables) thay vì hard-code.
const ADMIN_KEY = process.env.ADMIN_KEY || "anphat123";

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Đường dẫn file lưu dữ liệu
// ⚠️ Trên Render, filesystem có thể reset sau khi restart/deploy.
// Nếu muốn lưu bền vững, hãy gắn Render Disk và set DATA_DIR trỏ tới thư mục disk.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, "quotes.json");

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
app.post("/api/quotes", async (req, res) => {
  try {
    const { fullname, phone, email, message } = req.body;

    const quotes = readQuotes();
    const item = {
      id: Date.now(),
      fullname,
      phone,
      email,
      message,
      createdAt: new Date().toISOString(),
    };

    quotes.unshift(item);
    writeQuotes(quotes);

    // ✅ GỬI MAIL (Render/Production cũng gửi được nếu cấu hình đúng ENV)
    // Nếu thiếu EMAIL_USER / EMAIL_PASS / ADMIN_EMAIL thì chỉ lưu dữ liệu, không gửi mail.
    const canSendMail = !!(
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.ADMIN_EMAIL
    );

    if (canSendMail) {
      try {
        await transporter.sendMail({
          from: `"An Phát" <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL,
          subject: "📩 Yêu cầu báo giá mới",
          html: `
            <h3>Khách hàng mới</h3>
            <p><b>Họ tên:</b> ${fullname}</p>
            <p><b>SĐT:</b> ${phone}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Nội dung:</b> ${message}</p>
          `,
        });
        console.log("✅ Sent mail ok");
      } catch (mailErr) {
        console.log("❌ Send mail failed:", mailErr);
      }
    } else {
      console.log(
        "⚠️ Skip sending mail (missing EMAIL_USER/EMAIL_PASS/ADMIN_EMAIL)"
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.log("❌ POST /api/quotes failed:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Chạy server
const PORT = process.env.PORT || 3001;
console.log("SERVER VERSION: 2026-01-09 v2");
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
