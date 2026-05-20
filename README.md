# AI 會議記錄與翻譯工具

這是一個使用 `React + Vite + TypeScript` 的前端應用，搭配 `Express` 後端與 `@google/genai` Gemini AI。專案已調整為一般 Express 伺服器部署，適合在任意 Node.js 主機上運行。

## 快速開始

**Prerequisites:** Node.js

1. 安裝相依套件：
   `npm install`
2. 建立 `.env` 檔案並設定 `GEMINI_API_KEY`
3. 開發模式啟動：
   `npm run dev`

## 部署

- 先執行 `npm run build`
- 再執行 `npm start`

## 環境變數

建立 `.env`，並加入：

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

`PORT` 為可選值，預設會使用 `3000`。

## 服務說明

- `/api/generate`：接受 `transcript`、`targetLanguage`、`outputStyle`、`customInstruction`
- 會使用 Gemini 生成會議摘要與翻譯結果
