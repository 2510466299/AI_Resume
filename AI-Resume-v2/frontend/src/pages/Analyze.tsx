import { useState } from "react";
import type { AnalyzePayload, FullAnalysisResult } from "../types";

type Props = {
  onStart: (payload: AnalyzePayload) => Promise<void>;
  onStop: () => void;
  isStreaming: boolean;
  logs: string[];
  analysisId: string | null;
  result: FullAnalysisResult | null;
};

const sampleResume = `张三 | 全栈工程师
8 年经验，擅长 React/TypeScript、Python、FastAPI，熟悉云原生与数据工程。
- 主导 B2B SaaS 前端性能优化（TTI -35%）
- 构建 LLM 实验平台，封装 RAG + SSE 流式推理`;

const sampleJD = `岗位：资深全栈工程师（LLM）
要求：
- 熟悉 Python/FastAPI，具备接口网关与权限实践
- React + Vite 组件化与状态管理经验
- 熟悉 SSE/WebSocket，能设计流式交互
- 有 LLM 应用落地经验，RAG/Agent 优先`;

export function Analyze({
  onStart,
  onStop,
  isStreaming,
  logs,
  analysisId,
  result,
}: Props) {
  const [resume, setResume] = useState(sampleResume);
  const [jd, setJd] = useState(sampleJD);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com"); // OpenAI 兼容

  const handleSubmit = async () => {
    await onStart({
      resume_text: resume,
      jd_text: jd,
      api_key: apiKey || undefined,
      model,
      base_url: baseUrl || undefined,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                输入材料
              </h2>
              <p className="text-sm text-slate-500">
                简历 & JD 仅在本地保存，分析任务 3 分钟超时自动结束。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isStreaming}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-semibold disabled:opacity-60"
              >
                {isStreaming ? "分析中..." : "一键分析"}
              </button>
              <button
                onClick={onStop}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                停止
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                简历文本
              </label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">JD</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                模型配置
              </h3>
              <p className="text-xs text-slate-500">
                Base URL 支持直连 DeepSeek 或网关；Key 仅用于本地请求。
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Base URL
              </label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Model
              </label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-***"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="glass-card p-4 h-[320px] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">实时日志</h3>
            {analysisId ? (
              <span className="pill bg-indigo-50 text-indigo-600">
                ID: {analysisId.slice(0, 8)}
              </span>
            ) : null}
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {logs.length === 0 ? (
              <p className="text-slate-400">等待分析...</p>
            ) : (
              logs.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                  <p>{item}</p>
                </div>
              ))
            )}
          </div>
        </div>
        {result ? (
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              最近结果摘要
            </h3>
            <p className="text-sm text-slate-600">
              {result.gap_analysis.overview ||
                "已生成完整结果，可在其他 Tab 查看详情。"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Analyze;
