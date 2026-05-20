import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Languages, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Clock, 
  ChevronRight, 
  Layers, 
  Settings2, 
  Info, 
  AlertCircle, 
  Send,
  ArrowRightLeft,
  RefreshCw,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { MEETING_TEMPLATES, MeetingTemplate } from "./data/templates";

// 宣告摘要風格選項
interface StyleOption {
  key: string;
  label: string;
  description: string;
  emoji: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { key: "標準詳細摘要", label: "標準詳細摘要", description: "整理基本資訊、精華摘要、關鍵決策與行動清單", emoji: "📝" },
  { key: "精煉條列式重點", label: "精煉條列式重點", description: "只保留關鍵成果、核心討論與關鍵數據，捨棄冗詞", emoji: "⚡" },
  { key: "待辦與決策優先", label: "待辦與決策優先", description: "突出行動指派人、期待時限與會議定案之重大決策", emoji: "🎯" },
  { key: "逐字摘要與語氣重述", label: "敘事重述摘要", description: "採用整合文章的流暢口語進行情境敘述，重現談話核心", emoji: "🎙️" }
];

// 宣告目標語言選項
interface LanguageOption {
  key: string;
  label: string;
  englishLabel: string;
  flag: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { key: "英文", label: "英文", englishLabel: "English", flag: "🇺🇸" },
  { key: "日文", label: "日文", englishLabel: "Japanese", flag: "🇯🇵" },
  { key: "韓文", label: "韓文", englishLabel: "Korean", flag: "🇰🇷" },
  { key: "簡體中文", label: "簡體中文", englishLabel: "Simplified Chinese", flag: "🇨🇳" },
  { key: "西班牙文", label: "西班牙文", englishLabel: "Spanish", flag: "🇪🇸" },
  { key: "法文", label: "法文", englishLabel: "French", flag: "🇫🇷" },
  { key: "德文", label: "德文", englishLabel: "German", flag: "🇩🇪" },
  { key: "越南文", label: "越南文", englishLabel: "Vietnamese", flag: "🇻🇳" }
];

