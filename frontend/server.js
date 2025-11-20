import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;

/* -------------------------------------------------------------
   GLOBAL NO-CACHE FOR ALL REQUESTS
   This ensures the browser NEVER caches anything.
------------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

/* -------------------------------------------------------------
   SERVE STATIC FILES (dist/)
   Still uses no-cache headers applied above.
------------------------------------------------------------- */
app.use(
  express.static(path.join(__dirname, "dist"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      // Force correct MIME types
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filePath.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      }
    }
  })
);

/* -------------------------------------------------------------
   SPA ROUTING:
   Always return index.html for non-file routes
   Also fully no-cache due to global middleware.
------------------------------------------------------------- */
app.get("*", (req, res, next) => {
  if (
    req.path.match(
      /\.(jpg|jpeg|png|gif|svg|ico|js|css|json|woff|woff2|ttf|eot|map)$/
    )
  ) {
    return next();
  }

  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/* -------------------------------------------------------------
   START SERVER
------------------------------------------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📍 Server accessible at http://0.0.0.0:${PORT}`);
});
