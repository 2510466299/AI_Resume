import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config";
import { usePersistentState } from "../hooks/usePersistentState";
import type { Copy } from "../i18n";
import type { FullAnalysisResult, Gap, RunRecord } from "../types";

const stripCodeFence = (text: string) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const tryParseJSON = (text: string) => {
  try {
    return JSON.parse(stripCodeFence(text));
  } catch (err) {
    console.warn("Failed to parse SSE JSON", err);
    return null;
  }
};

const formatStageSummary = (stage: string, raw: string): string => {
  const parsed = tryParseJSON(raw);
  switch (stage) {
    case "parse_profile": {
      const resume = parsed?.resume_profile ?? {};
      const job = parsed?.job_profile ?? {};
      const skills = (resume.skills ?? [])
        .slice(0, 3)
        .map((item: any) => item.name)
        .filter(Boolean)
        .join("、");
      return `解析候选人「${resume.title || "未知职位"}」，约 ${
        resume.years_experience ?? 0
      } 年经验，核心技能：${skills || "未提供"}。目标岗位：「${
        job.title || "未知岗位"
      }」，期望经验 ${job.years_experience ?? 0} 年。`;
    }
    case "gap_analysis": {
      const gaps = parsed?.gap_analysis?.gaps ?? [];
      const highlight = gaps
        .slice(0, 2)
        .map(
          (gap: any) => `${gap.name}(优先级 ${(gap.priority * 100 || 0).toFixed(0)}%)`
        )
        .join("，");
      return `共识别 ${gaps.length} 个差距：${highlight || "暂无显著差距"}`;
    }
    case "learning_plan": {
      const phases = parsed?.learning_plan?.phases ?? [];
      const first = phases[0];
      const goalText = first?.goals?.slice(0, 2).join("、");
      return `生成 ${phases.length} 个学习阶段，阶段一「${
        first?.name || "未命名"
      }」目标：${goalText || "待补充"}`;
    }
    case "custom_resume": {
      const cleaned = stripCodeFence(raw);
      return `定制简历已生成，文本长度约 ${cleaned.length} 字符，主要内容已对齐 JD 重点。`;
    }
    default:
      return `[${stage}] ${stripCodeFence(raw).slice(0, 200)}`;
  }
};

const DEFAULT_MODEL_SETTINGS = {
  llm_api_key: "",
  llm_api_base: "",
  llm_model: "deepseek-chat",
};

type ModelSettings = typeof DEFAULT_MODEL_SETTINGS;

type LLMConfigResponse = {
  default_model: string;
  default_api_base: string;
  has_default_key: boolean;
  masked_key?: string | null;
};

type Props = {
  analysisResult: FullAnalysisResult | null;
  analysisId: string | null;
  resumeText: string;
  jdText: string;
  onResumeTextChange: (value: string) => void;
  onJdTextChange: (value: string) => void;
  runs: RunRecord[];
  activeRunId: string | null;
  onStartRun: (run: RunRecord) => void;
  onUpdateRun: (runId: string, updates: Partial<RunRecord>) => void;
  onResolveRunningRuns: () => void;
  copy: Copy;
  onAnalysisResult: (result: FullAnalysisResult, analysisId?: string | null) => void;
};

