import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // YouTube API Proxy
  app.get("/api/youtube/video", async (req, res) => {
    const { videoId } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    if (!apiKey) {
      console.error("YOUTUBE_API_KEY is missing in environment variables");
      return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured on the server." });
    }

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.error) {
        console.error("YouTube API Video Error:", data.error);
        return res.status(data.error.code || 500).json({ error: data.error.message });
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("Server Proxy Video Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/youtube/comments", async (req, res) => {
    const { videoId } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    if (!apiKey) {
      console.error("YOUTUBE_API_KEY is missing in environment variables");
      return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured on the server." });
    }

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.error) {
        console.error("YouTube API Comments Error:", data.error);
        return res.status(data.error.code || 500).json({ error: data.error.message });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Server Proxy Comments Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
