import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const JWT_SECRET = process.env.JWT_SECRET || "osgb-secure-super-secret-key!2024";
const DATA_FILE = path.join(process.cwd(), "global_data.json");

// Default password from environment or fallback
const DEFAULT_PASSWORD = process.env.APP_PASSWORD || "123456";

// Define initial data state
const defaultData = {
  referrals: [],
  companies: [],
  exams: [],
  institutions: [],
  transactions: [],
  appSettings: { 
    ekgLimitAge: 40, 
    autoPrintReferral: true 
  }
};

// Initialize file if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  // Generate hash for default password
  defaultData.appSettings.passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf8");
}

function readData() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, "utf8");
    const db = JSON.parse(rawData);
    
    // Migration: If plain-text password exists, convert to hash and delete plain text
    if (db.appSettings?.password) {
      db.appSettings.passwordHash = bcrypt.hashSync(db.appSettings.password, 10);
      delete db.appSettings.password;
      writeData(db);
    }
    
    // Ensure there is at least a password hash
    if (!db.appSettings?.passwordHash) {
      db.appSettings.passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
      writeData(db);
    }
    
    return db;
  } catch (err) {
    console.error("Error reading data:", err);
    return defaultData;
  }
}

function writeData(data: any) {
  try {
    // Basic write lock can be implemented here if needed, but keeping it synchronous
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing data:", err);
  }
}

function getAppPasswordHash() {
  const db = readData();
  return db.appSettings?.passwordHash || bcrypt.hashSync(DEFAULT_PASSWORD, 10);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Generic Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite development convenience
  }));
  app.use(cors());
  app.use(express.json({ limit: "10mb" })); // Prevent large payload attacks

  // Rate Limiting for Login (Brute Force Protection)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { error: "Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin." }
  });

  // JWT Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch (error) {
      return res.status(401).json({ error: "Oturum süresi doldu veya geçersiz token." });
    }
  };

  // Login endpoint
  app.post("/api/auth/login", loginLimiter, (req, res) => {
    const { password } = req.body;
    const currentHash = getAppPasswordHash();
    
    if (bcrypt.compareSync(password, currentHash)) {
      // Generate secure 12-hour token
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: "Yanlış Şifre" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const currentHash = getAppPasswordHash();
    
    if (!bcrypt.compareSync(oldPassword, currentHash)) {
      return res.status(400).json({ error: "Eski şifre yanlış" });
    }
    
    if (newPassword.length < 6) {
       return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalıdır." });
    }

    const db = readData();
    if (!db.appSettings) db.appSettings = {};
    
    // Hash new password and cleanup olds
    db.appSettings.passwordHash = bcrypt.hashSync(newPassword, 10);
    delete db.appSettings.password;
    
    writeData(db);
    
    // Issue a fresh token
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  });

  // Backup restore endpoint
  app.post("/api/backup/restore", authMiddleware, (req, res) => {
    try {
      const newData = req.body;
      if (!newData || typeof newData !== 'object') {
         return res.status(400).json({ error: "Geçersiz yedek dosyası" });
      }
      
      // Preserve current password hash to avoid locking out the user
      const currentDb = readData();
      newData.appSettings = newData.appSettings || {};
      newData.appSettings.passwordHash = currentDb.appSettings?.passwordHash;
      
      writeData(newData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Geri yükleme sırasında hata oluştu" });
    }
  });

  // Data endpoints
  app.get("/api/data", authMiddleware, (req, res) => {
    res.json(readData());
  });

  app.post("/api/data/:collection/:action", authMiddleware, (req, res) => {
    const { collection, action } = req.params;
    const item = req.body;
    
    const db = readData();
    if (!db[collection] && collection !== 'appSettings') {
      return res.status(400).json({ error: "Invalid collection" });
    }

    if (collection === 'appSettings') {
      if (action === 'save') {
        db.appSettings = { ...db.appSettings, ...item };
        writeData(db);
      }
      return res.json({ success: true });
    }

    if (action === 'save') {
      const idx = db[collection].findIndex((x: any) => x.id === item.id);
      if (idx >= 0) {
        db[collection][idx] = { ...db[collection][idx], ...item };
      } else {
        db[collection].push(item);
      }
    } else if (action === 'delete') {
      db[collection] = db[collection].filter((x: any) => x.id !== item.id);
    }
    
    writeData(db);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // @ts-ignore
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
