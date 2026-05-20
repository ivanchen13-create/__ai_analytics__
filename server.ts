import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// API keys are kept safely on the server
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("找不到 GEMINI_API_KEY。請在本地 .env 檔案中設定 GEMINI_API_KEY。");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// System Instructions 常數：定義 AI 會議摘要與翻譯行為
const SYSTEM_INSTRUCTION_TEMPLATE = `
你是一位專業的會議記錄助理。請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
請務必遵守以下輸出格式要求：

1. **會議主題與時間**：擷取會議的主題與時間。
2. **與會者**：列出參與會議的人員。
3. **會議重點總結**：用 3 到 5 個重點總結會議內容（摘要風格：{outputStyle}）。
4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人。
5. **{targetLanguage}翻譯版**：將上述 1~4 點的內容完整翻譯成專業的{targetLanguage}。

請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。
若使用者有提供特殊自訂要求，請同步融入您的處理模式中：{customInstruction}
`;

async function startServer() {
  // Support parsing JSON bodies
  app.use(express.json({ limit: "15mb" }));

  // API Route - 生成摘要與翻譯
  app.post("/api/generate", async (req, res) => {
    try {
      const { transcript, targetLanguage = "英文", outputStyle = "標準詳細摘要", customInstruction = "" } = req.body;

      if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
        return res.status(400).json({ error: "請輸入或貼上會議逐字稿或重點筆記內容。" });
      }

      const client = getGeminiClient();

      // 套用系統指令範本，填入對應的變數
      const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE
        .replace("{outputStyle}", outputStyle)
        .replace("{targetLanguage}", targetLanguage)
        .replace(/{targetLanguage}/g, targetLanguage) // Global replace if any other matches
        .replace("{customInstruction}", customInstruction.trim() || "無特別指定。");

      // 呼叫 Gemini 3.5 Flash 模型
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            text: `以下是需要處理的會議內文：\n\n${transcript}`
          }
        ],
        config: {
          systemInstruction,
          temperature: 0.3, // 保持輸出穩定度與一致性
        },
      });

      const resultText = response.text;
      if (!resultText) {
        return res.status(500).json({ error: "AI 生成了空白內容，請重試一遍。" });
      }

      res.json({ result: resultText });
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      res.status(500).json({
        error: error.message || "伺服器內部發生錯誤，無法成功生成會議記錄與翻譯。"
      });
    }
  });

  // Serve static assets in production or use Vite dev server in development
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
    console.log(`Server is running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
