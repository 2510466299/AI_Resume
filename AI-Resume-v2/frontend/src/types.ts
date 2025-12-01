export type Coverage = "Full" | "Partial" | "None";

export interface Skill {
  name: string;
  level?: string;
  evidence?: string;
  importance?: number;
}

export interface Experience {
  company?: string;
  title?: string;
  start?: string;
  end?: string;
  summary?: string;
  highlights?: string[];
}

export interface Profile {
  headline?: string;
  summary?: string;
  skills: Skill[];
  experiences: Experience[];
  educations?: {
    school?: string;
    degree?: string;
    start?: string;
    end?: string;
    focus?: string;
  }[];
}

export interface Gap {
  skill: string;
  importance: number;
  attainability: number;
  priority: number;
  reason: string;
  recommendation?: string;
}

export interface GapAnalysisResult {
  overview?: string;
  gaps: Gap[];
}

export interface MappingEntry {
  jd_item: string;
  coverage: Coverage;
  evidence: { experience_title?: string; proof?: string }[];
  recommendation?: string;
}

export interface JDMappingMatrix {
  entries: MappingEntry[];
}

export interface LearningResource {
  title: string;
  link?: string;
  type?: string;
}

export interface LearningTask {
  title: string;
  description?: string;
  duration_weeks?: number;
  resources: LearningResource[];
}

export interface LearningPhase {
  name: string;
  goal?: string;
  duration_weeks?: number;
  tasks: LearningTask[];
}

export interface LearningPlan {
  phases: LearningPhase[];
}

export interface FullAnalysisResult {
  resume_profile: Profile;
  job_profile: Profile;
  gap_analysis: GapAnalysisResult;
  jd_mapping_matrix: JDMappingMatrix;
  learning_plan: LearningPlan;
  custom_resume_markdown: string;
}

export interface AnalyzePayload {
  resume_text: string;
  jd_text: string;
  base_url?: string;
  api_key?: string;
  model?: string;
}

export interface StreamEvent {
  type: "log" | "result" | "error" | "end";
  stage: string;
  message?: string;
  analysis_id?: string;
  payload?: FullAnalysisResult;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  summary?: string | null;
}
