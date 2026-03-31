import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // YouTube API Setup
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  // API route to fetch YouTube video info and comments
  app.get("/api/youtube/video", async (req, res) => {
    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "Missing videoId" });
    }

    try {
      // Fetch video details
      const videoResponse = await youtube.videos.list({
        part: ["snippet", "statistics"],
        id: [videoId],
      });

      const video = videoResponse.data.items?.[0];
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Fetch comments
      const commentsResponse = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId: videoId,
        maxResults: 100,
        order: "relevance",
      });

      const comments = commentsResponse.data.items?.map((item) => ({
        id: item.id,
        author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
        text: item.snippet?.topLevelComment?.snippet?.textDisplay,
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt,
      })) || [];

      res.json({
        video: {
          id: video.id,
          title: video.snippet?.title,
          description: video.snippet?.description,
          thumbnail: video.snippet?.thumbnails?.high?.url,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
        },
        comments,
      });
    } catch (error: any) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch YouTube data" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
