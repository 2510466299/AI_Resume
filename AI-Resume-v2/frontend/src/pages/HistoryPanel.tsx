import type { HistoryItem } from "../types";

type Props = {
  items: HistoryItem[];
  onSelect: (id: string) => void;
};

export default function HistoryPanel({ items, onSelect }: Props) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">历史记录</h3>
        <span className="text-xs text-slate-500">最近 50 次</span>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-auto">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">暂无记录</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:border-indigo-300 transition"
            >
              <p className="text-sm font-semibold text-slate-900">
                {item.summary || "未填写概述"}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