export default function App() {
  const [transcript, setTranscript] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("英文");
  const [selectedStyle, setSelectedStyle] = useState<string>("標準詳細摘要");
  const [customInstruction, setCustomInstruction] = useState<string>("");
  
  // API 發送狀態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [result, setResult] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // 即時時間顯示
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // 設置即時秒錶
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("zh-TW", { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 模擬 Loading 步驟計時器（增強 UI 體驗）
  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    if (loading) {
      stepTimer = setInterval(() => {
        setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 1600);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(stepTimer);
  }, [loading]);

  // 匯入範本
  const handleLoadTemplate = (template: MeetingTemplate) => {
    setTranscript(template.content);
    setResult("");
    setErrorMsg(null);
  };

  // 一鍵複製
  const handleCopy = async () => {
    if (!result) return;
    try {
      const success = await copyToClipboard(result);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.error("複製失敗", err);
    }
  };

  // 複製剪貼簿輔助函數
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);
        return success;
      }
    } catch (err) {
      return false;
    }
  };

  // 下載為 Markdown 檔案
  const handleDownloadMarkdown = () => {
    if (!result) return;
    try {
      const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // 根據風格與語系建立檔案名稱
      const dateString = new Date().toISOString().slice(0, 10);
      link.download = `會議摘要紀錄_譯-${selectedLanguage}_${dateString}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("下載失敗", err);
    }
  };

  // 呼叫 API 送出生成
  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setErrorMsg("請先輸入會議逐字稿、重點筆記或點選下方的範本載入。");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);
    setResult("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          targetLanguage: selectedLanguage,
          outputStyle: selectedStyle,
          customInstruction: customInstruction
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失敗，未知的伺服器錯誤。");
      }

      setResult(data.result);
    } catch (err: any) {
      console.error("Generate error:", err);
      setErrorMsg(err.message || "無法與伺服器建立連線，請稍後再試一次。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-[#1E293B] font-sans flex flex-col antialiased">
      
      {/* 🔮 High Density 專業精簡導航欄 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>AI 會議記錄生成與翻譯工具</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">Pro</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                High Density Minutes Summarization & Translation Engine
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 px-3.5 py-1.5 rounded-lg text-[11px] text-slate-500 font-mono border border-slate-200 shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-600">系統狀態: 運行中</span>
            <span className="text-slate-200">|</span>
            <Clock className="w-3 h-3 text-slate-400 inline-block align-text-top" />
            <span className="text-slate-600 font-medium">{currentTime || "載入中..."}</span>
          </div>
        </div>
      </header>

      {/* 🎯 主畫面容器 - 高密度版面配置 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* 左側：輸入與設定區 (占 5 格) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          
          {/* A. 逐字稿/筆記輸入框 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 relative flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">輸入區域 (原始文本)</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  當前字數: {transcript.length}
                </span>
                {transcript && (
                  <button
                    onClick={() => setTranscript("")}
                    className="p-1 px-2 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-md text-slate-500 hover:text-rose-600 text-[10px] font-bold cursor-pointer transition-colors duration-150 flex items-center gap-1"
                    title="清空文字"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空畫布</span>
                  </button>
                )}
              </div>
            </div>

            {/* 實際輸入文字區域 */}
            <div className="relative">
              <textarea
                id="meeting-transcript-textarea"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="請在此貼上您的會議逐字稿、重點速記，或點選下方提供的實用範本快速體驗 AI 功能..."
                className="w-full h-72 min-h-[220px] p-4 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-slate-700 placeholder-slate-300 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-150 resize-y leading-relaxed font-sans"
              />
            </div>

            {/* 實用範本選擇區 */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400">快速載入演示範本：</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {MEETING_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleLoadTemplate(tpl)}
                    className="w-full text-left p-2 bg-slate-50 hover:bg-indigo-50/40 rounded-lg border border-slate-200/80 hover:border-indigo-200 transition-colors duration-150 cursor-pointer group flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">
                        {tpl.title}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-600 bg-slate-200/50 group-hover:bg-indigo-100/40 px-1.5 py-0.5 rounded">
                        {tpl.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* B. 摘要格式與翻譯設定卡片 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Settings2 className="h-4.5 w-4.5 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">客製化處理設定</h2>
            </div>

            {/* 1. 摘要風格選擇 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500">
                ❶ 選擇會議摘要風格 (SUMMARY STYLE)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLE_OPTIONS.map((opt) => {
                  const isSel = selectedStyle === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedStyle(opt.key)}
                      className={`p-2 text-left rounded-lg border text-xs cursor-pointer transition-all duration-150 flex flex-col gap-0.5 ${
                        isSel 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold ring-1 ring-indigo-500/10" 
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{opt.emoji}</span>
                        <span className="font-bold text-[11px]">{opt.label}</span>
                      </div>
                      <span className={`text-[9px] leading-tight ${isSel ? "text-indigo-700/80" : "text-slate-400"}`}>
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 翻譯目標語系選擇 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>❷ 譯後目標語言 (TARGET LANGUAGE)</span>
                <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-mono">
                  雙語對比
                </span>
              </label>
              
              <div className="grid grid-cols-4 gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSel = selectedLanguage === lang.key;
                  return (
                    <button
                      key={lang.key}
                      onClick={() => setSelectedLanguage(lang.key)}
                      className={`p-1.5 rounded-lg border text-center text-xs cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                        isSel 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold ring-1 ring-indigo-500/10" 
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      <span className="font-bold text-[10px] whitespace-nowrap">{lang.label}</span>
                      <span className="text-[8px] text-slate-400 uppercase font-mono">{lang.englishLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 額外要求 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500">
                ❸ 額外特別自訂提示詞 (OPTIONAL)
              </label>
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="例：『多加注意與會者的代辦完成期限』或『結果用一級簡語』"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-slate-700 placeholder-slate-400 text-xs focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-150"
              />
            </div>

            {/* 4. 主要生成按鈕 */}
            <div className="pt-1">
              <button
                id="generate-button"
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-3 px-5 rounded-lg font-bold text-xs shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                  loading 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.985] border border-indigo-600"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin text-slate-400" />
                    <span>AI 正在密集提煉與翻譯中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    <span>開始智能分析與翻譯 ({selectedLanguage})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 右側：輸出顯示區 (占 7 格) */}
        <section className="lg:col-span-7 flex flex-col">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow duration-200 overflow-hidden min-h-[450px]">
            
            {/* 輸出頂部工具欄 */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">分析結果呈現區塊</span>
              </div>
              
              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 border transition-all duration-150 shadow-sm ${
                      isCopied
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-800 border-slate-200"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>已複製！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>一鍵複製結果</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md flex items-center gap-1.5 transition-all duration-150 shadow-sm"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-400" />
                    <span>下載 .md 檔</span>
                  </button>
                </div>
              )}
            </div>

            {/* 主要顯視主體 */}
            <div className="p-5 md:p-6 flex-grow flex flex-col bg-white overflow-y-auto max-h-[820px] custom-scrollbar">
              
              <AnimatePresence mode="wait">
                
                {/* 1. 初始空狀態 */}
                {!loading && !result && !errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex-grow flex flex-col items-center justify-center text-center p-6 my-auto"
                  >
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-lg mb-3 border border-slate-100">
                      <Languages className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1 font-sans">
                      尚未產生任何分析摘要
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
                      請在左側貼上完整的會議逐字內容與自訂設定，我們的 Gemini 大腦將即時執行結構化摘要及多國語言雙語對照呈現。
                    </p>

                    {/* 教學導覽卡 */}
                    <div className="grid grid-cols-3 gap-3 text-left max-w-md w-full border-t border-slate-100 pt-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <span className="inline-block px-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold">1</span>
                          <span>貼上原文內容</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-normal">
                          貼上或選擇一鍵匯入預設的會議範本。
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <span className="inline-block px-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold">2</span>
                          <span>調整風格語系</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-normal">
                          自選不同的提煉格式與目標譯後語系。
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <span className="inline-block px-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold">3</span>
                          <span>智慧分析對照</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-normal">
                          生成高對比 Markdown 對照版並支援複製與下載。
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Loading 進度條狀態 */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-grow flex flex-col items-center justify-center py-6 my-auto"
                  >
                    {/* 呼吸躍動波浪 */}
                    <div className="relative flex items-center justify-center w-16 h-16 mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.15, 0.05, 0.15] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="absolute w-full h-full bg-indigo-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.15, 0.25] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", delay: 0.2 }}
                        className="absolute w-12 h-12 bg-indigo-300 rounded-full"
                      />
                      <div className="relative p-3.5 bg-white shadow-md border border-indigo-100 rounded-xl text-indigo-600">
                        <RefreshCw className="w-5 h-5 animate-spin duration-300" />
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 mb-1 font-sans">
                      Gemini 引擎正在密集計算中...
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-5">請稍後，這個過程通常需要幾秒鐘</p>

                    {/* Staggered progress lines */}
                    <div className="w-full max-w-sm flex flex-col gap-2 bg-slate-50 border border-slate-200 p-3.5 rounded-lg shadow-inner">
                      {[
                        "分析與解構會議對話原文字流...",
                        "智慧提煉會議共識、討論軌跡與核心決策...",
                        "自動封裝責任項目與明確的待辦清單...",
                        `精準將中文摘要內容翻譯至 [ ${selectedLanguage} ] 語系...`,
                        "完成排版優化與 Markdown 格式對照整合...",
                      ].map((stepStr, idx) => {
                        const isDone = loadingStep > idx;
                        const isActive = loadingStep === idx;
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-2 text-[11px] transition-opacity duration-200 ${
                              isDone ? "text-indigo-700 font-medium" : isActive ? "text-slate-700 font-semibold" : "text-slate-300"
                            }`}
                          >
                            <span className="mt-0.5 flex-shrink-0">
                              {isDone ? (
                                <Check className="w-3.5 h-3.5 text-indigo-600 bg-indigo-100 rounded-full p-0.5 font-bold" />
                              ) : isActive ? (
                                <span className="flex h-3 w-3 relative items-center justify-center">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                </span>
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-slate-200" />
                              )}
                            </span>
                            <span className="leading-tight">{stepStr}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* 3. 錯誤訊息 */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex-grow flex flex-col items-center justify-center text-center p-5 border border-dashed border-rose-200 bg-rose-50/55 rounded-xl my-auto"
                  >
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-bold text-rose-900 mb-1 font-sans">
                      處理途中遇到錯誤
                    </h3>
                    <p className="text-[10px] text-rose-700 max-w-sm mb-4 leading-relaxed bg-white border border-rose-100 p-2.5 rounded shadow-inner font-mono text-left">
                      {errorMsg}
                    </p>
                    <div className="text-[10px] text-slate-500 max-w-xs text-left leading-normal space-y-1 bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">如何進行排錯：</span>
                      <p>1. 確認您已於 AI Studio 的 <strong>Settings &gt; Secrets</strong> 新增 <code>GEMINI_API_KEY</code> 設定。</p>
                      <p>2. 請重按一次「開始智慧分析與翻譯」按鈕，重新發送請求。</p>
                    </div>
                  </motion.div>
                )}

                {/* 4. Markdown 結果輸出區 */}
                {result && !loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-grow flex flex-col"
                  >
                    {/* 微調過的 Markdown 渲染器包裹層 */}
                    <div className="markdown-body select-text antialiased">
                      <Markdown>{result}</Markdown>
                    </div>

                    {/* 客製 System Instruction 常數小揭示板 (符合需求中提及的 System Instructions 定義) */}
                    <div className="mt-6 pt-5 border-t border-slate-200">
                      <details className="group border border-slate-200 bg-slate-50 hover:bg-slate-50/70 rounded-lg transition-all duration-150">
                        <summary className="px-3.5 py-2 text-[10px] font-bold text-slate-400 cursor-pointer flex items-center justify-between select-none group-open:border-b group-open:border-slate-200">
                          <span className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                            <span>查看本次呼叫 AI 的系統常數指令 (System Instructions) 設定</span>
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-open:rotate-90 transition-transform duration-100" />
                        </summary>
                        <div className="px-3.5 py-2.5 text-[10px] text-slate-500 font-mono leading-relaxed space-y-1.5 bg-slate-50/40 max-h-40 overflow-y-auto custom-scrollbar">
                          <blockquote className="border-l-2 border-slate-350 pl-2 text-slate-400 text-[9.5px] whitespace-pre-line space-y-1">
                            你是一位專業的會議記錄助理。請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
                            請務必遵守以下輸出格式要求：

                            1. **會議主題與時間**：擷取會議的主題與時間。
                            2. **與會者**：列出參與會議的人員。
                            3. **會議重點總結**：用 3 到 5 個重點總結會議內容（摘要風格：<span className="text-indigo-600 font-bold">{selectedStyle}</span>）。
                            4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人。
                            5. **{selectedLanguage}翻譯版**：將上述 1~4 點的內容完整翻譯成專業的{selectedLanguage}。

                            請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。
                            特殊自訂要求：<span className="text-indigo-600 font-bold">{customInstruction || "無"}</span>
                          </blockquote>
                        </div>
                      </details>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </div>

          </div>

        </section>

      </main>

      {/* 💳 High Density 輕量化底部版權 */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between shrink-0 text-[9px] text-slate-400 font-mono uppercase tracking-widest">
        <div>Model Options: Gemini-3.5-Flash | OutputStyle: {selectedStyle}</div>
        <div>Server latency: Adaptive | API state: ACTIVE</div>
      </footer>

    </div>
  );
}
