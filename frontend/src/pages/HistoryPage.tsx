import { FormEvent, useMemo, useState } from "react";
import { API_BASE } from "../config";
import type { Copy } from "../i18n";
import type { AnalyzeResponse, FullAnalysisResult } from "../types";

type Props = {
  analysisResult: FullAnalysisResult | null;
  analysisId: string | null;
  copy: Copy;
  onAnalysisResult: (result: FullAnalysisResult, analysisId?: string | null) => void;
};

function HistoryPage({ analysisResult, analysisId, copy, onAnalysisResult }: Props) {
  const [inputId, setInputId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!analysisResult) return null;
    return {
      resumeTitle: analysisResult.resume_profile.title,
      jobTitle: analysisResult.job_profile.title,
      gaps: analysisResult.gap_analysis.gaps.length,
      phases: analysisResult.learning_plan.phases.length,
    };
  }, [analysisResult]);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inputId.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(
        `${API_BASE}/history/${encodeURIComponent(trimmed)}`
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to fetch history");
      }
      const data = (await response.json()) as AnalyzeResponse;
      onAnalysisResult(data.draft_result ?? data.result, data.analysis_id ?? trimmed);
      setStatus(`已载入分析 ${data.analysis_id ?? trimmed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{copy.history.title}</h2>
            <p className="text-sm text-slate-500">{copy.history.desc}</p>
          </div>
          <code className="rounded bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
            {copy.history.currentId}: {analysisId ?? copy.shared.notGenerated}
          </code>
        </div>
        <form className="mt-4 flex flex-col gap-4 md:flex-row" onSubmit={handleLookup}>
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder={copy.history.placeholder}
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-600 px-5 py-2 text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {loading ? copy.history.loading : copy.history.load}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {status && !error && (
          <p className="mt-3 text-sm text-emerald-600">{status}</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">{copy.history.contextTitle}</h3>
        {!summary ? (
          <p className="mt-2 text-sm text-slate-500">{copy.history.empty}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {copy.history.resumeTitle}
              </p>
              <p className="text-lg font-semibold">{summary.resumeTitle}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                {copy.history.jobTitle}
              </p>
              <p className="text-lg font-semibold">{summary.jobTitle}</p>
            </div>
            <div className="grid gap-3">
              <Snapshot label="Gaps" value={summary.gaps} />
              <Snapshot label="Phases" value={summary.phases} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const Snapshot = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default HistoryPage;