function AnalyzePage({
  analysisResult,
  analysisId,
  resumeText,
  jdText,
  onResumeTextChange,
  onJdTextChange,
  runs,
  activeRunId,
  onStartRun,
  onUpdateRun,
  onResolveRunningRuns,
  copy,
  onAnalysisResult,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultConfig, setDefaultConfig] = useState<LLMConfigResponse | null>(null);
  const [modelSettings, setModelSettings] = usePersistentState<ModelSettings>(
    "modelSettings",
    DEFAULT_MODEL_SETTINGS
  );
  const [useDefaultModel, setUseDefaultModel] = usePersistentState("useDefaultModel", true);
  const [displayLogs, setDisplayLogs] = usePersistentState<Record<string, string[]>>(
    "displayLogs",
    {}
  );
  const [typingQueue, setTypingQueue] = useState<Array<{ runId: string; text: string }>>([]);
  const typingRef = useRef(false);
  const [logRunId, setLogRunId] = useState<string | null>(null);

  const hasRunning = runs.some((r) => r.status === "running");

  useEffect(() => {
    fetch(`${API_BASE}/llm/config`)
      .then((res) => res.json())
      .then((data: LLMConfigResponse) => {
        setDefaultConfig(data);
        if (!data.has_default_key) {
          setUseDefaultModel(false);
        } else if (!modelSettings.llm_model) {
          setModelSettings((prev) => ({ ...prev, llm_model: data.default_model }));
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!logRunId && runs.length > 0) {
      setLogRunId(runs[0].id);
    }
  }, [runs, logRunId]);

  useEffect(() => {
    if (typingRef.current || typingQueue.length === 0) return;
    typingRef.current = true;
    const { runId, text } = typingQueue[0];
    setDisplayLogs((prev) => ({
      ...prev,
      [runId]: [...(prev[runId] ?? []), ""],
    }));
    let pos = 0;
    const interval = setInterval(() => {
      pos += 1;
      setDisplayLogs((prev) => {
        const logs = [...(prev[runId] ?? [])];
        logs[logs.length - 1] = text.slice(0, pos);
        return { ...prev, [runId]: logs };
      });
      if (pos >= text.length) {
        clearInterval(interval);
        typingRef.current = false;
        setTypingQueue((queue) => queue.slice(1));
      }
    }, 15);
    return () => clearInterval(interval);
  }, [typingQueue, setDisplayLogs]);

  const enqueueLog = (runId: string, text: string) => {
    if (!text) return;
    setTypingQueue((prev) => [...prev, { runId, text }]);
  };

  const gapSummary = useMemo<Gap[]>(() => {
    if (!analysisResult) return [];
    return [...analysisResult.gap_analysis.gaps]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [analysisResult]);

  const statusBadge = (status: RunRecord["status"], copy: Copy) => {
    const map: Record<RunRecord["status"], { text: string; color: string }> = {
      running: { text: copy.status.state.running, color: "bg-amber-100 text-amber-700" },
      succeeded: { text: copy.status.state.success, color: "bg-emerald-100 text-emerald-700" },
      failed: { text: copy.status.state.failed, color: "bg-rose-100 text-rose-700" },
    };
    const { text, color } = map[status];
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{text}</span>;
  };

  const renderRun = (run?: RunRecord) => {
    if (!run) return null;
    return (
      <div className="space-y-1 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            {copy.status.runId}: {run.id}
          </p>
          {statusBadge(run.status, copy)}
        </div>
        <p className="text-xs text-slate-600">
          {copy.status.startedAt}: {new Date(run.startedAt).toLocaleTimeString()} · {copy.status.analysisId}: {run.analysisId ?? copy.shared.notGenerated}
        </p>
        {run.finishedAt && (
          <p className="text-xs text-slate-500">
            {copy.status.finishedAt}: {new Date(run.finishedAt).toLocaleTimeString()}
          </p>
        )}
        {run.error && <p className="text-xs text-rose-600">{run.error}</p>}
      </div>
    );
  };

  const handleAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    if (hasRunning) return;
    const runId = crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`;
    setLogRunId(runId);
    setDisplayLogs((prev) => ({ ...prev, [runId]: [] }));
    onStartRun({ id: runId, status: "running", startedAt: Date.now() });
    setLoading(true);
    setError(null);
    try {
      await streamAnalysis(runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      enqueueLog(runId, `分析失败：${message}`);
      onUpdateRun(runId, {
        status: "failed",
        finishedAt: Date.now(),
        error: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const streamAnalysis = async (runId: string) => {
    const body: Record<string, unknown> = {
      resume_text: resumeText,
      jd_text: jdText,
      client_run_id: runId,
    };
    if (!useDefaultModel) {
      if (modelSettings.llm_model) body.llm_model = modelSettings.llm_model;
      if (modelSettings.llm_api_base) body.llm_api_base = modelSettings.llm_api_base;
      if (modelSettings.llm_api_key) body.llm_api_key = modelSettings.llm_api_key;
    }
    const response = await fetch(`${API_BASE}/analyze/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok || !response.body) {
      const message = await response.text();
      throw new Error(message || "Streaming request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processSseChunk(runId, chunk.trim());
        boundary = buffer.indexOf("\n\n");
      }
    }
  };

  const processSseChunk = (runId: string, chunk: string) => {
    if (!chunk) return;
    const lines = chunk.split("\n");
    let eventName = "message";
    let dataPayload = "";
    lines.forEach((line) => {
      if (line.startsWith("event:")) {
        eventName = line.replace("event:", "").trim();
      } else if (line.startsWith("data:")) {
        dataPayload += line.replace("data:", "").trim();
      }
    });
    if (!dataPayload) return;
    const data = JSON.parse(dataPayload);

    switch (eventName) {
      case "llm_output":
        enqueueLog(runId, formatStageSummary(data.stage, data.content));
        break;
      case "result": {
        const resultData = data as { analysis_id?: string | null; result: FullAnalysisResult };
        enqueueLog(runId, "分析完成，正在保存结果...");
        onAnalysisResult(resultData.result, resultData.analysis_id ?? null);
        onUpdateRun(runId, {
          status: "succeeded",
          finishedAt: Date.now(),
          analysisId: resultData.analysis_id ?? null,
        });
        break;
      }
      case "error":
        setError(data.message ?? "LLM 调用失败");
        enqueueLog(runId, `错误：${data.message ?? "LLM 调用失败"}`);
        onUpdateRun(runId, {
          status: "failed",
          finishedAt: Date.now(),
          error: data.message ?? "LLM 调用失败",
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{copy.analyze.heading}</h2>
          {(loading || hasRunning) && (
            <span className="flex items-center gap-2 text-sm text-brand-700">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              {copy.shared.loading}
            </span>
          )}
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAnalyze}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">{copy.analyze.resumeLabel}</span>
            <textarea
              className="h-72 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-brand-500 focus:outline-none"
              value={resumeText}
              onChange={(e) => onResumeTextChange(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">{copy.analyze.jdLabel}</span>
            <textarea
              className="h-72 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-brand-500 focus:outline-none"
              value={jdText}
              onChange={(e) => onJdTextChange(e.target.value)}
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={loading || hasRunning}
              className="rounded-full bg-brand-600 px-5 py-2 text-white transition hover:bg-brand-500 disabled:opacity-60"
            >
              {loading ? copy.shared.loading : copy.analyze.button}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">模型设置</h3>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="model-source"
              checked={useDefaultModel}
              onChange={() => setUseDefaultModel(true)}
              disabled={!defaultConfig?.has_default_key}
            />
            使用默认模型
            {defaultConfig?.masked_key && (
              <span className="text-xs text-slate-500">默认 Key: {defaultConfig.masked_key}</span>
            )}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="model-source"
              checked={!useDefaultModel}
              onChange={() => setUseDefaultModel(false)}
            />
            自定义模型
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>模型名称</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-1"
              value={modelSettings.llm_model}
              disabled={useDefaultModel}
              onChange={(e) =>
                setModelSettings((prev) => ({ ...prev, llm_model: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>API Endpoint</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-1"
              value={modelSettings.llm_api_base}
              disabled={useDefaultModel}
              onChange={(e) =>
                setModelSettings((prev) => ({ ...prev, llm_api_base: e.target.value }))
              }
              placeholder="https://api.deepseek.com/chat/completions"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>API Key</span>
            <input
              type="password"
              className="rounded-lg border border-slate-200 px-3 py-1"
              value={modelSettings.llm_api_key}
              disabled={useDefaultModel}
              onChange={(e) =>
                setModelSettings((prev) => ({ ...prev, llm_api_key: e.target.value }))
              }
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          选择“默认模型”即使用 DeepSeek V3（服务器端维护的 Key），选“自定义模型”可输入自己的 Key 与 Endpoint。
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{copy.status.panelTitle}</h3>
            <p className="text-sm text-slate-500">{copy.status.panelDesc}</p>
          </div>
        </div>
        {activeRunId && (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
            {renderRun(runs.find((r) => r.id === activeRunId) ?? runs[0])}
          </div>
        )}
        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {copy.status.historyTitle}
          </p>
          {hasRunning && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              <span>检测到运行中任务，如长时间无响应可强制结束。</span>
              <button
                type="button"
                className="rounded-full border border-amber-400 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-100"
                onClick={onResolveRunningRuns}
              >
                手动结束
              </button>
            </div>
          )}
          <div className="mt-2 space-y-2">
            {runs.slice(0, 4).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-sm">
                <div>
                  <p className="font-semibold">{copy.status.runId}: {run.id}</p>
                  <p className="text-xs text-slate-500">
                    {copy.status.startedAt}: {new Date(run.startedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {copy.status.analysisId}: {run.analysisId ?? copy.shared.notGenerated}
                  </p>
                </div>
                {statusBadge(run.status, copy)}
              </div>
            ))}
            {runs.length === 0 && (
              <p className="text-sm text-slate-500">{copy.history.empty}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">实时流式输出</h3>
          {runs.length > 0 && (
            <select
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              value={logRunId ?? ""}
              onChange={(e) => setLogRunId(e.target.value)}
            >
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-3 min-h-[200px] rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs text-slate-700">
          {(displayLogs[logRunId ?? ""] ?? []).length === 0 ? (
            <p className="text-slate-400">暂无流式输出。触发分析后可查看模型实时返回内容。</p>
          ) : (
            <ul className="space-y-1">
              {(displayLogs[logRunId ?? ""] ?? []).map((line, idx) => (
                <li key={`${logRunId}-${idx}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {analysisResult && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">LLM Snapshot</h3>
            <div className="text-xs text-slate-500">
              {copy.shared.analysisId}:
              <code className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-mono">
                {analysisId ?? copy.shared.notGenerated}
              </code>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-brand-50 p-4">
              <p className="text-sm text-slate-500">{copy.shared.gapCount}</p>
              <p className="text-3xl font-bold">
                {analysisResult.gap_analysis.gaps.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-emerald-50 p-4">
              <p className="text-sm text-slate-500">{copy.shared.learningPhases}</p>
              <p className="text-3xl font-bold">
                {analysisResult.learning_plan.phases.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-amber-50 p-4">
              <p className="text-sm text-slate-500">{copy.shared.jdPoints}</p>
              <p className="text-3xl font-bold">
                {analysisResult.jd_mapping_matrix.jd_points.length}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {copy.shared.topGaps}
            </h4>
            {gapSummary.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.shared.noGaps}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {gapSummary.map((gap) => (
                  <li
                    key={gap.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{gap.name}</p>
                        <p className="text-sm text-slate-500">{gap.reason}</p>
                      </div>
                      <span className="text-sm font-mono text-brand-600">
                        Priority {(gap.priority * 100).toFixed(0)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default AnalyzePage;
