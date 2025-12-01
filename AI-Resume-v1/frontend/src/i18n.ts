export type Lang = "en" | "zh";

type TabCopy = {
  analyze: string;
  gaps: string;
  plan: string;
  resume: string;
  history: string;
  prompts: string;
};

export type Copy = {
  appTitle: string;
  appSubtitle: string;
  badge: string;
  tabs: TabCopy;
  shared: {
    loading: string;
    analysisId: string;
    notGenerated: string;
    gapCount: string;
    learningPhases: string;
    jdPoints: string;
    topGaps: string;
    noGaps: string;
  };
  analyze: {
    heading: string;
    resumeLabel: string;
    jdLabel: string;
    button: string;
    defaultResume: string;
    defaultJD: string;
  };
  gaps: {
    gated: string;
    empty: string;
    title: string;
    desc: string;
    total: string;
    high: string;
    medium: string;
    importance: string;
    attainability: string;
    priority: string;
    signal: string;
  };
  plan: {
    gated: string;
    empty: string;
    phase: string;
    goals: string;
    tasks: string;
    hours: string;
  };
  resume: {
    gated: string;
    mappingTitle: string;
    mappingDesc: string;
    points: string;
    required: string;
    mustHave: string;
    niceToHave: string;
    coverage: {
      full: string;
      partial: string;
      none: string;
    };
    previewTitle: string;
    previewDesc: string;
    export: string;
    jdMissing: string;
  };
  history: {
    title: string;
    desc: string;
    currentId: string;
    placeholder: string;
    load: string;
    loading: string;
    contextTitle: string;
    empty: string;
    resumeTitle: string;
    jobTitle: string;
  };
  status: {
    panelTitle: string;
    panelDesc: string;
    runId: string;
    analysisId: string;
    startedAt: string;
    finishedAt: string;
    historyTitle: string;
    state: {
      running: string;
      success: string;
      failed: string;
    };
  };
};

