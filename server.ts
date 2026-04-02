import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Helper to get and validate Gemini API key
  const getGeminiApiKey = () => {
    // Priority: GEMINI_API_KEY (platform standard)
    let key = (process.env.GEMINI_API_KEY || "").trim();
    
    // Fallback: Check if it's under a different common name in this environment
    if (!key || key === "undefined" || key === "MY_GEMINI_API_KEY") {
      key = (process.env.API_KEY || "").trim();
    }

    if (!key || key === "undefined" || key === "MY_GEMINI_API_KEY") {
      console.error("CRITICAL: No valid Gemini API key found in environment variables.");
      return null;
    }
    
    return key;
  };

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
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Clé API Gemini non configurée ou invalide sur le serveur. Veuillez la configurer dans les secrets de l'application." });
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

  // API route for Correcteur
  app.post("/api/correcteur/analyze", async (req, res) => {
    const { input, model } = req.body;

    if (!input || typeof input !== "string") {
      return res.status(400).json({ error: "Texte manquant ou invalide" });
    }

    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Clé API Gemini non configurée ou invalide sur le serveur. Veuillez la configurer dans les secrets de l'application." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = input;
      const systemInstruction = `Tu es un expert en linguistique et correction de texte. Analyse le texte de l'utilisateur et fournis deux sections distinctes séparées par le délimiteur "---SUGGESTIONS---".

SECTION 1 (CORRECTIONS) : Liste uniquement les erreurs d'orthographe, de grammaire et de ponctuation de manière extrêmement courte et factuelle sous forme de bullet points. Si aucune erreur n'est détectée, écris uniquement "Aucune erreur détectée".

SECTION 2 (SUGGESTIONS) : Propose une nouvelle version intégrale du texte de l'utilisateur. 
IMPORTANT : 
- Ne donne AUCUNE explication, introduction ou commentaire. 
- Propose directement le texte réécrit de manière plus fluide et élégante.
- Ne change pas la nature ou le sens du texte initial.
- N'ajoute aucun élément d'information nouveau.
- Si le texte est déjà optimal, réécris-le tel quel.

Format de réponse attendu :
[Bullet points des corrections]
---SUGGESTIONS---
[Texte intégral réécrit]`;

      const response = await ai.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ analysis: response.text || "Désolé, l'analyse a échoué." });
    } catch (error: any) {
      console.error("Correcteur Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze text" });
    }
  });

  // API route for Cartographie synthesis
  app.post("/api/cartographie/synthesize", async (req, res) => {
    const { pubsText } = req.body;

    if (!pubsText || typeof pubsText !== "string") {
      return res.status(400).json({ error: "Texte des publications manquant ou invalide" });
    }

    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Clé API Gemini non configurée ou invalide sur le serveur. Veuillez la configurer dans les secrets de l'application." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Ta mission est de synthétiser les conversations au sein d'un "cluster" (une communauté d'influence cohérente) pour en extraire la substantifique moelle stratégique. 
Objectif : Produire une synthèse brève, claire et précise qui répond à la question : "Que se dit-il et qui mène la danse dans ce groupe ?"
Instructions de rédaction :
- IMPORTANT : Ne commence JAMAIS par une phrase d'introduction comme "Voici la synthèse..." ou "Voici ce qui se dit...". Entre DIRECTEMENT dans le vif du sujet avec le titre.
- Angle d'attaque : Identifie le "narratif maître" du cluster (ex: indignation morale, critique technique, soutien institutionnel).
- Synthèse par Bullet Points : Détaille les 3 à 5 thématiques ou arguments principaux qui circulent.
- Attribution : Intègre systématiquement entre parenthèses le nom de l'auteur ou du média lorsqu'une prise de position est structurante ou très virale (ex: @Auteur).
- Ton & Intensité : Précise le climat émotionnel (ironie, colère, mobilisation) et si des appels à l'action sont formulés (appels au boycott, pétitions, interpellations de politiques).

Format de sortie (en Markdown) :
- Titre : Nommer le cluster (ex: "# LE PÔLE MILITANT ACTIVISTE"). Utilise un titre de niveau 1 (#).
- L'Essentiel : Le résumé ultra-condensé en 1 phrase max. Utilise du **gras** pour les termes clés.
- Analyse : Liste à puces Markdown (utilisant "- ") avec les attributions. Chaque argument ou paragraphe DOIT être un élément de liste distinct. Utilise du **gras** pour souligner les points saillants.
- Signal Faible : Une information ou un argument émergent qui pourrait sortir du cluster. Utilise du **gras**.

IMPORTANT : Saute TOUJOURS une ligne vide entre chaque section pour garantir une lecture aérée.

Publications :
${pubsText}`,
      });

      res.json({ synthesis: response.text || "Désolé, la synthèse a échoué." });
    } catch (error: any) {
      console.error("Cartographie Synthesis Error:", error);
      res.status(500).json({ error: error.message || "Failed to synthesize cluster" });
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
