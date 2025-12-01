import type { Gap } from "../types";

type Props = {
  gaps: Gap[] | undefined;
};

const severity = (priority: number) => {
  if (priority > 0.7) return { label: "High", tone: "rose" as const };
  if (priority >= 0.4) return { label: "Medium", tone: "amber" as const };
  return { label: "Low", tone: "emerald" as const };
};

const toneClass: Record<"rose" | "amber" | "emerald", string> = {
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

export default function GapOverview({ gaps }: Props) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="glass-card p-6 text-slate-500 text-sm">
        暂无 Gap 数据，先完成一次分析。
      </div>
    );
  }
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {gaps.map((gap) => {
        const sev = severity(gap.priority);
        return (
          <div key={gap.skill} className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">技能</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {gap.skill}
                </h3>
              </div>
              <span className={`pill ${toneClass[sev.tone]}`}>
                {sev.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
              <div>
                <p className="text-slate-400">重要度</p>
                <p className="font-semibold text-slate-900">
                  {(gap.importance * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400">可达性</p>
                <p className="font-semibold text-slate-900">
                  {(gap.attainability * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400">优先级</p>
                <p className="font-semibold text-slate-900">
                  {(gap.priority * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700">{gap.reason}</p>
            {gap.recommendation ? (
              <p className="text-sm text-indigo-600">
                建议：{gap.recommendation}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
