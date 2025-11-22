import { useEffect, useMemo, useState } from "react";
import AnalyzePage from "./pages/AnalyzePage";
import GapOverviewPage from "./pages/GapOverviewPage";
import HistoryPage from "./pages/HistoryPage";
import PlanBoardPage from "./pages/PlanBoardPage";
import PromptSettingsPage from "./pages/PromptSettingsPage";
import ResumeStudioPage from "./pages/ResumeStudioPage";
import { usePersistentState } from "./hooks/usePersistentState";
import { API_BASE } from "./config";
import { getCopy, Lang } from "./i18n";
import { FullAnalysisResult, RunRecord } from "./types";

type TabId = "analyze" | "gaps" | "plan" | "resume" | "history" | "prompts";

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  { id: "analyze", label: "Analyze", description: "Run LLM pipeline" },
  { id: "gaps", label: "Gap Overview", description: "Prioritized issues" },
  { id: "plan", label: "Plan Board", description: "Learning roadmap" },
  { id: "resume", label: "Resume Studio", description: "JD mapping + export" },
  { id: "history", label: "History", description: "Load past runs" },
  { id: "prompts", label: "Prompts", description: "编辑 prompt" },
];

function App() {
  const [analysisResult, setAnalysisResult] = usePersistentState<
    FullAnalysisResult | null
  >("analysisResult", null);
  const [baselineResult, setBaselineResult] = usePersistentState<
    FullAnalysisResult | null
  >("analysisBaseline", null);
  const [analysisId, setAnalysisId] = usePersistentState<string | null>(
    "analysisId",
    null
  );
  const [activeTab, setActiveTab] = useState<TabId>("analyze");
  const [lang, setLang] = usePersistentState<Lang>("lang", "en");
  const [resumeText, setResumeText] = usePersistentState(
    "resumeText",
    getCopy("en").analyze.defaultResume
  );
  const [jdText, setJdText] = usePersistentState(
    "jdText",
    getCopy("en").analyze.defaultJD
  );
  const [runs, setRuns] = usePersistentState<RunRecord[]>("runs", []);
  const [activeRunId, setActiveRunId] = usePersistentState<string | null>(
    "activeRunId",
    null
  );
  const [planHistory, setPlanHistory] = usePersistentState("planHistory", [] as FullAnalysisResult["learning_plan"][]);
  const [resumeHistory, setResumeHistory] = usePersistentState<string[]>("resumeHistory", []);

  const copy = useMemo(() => getCopy(lang), [lang]);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    const loadDraft = async () => {
      try {
        const response = await fetch(`${API_BASE}/analysis/${analysisId}/draft`);
        if (!response.ok) return;
        const data = (await response.json()) as { result: FullAnalysisResult };
        if (!cancelled) {
          setAnalysisResult(data.result);
        }
      } catch {
        // ignore missing drafts
      }
    };
    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [analysisId, setAnalysisResult]);

  useEffect(() => {
    const STALE_MS = 3 * 60 * 1000; // auto-fail any run older than 3 minutes
    const now = Date.now();
    setRuns((prev) =>
      prev.map((run) =>
        run.status === "running" && now - run.startedAt > STALE_MS
          ? {
              ...run,
              status: "failed",
              finishedAt: now,
              error: "自动标记为失败：运行超时",
            }
          : run
      )
    );
  }, [setRuns]);

  const updateAnalysisContext = (result: FullAnalysisResult, id?: string | null) => {
    setAnalysisResult(result);
    setBaselineResult(result);
    setPlanHistory([]);
    setResumeHistory([]);
    setAnalysisId(id ?? null);
  };

  const persistDraftResult = (result: FullAnalysisResult | null) => {
    if (!analysisId || !result) return;
    fetch(`${API_BASE}/analysis/${analysisId}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    }).catch(() => {});
  };

  const applyAnalysisChange = (
    mutator: (prev: FullAnalysisResult) => FullAnalysisResult
  ) => {
    let nextResult: FullAnalysisResult | null = null;
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      nextResult = mutator(prev);
      return nextResult;
    });
    if (nextResult) {
      persistDraftResult(nextResult);
    }
  };

  const onStartRun = (run: RunRecord) => {
    setActiveRunId(run.id);
    setRuns((prev) => [run, ...prev].slice(0, 10));
  };

  const onUpdateRun = (runId: string, updates: Partial<RunRecord>) => {
    setRuns((prev) =>
      prev.map((run) => (run.id === runId ? { ...run, ...updates } : run))
    );
    if (updates.status && updates.status !== "running" && activeRunId === runId) {
      setActiveRunId(null);
    }
  };

  const onResolveRunningRuns = () => {
    const now = Date.now();
    setRuns((prev) =>
      prev.map((run) =>
        run.status === "running"
          ? {
              ...run,
              status: "failed",
              finishedAt: now,
              error: "手动结束：运行卡住",
            }
          : run
      )
    );
    setActiveRunId((prev) => {
      if (!prev) return prev;
      const current = runs.find((r) => r.id === prev);
      return current && current.status === "running" ? null : prev;
    });
  };

  const pushPlanUndo = (plan: FullAnalysisResult["learning_plan"]) => {
    setPlanHistory((prev) => [plan, ...prev].slice(0, 10));
  };

  const pushResumeUndo = (markdown: string) => {
    setResumeHistory((prev) => [markdown, ...prev].slice(0, 10));
  };

  const updateLearningPlan = (
    updater: (plan: FullAnalysisResult["learning_plan"]) => FullAnalysisResult["learning_plan"]
  ) => {
    applyAnalysisChange((prev) => {
      pushPlanUndo(prev.learning_plan);
      const nextPlan = updater(prev.learning_plan);
      return { ...prev, learning_plan: nextPlan };
    });
  };

  const undoLearningPlan = () => {
    setPlanHistory((prev) => {
      const [last, ...rest] = prev;
      if (!last) return prev;
      if (analysisResult) {
        applyAnalysisChange(() => ({ ...analysisResult, learning_plan: last }));
      }
      return rest;
    });
  };

  const restorePlanToBaseline = () => {
    if (!baselineResult) return;
    applyAnalysisChange((prev) => ({ ...prev, learning_plan: baselineResult.learning_plan }));
    setPlanHistory([]);
  };

  const updateResumeMarkdown = (markdown: string) => {
    applyAnalysisChange((prev) => {
      pushResumeUndo(prev.custom_resume_markdown);
      return { ...prev, custom_resume_markdown: markdown };
    });
  };

  const undoResumeMarkdown = () => {
    setResumeHistory((prev) => {
      const [last, ...rest] = prev;
      if (!last) return prev;
      if (analysisResult) {
        applyAnalysisChange(() => ({ ...analysisResult, custom_resume_markdown: last }));
      }
      return rest;
    });
  };

  const restoreResumeToBaseline = () => {
    if (!baselineResult) return;
    applyAnalysisChange((prev) => ({ ...prev, custom_resume_markdown: baselineResult.custom_resume_markdown }));
    setResumeHistory([]);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case "gaps":
        return <GapOverviewPage analysisResult={analysisResult} copy={copy} />;
      case "plan":
        return (
          <PlanBoardPage
            analysisResult={analysisResult}
            copy={copy}
            onUpdateLearningPlan={updateLearningPlan}
            onUndoLearningPlan={undoLearningPlan}
            onRestoreBaseline={restorePlanToBaseline}
          />
        );
      case "resume":
        return (
          <ResumeStudioPage
            analysisResult={analysisResult}
            copy={copy}
            onUpdateMarkdown={updateResumeMarkdown}
            onUndoMarkdown={undoResumeMarkdown}
            onRestoreBaseline={restoreResumeToBaseline}
          />
        );
      case "history":
        return (
          <HistoryPage
            analysisResult={analysisResult}
            analysisId={analysisId}
            copy={copy}
            onAnalysisResult={(result, id) => updateAnalysisContext(result, id)}
          />
        );
      case "prompts":
        return <PromptSettingsPage />;
      default:
        return (
          <AnalyzePage
            analysisResult={analysisResult}
            analysisId={analysisId}
            resumeText={resumeText}
            jdText={jdText}
            onResumeTextChange={setResumeText}
            onJdTextChange={setJdText}
            runs={runs}
            activeRunId={activeRunId}
            onStartRun={onStartRun}
            onUpdateRun={onUpdateRun}
            onResolveRunningRuns={onResolveRunningRuns}
            copy={copy}
            onAnalysisResult={(result, id) => {
              updateAnalysisContext(result, id);
              setActiveTab("gaps");
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              {copy.appTitle}
            </p>
            <h1 className="text-2xl font-bold">{copy.appSubtitle}</h1>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-600">
            {copy.badge}
          </span>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 px-6 pb-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  isActive
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="font-semibold">{copy.tabs[tab.id]}</span>
                <span className="ml-2 text-xs text-slate-500">{tab.description}</span>
              </button>
            );
          })}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition ${
                lang === "en"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
              }`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition ${
                lang === "zh"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
              }`}
              onClick={() => setLang("zh")}
            >
              中文
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{renderActivePage()}</main>
    </div>
  );
}

export default App;
