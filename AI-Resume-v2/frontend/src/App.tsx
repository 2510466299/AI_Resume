import { useEffect, useMemo, useState } from "react";
import {
  fetchAnalysis,
  fetchHistory,
  regenerateResume,
  saveDraft,
  startAnalysisStream,
} from "./api";
import Analyze from "./pages/Analyze";
import GapOverview from "./pages/GapOverview";
import HistoryPanel from "./pages/HistoryPanel";
import PlanBoard from "./pages/PlanBoard";
import ResumeStudio from "./pages/ResumeStudio";
import type {
  AnalyzePayload,
  FullAnalysisResult,
  HistoryItem,
  LearningPlan,
} from "./types";
import "./index.css";

const tabs = [
  { key: "analyze", label: "Analyze" },
  { key: "gap", label: "Gap Overview" },
  { key: "plan", label: "Plan Board" },
  { key: "resume", label: "Resume Studio" },
];

function App() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(
    null
  );
  const [planDraft, setPlanDraft] = useState<LearningPlan | null>(null);
  const [resumeMarkdown, setResumeMarkdown] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch((err) => console.warn("历史加载失败", err));
  }, []);

  const refreshHistory = () => {
    fetchHistory()
      .then(setHistory)
      .catch((err) => console.warn("历史加载失败", err));
  };

  const handleStart = async (payload: AnalyzePayload) => {
    setIsStreaming(true);
    setLogs(["启动分析..."]);
    setError(null);
    const ctrl = startAnalysisStream(
      payload,
      (_eventName, event) => {
        if (event.type === "log" && event.message) {
          setLogs((prev) => [...prev, event.message!]);
        }
        if (event.type === "error") {
          setError(event.message || "分析失败");
          setIsStreaming(false);
        }
        if (event.type === "result" && event.payload) {
          setAnalysisId(event.analysis_id ?? null);
          setAnalysisResult(event.payload);
          setPlanDraft(event.payload.learning_plan);
          setResumeMarkdown(event.payload.custom_resume_markdown || "");
          setActiveTab("gap");
          refreshHistory();
        }
      },
      () => setIsStreaming(false),
      (err) => {
        setError(err.message);
        setIsStreaming(false);
      }
    );
    setController(ctrl);
  };

  const handleStop = () => {
    controller?.abort();
    setIsStreaming(false);
  };

  const handleSelectHistory = async (id: string) => {
    try {
      const data = await fetchAnalysis(id);
      setAnalysisId(data.id);
      setAnalysisResult(data.result);
      setPlanDraft(data.draft_learning_plan ?? data.result.learning_plan);
      setResumeMarkdown(
        data.draft_resume ?? data.result.custom_resume_markdown ?? ""
      );
      setActiveTab("gap");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // autosave drafts
  useEffect(() => {
    if (!analysisId) return;
    const timer = setTimeout(() => {
      saveDraft(analysisId, {
        learning_plan: planDraft ?? undefined,
        custom_resume_markdown: resumeMarkdown ?? undefined,
      }).catch((err) => console.warn("保存草稿失败", err));
    }, 800);
    return () => clearTimeout(timer);
  }, [analysisId, planDraft, resumeMarkdown]);

  const analysisSummary = useMemo(() => {
    if (!analysisResult) return "等待分析...";
    return (
      analysisResult.gap_analysis.overview ||
      "已生成分析结果，切换 Tab 查看各模块。"
    );
  }, [analysisResult]);

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                AI Resume Studio
              </p>
              <p className="text-xs text-slate-500">
                差距可视化 · 行动计划 · 定制简历
              </p>
            </div>
          </div>
          <nav className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">当前状态</p>
            <p className="text-sm font-semibold text-slate-900">
              {analysisSummary}
            </p>
          </div>
          {isStreaming ? (
            <span className="pill bg-indigo-50 text-indigo-600 animate-pulse">
              流式执行中...
            </span>
          ) : (
            <span className="pill bg-emerald-50 text-emerald-600">空闲</span>
          )}
        </div>

        {error ? (
          <div className="glass-card border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
            {error}
          </div>
        ) : null}

        {activeTab === "analyze" ? (
          <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
            <Analyze
              onStart={handleStart}
              onStop={handleStop}
              isStreaming={isStreaming}
              logs={logs}
              analysisId={analysisId}
              result={analysisResult}
            />
            <HistoryPanel items={history} onSelect={handleSelectHistory} />
          </div>
        ) : null}

        {activeTab === "gap" && (
          <GapOverview gaps={analysisResult?.gap_analysis?.gaps} />
        )}

        {activeTab === "plan" && (
          <PlanBoard
            plan={planDraft}
            baseline={analysisResult?.learning_plan ?? null}
            onChange={(p) => setPlanDraft(p)}
          />
        )}

        {activeTab === "resume" && (
          <ResumeStudio
            mapping={analysisResult?.jd_mapping_matrix}
            markdown={resumeMarkdown}
            onChange={setResumeMarkdown}
            onRegenerate={async () => {
              if (!analysisResult) return;
              try {
                const md = await regenerateResume({
                  analysis_id: analysisId,
                  resume_text:
                    analysisResult.resume_profile.summary ||
                    analysisResult.custom_resume_markdown ||
                    "",
                  jd_text: analysisResult.job_profile.summary || "",
                });
                setResumeMarkdown(md);
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
