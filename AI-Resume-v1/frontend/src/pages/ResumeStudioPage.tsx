import { useCallback, useEffect, useMemo, useState } from "react";
import type { Copy } from "../i18n";
import type { FullAnalysisResult, ResumeMapping } from "../types";

type Props = {
  analysisResult: FullAnalysisResult | null;
  copy: Copy;
  onUpdateMarkdown: (value: string) => void;
  onUndoMarkdown: () => void;
  onRestoreBaseline: () => void;
};

const coverageTokens = {
  full: { label: "Full", color: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  none: { label: "Missing", color: "bg-rose-100 text-rose-700" },
};

function ResumeStudioPage({ analysisResult, copy, onUpdateMarkdown, onUndoMarkdown, onRestoreBaseline }: Props) {
  const mappingIndex = useMemo(() => {
    if (!analysisResult) return new Map<string, ResumeMapping>();
    return new Map(
      analysisResult.jd_mapping_matrix.resume_mapping.map((item) => [
        item.jd_point_id,
        item,
      ])
    );
  }, [analysisResult]);

  const [editingMarkdown, setEditingMarkdown] = useState<string>(analysisResult?.custom_resume_markdown ?? "");
  const [originalMarkdown, setOriginalMarkdown] = useState<string>(analysisResult?.custom_resume_markdown ?? "");

  useEffect(() => {
    if (analysisResult) {
      setEditingMarkdown(analysisResult.custom_resume_markdown);
      setOriginalMarkdown(analysisResult.custom_resume_markdown);
    }
  }, [analysisResult?.custom_resume_markdown]);

  const handleExport = useCallback(() => {
    if (!analysisResult) return;
    const blob = new Blob([analysisResult.custom_resume_markdown], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-resume.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [analysisResult]);

  if (!analysisResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        {copy.resume.gated}
      </div>
    );
  }

  const { jd_mapping_matrix, custom_resume_markdown } = analysisResult;

  const handleSaveMarkdown = () => {
    onUpdateMarkdown(editingMarkdown);
    setOriginalMarkdown(editingMarkdown);
  };

  const handleResetMarkdown = () => {
    setEditingMarkdown(originalMarkdown || custom_resume_markdown);
  };

  const handleRestoreBaseline = () => {
    onRestoreBaseline();
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{copy.resume.mappingTitle}</h3>
            <p className="text-sm text-slate-500">{copy.resume.mappingDesc}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {jd_mapping_matrix.jd_points.length} {copy.resume.points}
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {jd_mapping_matrix.jd_points.map((point) => {
            const mapping = mappingIndex.get(point.id);
            const token = coverageTokens[mapping?.coverage ?? "none"];
            return (
              <article
                key={point.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {point.category}
                    </p>
                    <h4 className="text-lg font-semibold">{point.text}</h4>
                    <p className="text-xs text-slate-500">
                      {copy.resume.required}: {point.required_level}
                      {point.mandatory ? ` · ${copy.resume.mustHave}` : ` · ${copy.resume.niceToHave}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${token.color}`}>
                    {copy.resume.coverage[mapping?.coverage ?? "none"] ?? token.label}
                  </span>
                </div>
                {mapping && mapping.match_experiences.length > 0 && (
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {mapping.match_experiences.map((match) => (
                      <li key={match.experience_id}>
                        <span className="font-mono text-xs text-slate-500">
                          {match.experience_id}:
                        </span>
                        <span className="ml-2">{match.evidence}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
          {jd_mapping_matrix.jd_points.length === 0 && (
            <p className="text-sm text-slate-500">{copy.resume.jdMissing}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold">{copy.resume.previewTitle}</h3>
            <p className="text-sm text-slate-500">{copy.resume.previewDesc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
            >
              {copy.resume.export}
            </button>
            <button
              type="button"
              onClick={onUndoMarkdown}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700"
            >
              撤回一步
            </button>
            <button
              type="button"
              onClick={handleRestoreBaseline}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700"
            >
              恢复基线
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-6">
          <textarea
            className="min-h-[240px] rounded-xl border border-slate-700 bg-slate-950/70 p-4 font-mono text-sm text-slate-50 shadow-inner"
            value={editingMarkdown}
            onChange={(e) => setEditingMarkdown(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
              onClick={handleSaveMarkdown}
            >
              保存自定义简历
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700"
              onClick={handleResetMarkdown}
            >
              重置为上一版
            </button>
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-slate-950/90 p-6 text-sm text-slate-50">
            {custom_resume_markdown}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default ResumeStudioPage;
