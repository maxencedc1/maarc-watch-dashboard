import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API route to fetch YouTube video info and comments
  app.get("/api/youtube/video", async (req, res) => {
    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "Missing videoId" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key not configured on server. Please add YOUTUBE_API_KEY to your secrets." });
    }

    try {
      // Re-initialize youtube client to ensure it uses the current API key
      const youtube = google.youtube({
        version: "v3",
        auth: apiKey,
      });

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
      let comments = [];
      try {
        const commentsResponse = await youtube.commentThreads.list({
          part: ["snippet"],
          videoId: videoId,
          maxResults: 100,
          order: "relevance",
        });

        comments = commentsResponse.data.items?.map((item) => ({
          id: item.id,
          author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
          text: item.snippet?.topLevelComment?.snippet?.textDisplay,
          publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt,
        })) || [];
      } catch (commentError: any) {
        console.warn("Could not fetch comments (they might be disabled):", commentError.message);
        // We still return the video data even if comments fail
      }

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
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to fetch YouTube data";
      res.status(error.response?.status || 500).json({ error: errorMessage });
    }
  });

  // API route for AI analysis of comments
  app.post("/api/youtube/analyze", async (req, res) => {
    const { videoTitle, comments } = req.body;

    if (!comments || !Array.isArray(comments)) {
      return res.status(400).json({ error: "Missing or invalid comments" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured on server" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const commentText = comments.map((c: any) => c.text).join("\n\n").slice(0, 30000);
      
      const prompt = `Analyse les commentaires suivants de cette vidéo YouTube "${videoTitle}". 
      Donne un résumé des thèmes principaux, le sentiment général (positif, négatif, neutre), 
      et les questions ou critiques les plus fréquentes. 
      Réponds en français de manière structurée avec des titres et des listes.
      
      Commentaires :
      ${commentText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ analysis: response.text || "Désolé, l'analyse a échoué." });
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze comments" });
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
