import { useEffect, useState } from "react";
import type { Copy } from "../i18n";
import type { FullAnalysisResult, LearningPlan, LearningTask } from "../types";

type Props = {
  analysisResult: FullAnalysisResult | null;
  copy: Copy;
  onUpdateLearningPlan: (updater: (plan: LearningPlan) => LearningPlan) => void;
  onUndoLearningPlan: () => void;
  onRestoreBaseline: () => void;
};

const formatWeeks = (weeks: number) => `${weeks} wk${weeks === 1 ? "" : "s"}`;

function PlanBoardPage({ analysisResult, copy, onUpdateLearningPlan, onUndoLearningPlan, onRestoreBaseline }: Props) {
  if (!analysisResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        {copy.plan.gated}
      </div>
    );
  }

  const phases = analysisResult.learning_plan.phases;
  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        {copy.plan.empty}
      </div>
    );
  }

  const [editMode, setEditMode] = useState(false);
  const [draftPlan, setDraftPlan] = useState<LearningPlan>(analysisResult.learning_plan);
  const [newPhaseName, setNewPhaseName] = useState<string>("");
  const [newPhaseDuration, setNewPhaseDuration] = useState<number>(4);
  const [newGoal, setNewGoal] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskHours, setNewTaskHours] = useState<number>(4);

  useEffect(() => {
    setDraftPlan(analysisResult.learning_plan);
  }, [analysisResult.learning_plan]);

  const handleSave = () => {
    onUpdateLearningPlan(() => draftPlan);
    setEditMode(false);
  };

  const addPhase = () => {
    if (!newPhaseName.trim()) return;
    const next = {
      name: newPhaseName.trim(),
      duration_weeks: newPhaseDuration,
      goals: newGoal.trim() ? [newGoal.trim()] : [],
      tasks: newTaskTitle.trim()
        ? [
            {
              title: newTaskTitle.trim(),
              estimated_hours: newTaskHours,
              resources: [],
            },
          ]
        : [],
    };
    setDraftPlan((prev) => ({ ...prev, phases: [...prev.phases, next] }));
    setNewPhaseName("");
    setNewPhaseDuration(4);
    setNewGoal("");
    setNewTaskTitle("");
    setNewTaskHours(4);
  };

  const updatePhase = (index: number, field: "name" | "duration_weeks", value: string | number) => {
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      nextPhases[index] = { ...nextPhases[index], [field]: value };
      return { ...prev, phases: nextPhases };
    });
  };

  const deletePhase = (index: number) => {
    setDraftPlan((prev) => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index),
    }));
  };

  const addGoal = (phaseIndex: number, goal: string) => {
    if (!goal.trim()) return;
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      const goals = [...nextPhases[phaseIndex].goals, goal.trim()];
      nextPhases[phaseIndex] = { ...nextPhases[phaseIndex], goals };
      return { ...prev, phases: nextPhases };
    });
  };

  const deleteGoal = (phaseIndex: number, goalIndex: number) => {
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      const goals = nextPhases[phaseIndex].goals.filter((_, i) => i !== goalIndex);
      nextPhases[phaseIndex] = { ...nextPhases[phaseIndex], goals };
      return { ...prev, phases: nextPhases };
    });
  };

  const addTask = (phaseIndex: number) => {
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      const tasks = [...nextPhases[phaseIndex].tasks, { title: "New Task", estimated_hours: 4, resources: [] }];
      nextPhases[phaseIndex] = { ...nextPhases[phaseIndex], tasks };
      return { ...prev, phases: nextPhases };
    });
  };

  const updateTask = (phaseIndex: number, taskIndex: number, updates: Partial<LearningTask>) => {
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      const nextTasks = [...nextPhases[phaseIndex].tasks];
      nextTasks[taskIndex] = { ...nextTasks[taskIndex], ...updates };
      nextPhases[phaseIndex] = { ...nextPhases[phaseIndex], tasks: nextTasks };
      return { ...prev, phases: nextPhases };
    });
  };

  const deleteTask = (phaseIndex: number, taskIndex: number) => {
    setDraftPlan((prev) => {
      const nextPhases = [...prev.phases];
      const nextTasks = nextPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
      nextPhases[phaseIndex] = { ...nextPhases[phaseIndex], tasks: nextTasks };
      return { ...prev, phases: nextPhases };
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "退出编辑" : "编辑 / 自定义"}
        </button>
        {editMode && (
          <>
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleSave}
            >
              保存学习计划
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setDraftPlan(analysisResult.learning_plan)}
            >
              还原为 LLM 结果
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={onUndoLearningPlan}
            >
              撤回一步
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => {
                onRestoreBaseline();
                setDraftPlan(analysisResult.learning_plan);
              }}
            >
              恢复基线
            </button>
          </>
        )}
      </div>

      {editMode && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold">新增阶段</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              placeholder="阶段名称"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="w-28 rounded-lg border border-slate-200 px-3 py-1 text-sm"
              value={newPhaseDuration}
              onChange={(e) => setNewPhaseDuration(Number(e.target.value) || 1)}
            />
            <input
              className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-1 text-sm"
              placeholder="初始目标（可选）"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
            <input
              className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-1 text-sm"
              placeholder="初始任务名称（可选）"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="w-24 rounded-lg border border-slate-200 px-3 py-1 text-sm"
              value={newTaskHours}
              onChange={(e) => setNewTaskHours(Number(e.target.value) || 1)}
            />
            <button
              type="button"
              className="rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white"
              onClick={addPhase}
            >
              添加阶段
            </button>
          </div>
        </div>
      )}

      {(editMode ? draftPlan.phases : phases).map((phase, index) => (
        <article
          key={phase.name}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {copy.plan.phase} {index + 1}
              </p>
              {editMode ? (
                <input
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-1 text-lg font-semibold"
                  value={phase.name}
                  onChange={(e) => updatePhase(index, "name", e.target.value)}
                />
              ) : (
                <h3 className="text-xl font-semibold">{phase.name}</h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-1 text-sm"
                  value={phase.duration_weeks}
                  onChange={(e) => updatePhase(index, "duration_weeks", Number(e.target.value) || 1)}
                />
              ) : (
                <span className="rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700">
                  {formatWeeks(phase.duration_weeks)}
                </span>
              )}
              {editMode && (
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                  onClick={() => deletePhase(index)}
                >
                  删除
                </button>
              )}
            </div>
          </div>
          {phase.goals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {copy.plan.goals}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {phase.goals.map((goal, goalIndex) => (
                  <li key={goal + goalIndex} className="flex items-start gap-2">
                    <span className="flex-1">{goal}</span>
                    {editMode && (
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600"
                        onClick={() => deleteGoal(index, goalIndex)}
                      >
                        删除
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {editMode && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1 text-sm"
                    placeholder="新增目标"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGoal(index, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {phase.tasks.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {copy.plan.tasks}
              </p>
              <div className="mt-2 grid gap-3">
                {phase.tasks.map((task, taskIndex) => (
                  <TaskCard
                    key={`${task.title}-${taskIndex}`}
                    task={task}
                    copy={copy}
                    editMode={editMode}
                    onChange={(updates) => updateTask(index, taskIndex, updates)}
                    onDelete={() => deleteTask(index, taskIndex)}
                  />
                ))}
              </div>
              {editMode && (
                <button
                  type="button"
                  className="mt-3 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600"
                  onClick={() => addTask(index)}
                >
                  添加任务
                </button>
              )}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

const TaskCard = ({
  task,
  copy,
  editMode,
  onChange,
  onDelete,
}: {
  task: LearningTask;
  copy: Copy;
  editMode: boolean;
  onChange: (updates: Partial<LearningTask>) => void;
  onDelete: () => void;
}) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {editMode ? (
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1 text-sm"
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      ) : (
        <p className="font-semibold">{task.title}</p>
      )}
      <div className="flex items-center gap-2">
        {editMode ? (
          <input
            type="number"
            min={1}
            className="w-20 rounded-lg border border-slate-200 px-3 py-1 text-xs"
            value={task.estimated_hours}
            onChange={(e) => onChange({ estimated_hours: Number(e.target.value) || 1 })}
          />
        ) : (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {task.estimated_hours} {copy.plan.hours}
          </span>
        )}
        {editMode && (
          <button
            type="button"
            className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
            onClick={onDelete}
          >
            删除
          </button>
        )}
      </div>
    </div>
    {task.resources.length > 0 && !editMode && (
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {task.resources.map((resource) => (
          <li key={resource.url}>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 underline"
            >
              {resource.title}
            </a>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default PlanBoardPage;
