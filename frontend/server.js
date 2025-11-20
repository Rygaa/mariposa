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
   STATIC ASSETS (JS, CSS, IMAGES)
   Cache assets but NEVER cache index.html
---------------------------------------------------------------- */
app.use(
  express.static(path.join(__dirname, "dist"), {
    maxAge: "7d", // cache static assets for 7 days
    etag: true,
    lastModified: true,

    setHeaders: (res, filePath) => {
      // NEVER cache HTML files
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }

      // Proper MIME types for images
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filePath.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      }
    },
  })
);

/* -------------------------------------------------------------
   SPA ROUTING:
   Always return index.html for routes that do not map to files
---------------------------------------------------------------- */
app.get("*", (req, res, next) => {
  // Skip asset requests
  if (
    req.path.match(
      /\.(jpg|jpeg|png|gif|svg|ico|js|css|json|woff|woff2|ttf|eot|map)$/
    )
  ) {
    return next();
  }

  // No caching for HTML
  res.setHeader("Cache-Control", "no-store");

  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/* -------------------------------------------------------------
   START SERVER
---------------------------------------------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📍 Server accessible at http://0.0.0.0:${PORT}`);
});
