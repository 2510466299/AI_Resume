import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import type { PromptTemplate } from "../types";

const PromptSettingsPage = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/prompts`);
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as PromptTemplate[];
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSave = async (name: string, content: string) => {
    setSaving((prev) => ({ ...prev, [name]: true }));
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/prompts/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error(await response.text());
      const updated = (await response.json()) as PromptTemplate;
      setPrompts((prev) => prev.map((p) => (p.name === name ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving((prev) => ({ ...prev, [name]: false }));
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        正在加载提示词...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {prompts.map((prompt) => (
        <article key={prompt.name} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold">{prompt.description}</h3>
            <p className="text-xs text-slate-500">占位符：{prompt.placeholders.join(", ")}</p>
          </div>
          <textarea
            className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm"
            value={prompt.content}
            onChange={(e) =>
              setPrompts((prev) =>
                prev.map((item) =>
                  item.name === prompt.name ? { ...item, content: e.target.value } : item
                )
              )
            }
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => handleSave(prompt.name, prompt.content)}
              disabled={saving[prompt.name]}
            >
              {saving[prompt.name] ? "保存中..." : "保存提示词"}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};

export default PromptSettingsPage;