const translations: Record<Lang, Copy> = {
  en: {
    appTitle: "AI Career Assistant",
    appSubtitle: "LLM Gap Analyzer",
    badge: "M3 · History",
  tabs: {
    analyze: "Analyze",
    gaps: "Gap Overview",
    plan: "Plan Board",
    resume: "Resume Studio",
    history: "History",
    prompts: "Prompts",
  },
    shared: {
      loading: "Calling LLM…",
      analysisId: "Analysis ID",
      notGenerated: "Not ready",
      gapCount: "Gap Count",
      learningPhases: "Learning Phases",
      jdPoints: "JD Points",
      topGaps: "Top Priority Gaps",
      noGaps: "No gaps yet.",
    },
    analyze: {
      heading: "Analyze Resume vs JD",
      resumeLabel: "Resume",
      jdLabel: "Job Description",
      button: "One-click Analyze",
      defaultResume:
        "Jane Doe\nFull-stack engineer with 4 years of experience shipping B2B SaaS products.\n\nSkills: Python, FastAPI, React, PostgreSQL, AWS, Docker, System Design, Prompt Engineering\n",
      defaultJD:
        "Senior AI Platform Engineer @ Visionary Labs\n\nRequirements: Python, FastAPI, LLM workflows, React prototype ability",
    },
    gaps: {
      gated: "Run an analysis first to unlock the gap dashboard.",
      empty: "No gaps detected. Try a different JD to stress test the analyzer.",
      title: "Gap Overview",
      desc: "Priority = importance × attainability. Track what matters now and what can realistically be improved soon.",
      total: "Total Gaps",
      high: "High Priority",
      medium: "Medium Priority",
      importance: "Importance",
      attainability: "Attainability",
      priority: "Priority",
      signal: "Signal",
    },
    plan: {
      gated: "Run the analysis to receive an AI-constructed learning plan.",
      empty: "No learning phases returned. Update your JD/resume pair and re-run.",
      phase: "Phase",
      goals: "Goals",
      tasks: "Tasks",
      hours: "hrs",
    },
    resume: {
      gated: "Resume Studio requires an analysis run. Go to Analyze tab first.",
      mappingTitle: "JD → Resume Mapping",
      mappingDesc: "Inspect which resume bullets satisfy each requirement.",
      points: "points",
      required: "Required",
      mustHave: "Must have",
      niceToHave: "Nice to have",
      coverage: {
        full: "Full",
        partial: "Partial",
        none: "Missing",
      },
      previewTitle: "Custom Resume Preview",
      previewDesc: "Markdown tailored to the JD.",
      export: "Export Markdown",
      jdMissing: "JD points missing from LLM output. Try another analysis run.",
    },
    history: {
      title: "History Lookup",
      desc: "Enter an Analysis ID to reload any past API result.",
      currentId: "Current ID",
      placeholder: "e.g. 5b6d61a4-...",
      load: "Load Analysis",
      loading: "Loading...",
      contextTitle: "Current Context",
      empty: "No result yet. Run an analysis or load from history.",
      resumeTitle: "Resume Title",
      jobTitle: "Job Title",
    },
    status: {
      panelTitle: "Request Status",
      panelDesc: "Track the latest analysis run and keep history scoped to this session.",
      runId: "Run ID",
      analysisId: "Analysis ID",
      startedAt: "Started",
      finishedAt: "Finished",
      historyTitle: "Recent Runs",
      state: {
        running: "Running",
        success: "Succeeded",
        failed: "Failed",
      },
    },
  },
  zh: {
    appTitle: "AI 职业助手",
    appSubtitle: "LLM 差距分析",
    badge: "M3 · 历史",
  tabs: {
    analyze: "分析",
    gaps: "差距概览",
    plan: "学习计划",
    resume: "简历工作室",
    history: "历史记录",
    prompts: "提示词",
  },
    shared: {
      loading: "调用 LLM…",
      analysisId: "分析 ID",
      notGenerated: "尚未生成",
      gapCount: "差距数量",
      learningPhases: "学习阶段",
      jdPoints: "JD 要点",
      topGaps: "高优先级差距",
      noGaps: "暂无差距。",
    },
    analyze: {
      heading: "简历 vs JD 分析",
      resumeLabel: "简历",
      jdLabel: "职位描述",
      button: "一键分析",
      defaultResume:
        "张三\n4 年全栈工程师，负责 B2B SaaS 交付。\n\n技能：Python、FastAPI、React、PostgreSQL、AWS、Docker、系统设计、提示工程\n",
      defaultJD:
        "高级 AI 平台工程师 @ Visionary Labs\n\n要求：Python、FastAPI、LLM 工作流、具备 React 原型能力",
    },
    gaps: {
      gated: "请先运行一次分析以查看差距面板。",
      empty: "暂无差距，可更换 JD 再试。",
      title: "差距概览",
      desc: "优先级 = 重要度 × 可达成度。关注当前最值得投入的差距。",
      total: "总差距",
      high: "高优先级",
      medium: "中优先级",
      importance: "重要度",
      attainability: "可达成度",
      priority: "优先级",
      signal: "标签",
    },
    plan: {
      gated: "请先运行分析以生成学习计划。",
      empty: "暂无学习阶段，调整简历/JD 后重试。",
      phase: "阶段",
      goals: "目标",
      tasks: "任务",
      hours: "小时",
    },
    resume: {
      gated: "请先运行分析再查看简历工作室。",
      mappingTitle: "JD → 简历映射",
      mappingDesc: "查看哪些经历覆盖了 JD 要求。",
      points: "条要点",
      required: "要求",
      mustHave: "必需",
      niceToHave: "加分",
      coverage: {
        full: "完全覆盖",
        partial: "部分覆盖",
        none: "未覆盖",
      },
      previewTitle: "定制简历预览",
      previewDesc: "面向 JD 的 Markdown 文本。",
      export: "导出 Markdown",
      jdMissing: "JD 要点缺失，尝试重新分析。",
    },
    history: {
      title: "历史查询",
      desc: "输入分析 ID，重新加载历史结果。",
      currentId: "当前 ID",
      placeholder: "例如：5b6d61a4-...",
      load: "加载分析",
      loading: "加载中...",
      contextTitle: "当前上下文",
      empty: "还没有结果，先运行分析或从历史加载。",
      resumeTitle: "简历标题",
      jobTitle: "JD 标题",
    },
    status: {
      panelTitle: "请求状态",
      panelDesc: "查看本次分析的进度，并在会话内保留运行记录。",
      runId: "运行 ID",
      analysisId: "分析 ID",
      startedAt: "开始时间",
      finishedAt: "结束时间",
      historyTitle: "本地最近记录",
      state: {
        running: "进行中",
        success: "成功",
        failed: "失败",
      },
    },
  },
};

export const getCopy = (lang: Lang): Copy => translations[lang];
