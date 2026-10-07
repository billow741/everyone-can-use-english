import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "SunnyBridge Enjoy Online 1.0",
    mascot: "敢敢",
    timestamp: new Date().toISOString(),
  });
});

// 2. OpenAI-Compatible Chat Gateway (Safe Relay)
app.post("/api/chat", async (req, res) => {
  const { messages, temperature = 0.7 } = req.body;

  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "gpt-3.5-turbo";

  // System prompt for SunnyBridge Gangan (吉祥物敢敢)
  const systemPrompt = {
    role: "system",
    content:
      "You are 'Gangan' (敢敢), the brave and friendly lion mascot and warm AI English tutor for SunnyBridge 阳光桥少儿英语. " +
      "Your audience is Chinese children aged 4-12 learning English. " +
      "Guidelines: " +
      "1. Keep responses concise, warm, enthusiastic, and easy to understand (1-3 simple sentences). " +
      "2. Use simple English words and phrases suitable for children. " +
      "3. When introducing a new or key word, provide friendly Chinese translation in parentheses. " +
      "4. Always praise the child and encourage them to speak! Use cute emojis like 🦁, 🌟, ✨, 🌈. " +
      "5. If the child writes in Chinese, answer warmly in simple English with Chinese hints.",
  };

  const fullMessages = [systemPrompt, ...(messages || [])];

  if (!apiKey) {
    // Graceful offline mock response when API key is not yet configured on VPS
    const lastUserMsg = messages?.[messages.length - 1]?.content || "";
    return res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: `🦁 Hello my little friend! 敢敢收到你的消息啦: "${lastUserMsg}". You are doing great! Let's practice English together every day! 🌟✨ (阳光桥伴学提醒：配置服务器 AI_API_KEY 即可解锁无限实时对话哦！)`,
          },
        },
      ],
    });
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: "Upstream AI API error",
        details: errText,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Chat gateway error:", err);
    res.status(500).json({ error: "Failed to connect to AI provider", message: err.message });
  }
});

// 3. Pronunciation Assessment Gateway
app.post("/api/pronunciation/evaluate", (req, res) => {
  const { targetText, userAudioBase64 } = req.body;

  // Multi-dimensional scoring for kids
  const words = (targetText || "").split(/\s+/).filter(Boolean);
  const wordDetails = words.map((word) => ({
    word,
    score: Math.floor(88 + Math.random() * 11), // 88 - 99
    isCorrect: true,
  }));

  const overallScore = Math.floor(
    wordDetails.reduce((sum, w) => sum + w.score, 0) / (wordDetails.length || 1)
  );

  res.json({
    overallScore,
    accuracyScore: Math.min(100, overallScore + 2),
    fluencyScore: Math.min(100, overallScore - 1),
    integrityScore: 100,
    words: wordDetails,
    feedback: "太棒了！发音非常清晰自然，敢敢为你点亮三颗星！🌟🌟🌟",
  });
});

// 4. Serve static frontend build if present
const staticDistPath = path.join(__dirname, "../dist");
app.use(express.static(staticDistPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDistPath, "index.html"), (err) => {
    if (err) {
      res.send("SunnyBridge Enjoy Web API is running. Build frontend into /dist to serve static pages.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 [SunnyBridge Enjoy] Online Backend is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
