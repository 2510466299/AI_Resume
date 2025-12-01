import { useEffect, useRef, useState } from "react";
import type { LearningPlan, LearningPhase, LearningTask } from "../types";

type Props = {
  plan: LearningPlan | null;
  baseline: LearningPlan | null;
  onChange: (plan: LearningPlan) => void;
};

type Snapshot = LearningPlan | null;

export default function PlanBoard({ plan, baseline, onChange }: Props) {
  const [localPlan, setLocalPlan] = useState<LearningPlan | null>(plan);
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  useEffect(() => {
    setLocalPlan(plan);
    history.current = [];
    future.current = [];
  }, [plan]);

  const pushHistory = (snap: Snapshot) => {
    history.current.push(JSON.parse(JSON.stringify(snap)));
    if (history.current.length > 20) history.current.shift();
    future.current = [];
  };

  const handleChange = (next: LearningPlan) => {
    pushHistory(localPlan);
    setLocalPlan(next);
    onChange(next);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(localPlan);
    setLocalPlan(prev);
    if (prev) onChange(prev);
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(localPlan);
    setLocalPlan(next);
    onChange(next);
  };

  const reset = () => {
    if (!baseline) return;
    setLocalPlan(baseline);
    history.current = [];
    future.current = [];
    onChange(baseline);
  };

  if (!localPlan || localPlan.phases.length === 0) {
    return (
      <div className="glass-card p-6 text-slate-500 text-sm">
        暂无学习计划，可先执行分析。
      </div>
    );
  }

  const updateTask = (
    phaseIdx: number,
    taskIdx: number,
    partial: Partial<LearningTask>
  ) => {
    const draft = JSON.parse(JSON.stringify(localPlan)) as LearningPlan;
    Object.assign(draft.phases[phaseIdx].tasks[taskIdx], partial);
    handleChange(draft);
  };

  const updatePhase = (idx: number, partial: Partial<LearningPhase>) => {
    const draft = JSON.parse(JSON.stringify(localPlan)) as LearningPlan;
    Object.assign(draft.phases[idx], partial);
    handleChange(draft);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            学习计划看板
          </h3>
          <p className="text-xs text-slate-500">
            编辑后自动保存草稿，支持 Undo / Redo。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={undo}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
          >
            撤回
          </button>
          <button
            onClick={redo}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
          >
            重做
          </button>
          <button
            onClick={reset}
            className="rounded-md bg-slate-900 text-white px-3 py-1.5 text-xs"
          >
            恢复基线
          </button>
        </div>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4 min-w-[640px]">
          {localPlan.phases.map((phase, idx) => (
            <div key={phase.name} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  value={phase.name}
                  onChange={(e) =>
                    updatePhase(idx, { name: e.target.value || "Phase" })
                  }
                  className="text-base font-semibold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                />
                {phase.duration_weeks ? (
                  <span className="pill bg-indigo-50 text-indigo-600">
                    {phase.duration_weeks} 周
                  </span>
                ) : null}
              </div>
              <textarea
                value={phase.goal || ""}
                onChange={(e) => updatePhase(idx, { goal: e.target.value })}
                placeholder="阶段目标"
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              />
              <div className="space-y-3">
                {phase.tasks.map((task, taskIdx) => (
                  <div
                    key={`${task.title}-${taskIdx}`}
                    className="rounded-md border border-slate-100 bg-slate-50 p-3 space-y-2"
                  >
                    <input
                      value={task.title}
                      onChange={(e) =>
                        updateTask(idx, taskIdx, {
                          title: e.target.value,
                        })
                      }
                      className="w-full text-sm font-semibold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                    <textarea
                      value={task.description || ""}
                      onChange={(e) =>
                        updateTask(idx, taskIdx, {
                          description: e.target.value,
                        })
                      }
                      className="w-full text-sm text-slate-700 rounded-md border border-slate-200 bg-white p-2 focus:border-indigo-500 focus:outline-none"
                      placeholder="任务描述与交付"
                    />
                    {task.resources?.length ? (
                      <div className="space-y-1">
                        {task.resources.map((res, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-between text-xs text-slate-600"
                          >
                            <span>{res.title}</span>
                            {res.link ? (
                              <a
                                href={res.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline"
                              >
                                资源
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
