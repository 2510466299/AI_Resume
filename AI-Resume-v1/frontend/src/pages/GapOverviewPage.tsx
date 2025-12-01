import type { Copy } from "../i18n";
import type { FullAnalysisResult } from "../types";

type Props = {
  analysisResult: FullAnalysisResult | null;
  copy: Copy;
};

const classifyPriority = (value: number) => {
  if (value >= 0.7) return { label: "High", color: "bg-rose-100 text-rose-700" };
  if (value >= 0.4) return { label: "Medium", color: "bg-amber-100 text-amber-700" };
  return { label: "Low", color: "bg-emerald-100 text-emerald-700" };
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

function GapOverviewPage({ analysisResult, copy }: Props) {
  if (!analysisResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        {copy.gaps.gated}
      </div>
    );
  }

  const gaps = analysisResult.gap_analysis.gaps;
  if (gaps.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        🎉 {copy.gaps.empty}
      </div>
    );
  }

  const summary = gaps.reduce(
    (acc, gap) => {
      if (gap.priority >= 0.7) acc.high += 1;
      else if (gap.priority >= 0.4) acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{copy.gaps.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{copy.gaps.desc}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label={copy.gaps.total} value={gaps.length.toString()} />
          <SummaryCard label={copy.gaps.high} value={summary.high.toString()} />
          <SummaryCard label={copy.gaps.medium} value={summary.medium.toString()} />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">{copy.gaps.title}</th>
              <th className="px-6 py-3">{copy.gaps.importance}</th>
              <th className="px-6 py-3">{copy.gaps.attainability}</th>
              <th className="px-6 py-3">{copy.gaps.priority}</th>
              <th className="px-6 py-3">{copy.gaps.signal}</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap) => {
              const badge = classifyPriority(gap.priority);
              return (
                <tr key={gap.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{gap.name}</p>
                    <p className="text-xs text-slate-500">{gap.reason}</p>
                  </td>
                  <td className="px-6 py-4 font-mono">{percent(gap.importance)}</td>
                  <td className="px-6 py-4 font-mono">{percent(gap.attainability)}</td>
                  <td className="px-6 py-4 font-mono">{percent(gap.priority)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

export default GapOverviewPage;
