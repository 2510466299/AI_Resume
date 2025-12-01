export type CoverageLevel = "full" | "partial" | "none";

export interface Skill {
  name: string;
  level: string;
  evidence?: string;
}

export interface Education {
  degree: string;
  major: string;
  school: string;
  start?: string;
  end?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string;
  description: string;
}

export interface Requirements {
  must_have: string[];
  nice_to_have: string[];
}

export interface Profile {
  profile_type: "resume" | "job";
  title: string;
  years_experience: number;
  skills: Skill[];
  education: Education[];
  experiences: Experience[];
  requirements?: Requirements;
}

export interface Gap {
  id: string;
  name: string;
  importance: number;
  attainability: number;
  priority: number;
  reason: string;
}

export interface GapAnalysisResult {
  gaps: Gap[];
}

export interface JDPoint {
  id: string;
  text: string;
  category: string;
  required_level: string;
  mandatory: boolean;
}

export interface ResumeMatchExperience {
  experience_id: string;
  evidence: string;
}

export interface ResumeMapping {
  jd_point_id: string;
  coverage: CoverageLevel;
  match_experiences: ResumeMatchExperience[];
}

export interface JDMappingMatrix {
  jd_points: JDPoint[];
  resume_mapping: ResumeMapping[];
}

export interface LearningResource {
  title: string;
  url: string;
}

export interface LearningTask {
  title: string;
  estimated_hours: number;
  resources: LearningResource[];
}

export interface LearningPhase {
  name: string;
  duration_weeks: number;
  goals: string[];
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

export interface AnalyzeResponse {
  analysis_id?: string;
  result: FullAnalysisResult;
  draft_result?: FullAnalysisResult;
}

export type RunStatus = "running" | "succeeded" | "failed";

export interface RunRecord {
  id: string;
  status: RunStatus;
  startedAt: number;
  finishedAt?: number;
  analysisId?: string | null;
  error?: string | null;
}

export interface PromptTemplate {
  name: string;
  content: string;
  description: string;
  placeholders: string[];
}
