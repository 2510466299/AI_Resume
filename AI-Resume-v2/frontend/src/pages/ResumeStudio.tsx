import ReactMarkdown from "react-markdown";
import type { JDMappingMatrix } from "../types";

type Props = {
  mapping: JDMappingMatrix | undefined;
  markdown: string;
  onChange: (val: string) => void;
  onRegenerate: () => void;
};

const badgeClass: Record<string, string> = {
  Full: "bg-emerald-50 text-emerald-600",
  Partial: "bg-amber-50 text-amber-600",
  None: "bg-rose-50 text-rose-600",
};

export default function ResumeStudio({
  mapping,
  markdown,
  onChange,
  onRegenerate,
}: Props) {
  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="glass-card p-4 lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">覆盖矩阵</h3>
            <p className="text-xs text-slate-500">
              高亮 JD 要点与简历证据的匹配度。
            </p>
          </div>
          <button
            onClick={onRegenerate}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
          >
            重新生成
          </button>
        </div>
        <div className="space-y-3 max-h-[520px] overflow-auto">
          {mapping?.entries?.length ? (
            mapping.entries.map((entry) => (
              <div
                key={entry.jd_item}
                className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.jd_item}
                  </p>
                  <span className={`pill ${badgeClass[entry.coverage]}`}>
                    {entry.coverage}
                  </span>
                </div>
                {entry.evidence?.length ? (
                  <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                    {entry.evidence.map((ev, idx) => (
                      <li key={idx}>
                        {ev.experience_title} · {ev.proof}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {entry.recommendation ? (
                  <p className="text-xs text-indigo-600">
                    建议：{entry.recommendation}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">暂无数据</p>
          )}
        </div>
      </div>

      <div className="glass-card p-4 lg:col-span-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">定制简历</h3>
          <span className="text-xs text-slate-500">
            Markdown 编辑 + 实时预览
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <textarea
            value={markdown}
            onChange={(e) => onChange(e.target.value)}
            className="h-[520px] w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-mono text-slate-800 focus:border-indigo-500 focus:outline-none"
          />
          <div className="h-[520px] overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3 prose prose-sm max-w-none">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
