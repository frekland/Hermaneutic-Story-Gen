import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const PORT = 3000;

  // Helper function to sleep for a duration
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // robust content generator wrapper with auto-retry on 429
  const generateStreamWithRetry = async (params: {
    model: string;
    contents: string;
    config: any;
  }, maxRetries = 12) => {
    let attempt = 0;
    while (true) {
      try {
        return await ai.models.generateContentStream(params);
      } catch (error: any) {
        attempt++;
        const errorMessage = typeof error === 'string' ? error : (error?.message || error?.error?.message || JSON.stringify(error) || "");
        
        const isRateLimit = errorMessage.includes("429") || 
                            errorMessage.includes("RESOURCE_EXHAUSTED") || 
                            errorMessage.includes("quota") || 
                            errorMessage.includes("Too Many Requests") ||
                            error?.status === 429;

        if (isRateLimit && attempt <= maxRetries) {
          // Attempt to parse how long the API wants us to wait
          // e.g. "Please retry in 52.60255388s"
          let delayMs = 4000 * Math.pow(2, attempt); // fallback exponential backoff
          const retryInMatch = errorMessage.match(/retry in\s+([\d.]+)\s*s/i);
          if (retryInMatch) {
            const seconds = parseFloat(retryInMatch[1]);
            if (!isNaN(seconds)) {
              delayMs = (seconds + 3.0) * 1000;
            }
          }
          console.warn(`[Gemini Rate Limit] Attempt ${attempt}/${maxRetries} failed with 429 resource exhausted. Waiting ${Math.round(delayMs)}ms before retry...`);
          await sleep(delayMs);
        } else {
          throw error;
        }
      }
    }
  };

  // API Route - Generate stream proxy
  app.post("/api/generate-stream", async (req, res) => {
    const { systemInstruction, prompt, model } = req.body;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await generateStreamWithRetry({
        model: model || "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
    } catch (error: any) {
      console.error("Stream error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Unknown error" })}\n\n`);
    } finally {
      res.end();
    }
  });

  // robust non-streaming generator wrapper with auto-retry on 429
  const generateContentWithRetry = async (params: {
    model: string;
    contents: string;
    config: any;
  }, maxRetries = 12) => {
    let attempt = 0;
    while (true) {
      try {
        return await ai.models.generateContent(params);
      } catch (error: any) {
        attempt++;
        const errorMessage = typeof error === 'string' ? error : (error?.message || error?.error?.message || JSON.stringify(error) || "");
        
        const isRateLimit = errorMessage.includes("429") || 
                            errorMessage.includes("RESOURCE_EXHAUSTED") || 
                            errorMessage.includes("quota") || 
                            errorMessage.includes("Too Many Requests") ||
                            error?.status === 429;

        if (isRateLimit && attempt <= maxRetries) {
          let delayMs = 4000 * Math.pow(2, attempt);
          const retryInMatch = errorMessage.match(/retry in\s+([\d.]+)\s*s/i);
          if (retryInMatch) {
            const seconds = parseFloat(retryInMatch[1]);
            if (!isNaN(seconds)) {
              delayMs = (seconds + 3.0) * 1000;
            }
          }
          console.warn(`[Gemini Rate Limit] Attempt ${attempt}/${maxRetries} failed with 429. Waiting ${Math.round(delayMs)}ms before retry...`);
          await sleep(delayMs);
        } else {
          throw error;
        }
      }
    }
  };

  // API Route - Expand basic ideas using gemini-3.5-flash as requested
  app.post("/api/expand-ideas", async (req, res) => {
    const { genres, themes, aim } = req.body;
    try {
      const prompt = `You are a creative writing expert and brainstorming partner.
The user wants to write a story but has only provided basic/minimal details.
Extend and enrich these ideas into a highly compelling, deep, and cohesive concept that can feed a sophisticated story generation pipeline.

User's Basic Inputs:
- Selected Genres: ${genres && genres.length > 0 ? genres.join(", ") : "None specified. Choose best fit."}
- Initial Themes & Content Cues: "${themes || "Not detailed. Bring up high-concept, highly engaging themes matching genres."}"
- Initial Story Aim / Pitch: "${aim || "Not detailed. Create an attractive narrative arc, climax and purpose."}"

Please produce a structured JSON response to help populate the application inputs.
Provide the following fields:
1. "genres": An array of exactly 2. Recommended genres of: 'Sci-Fi', 'Fantasy', 'Mystery', 'Romance', 'Horror', 'Thriller', 'Historical', 'Cyberpunk', 'Steampunk', 'Literary Fiction'. Choose what fits best.
2. "themes": A rich, evocative, and detailed list or description of themes, and content cues. Elaborate extensively, introducing deep conflicts and atmospheric settings. Ensure there are deep, contrasting values.
3. "aim": A beautifully structured, rich, and highly compelling story aim and pitch, setting the target feeling, core dramatic question, and narrative destination.

Ensure the outer response is strictly JSON.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              genres: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of recommended genres"
              },
              themes: { type: Type.STRING, description: "Detailed brainstorming themes" },
              aim: { type: Type.STRING, description: "Detailed narrative aim & purpose" }
            },
            required: ["genres", "themes", "aim"]
          }
        }
      });

      const text = response.text || "";
      const parsed = JSON.parse(text.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error expanding ideas:", error);
      res.status(500).json({ error: error.message || "Expansion failed" });
    }
  });

  // Vite middleware setup
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
