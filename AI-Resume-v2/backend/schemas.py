from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class Skill(BaseModel):
    name: str
    level: Optional[str] = None
    evidence: Optional[str] = None
    importance: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Importance in target JD"
    )


class Experience(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    summary: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)


class Education(BaseModel):
    school: Optional[str] = None
    degree: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    focus: Optional[str] = None


class Profile(BaseModel):
    headline: Optional[str] = None
    summary: Optional[str] = None
    skills: List[Skill] = Field(default_factory=list)
    experiences: List[Experience] = Field(default_factory=list)
    educations: List[Education] = Field(default_factory=list)


class Gap(BaseModel):
    skill: str
    importance: float = Field(ge=0.0, le=1.0)
    attainability: float = Field(ge=0.0, le=1.0)
    priority: float = Field(
        description="importance * attainability; higher = more urgent"
    )
    reason: str
    recommendation: Optional[str] = None


class GapAnalysisResult(BaseModel):
    overview: Optional[str] = None
    gaps: List[Gap] = Field(default_factory=list)


class MappingEvidence(BaseModel):
    experience_title: Optional[str] = None
    proof: Optional[str] = None


class MappingEntry(BaseModel):
    jd_item: str
    coverage: Literal["Full", "Partial", "None"]
    evidence: List[MappingEvidence] = Field(default_factory=list)
    recommendation: Optional[str] = None


class JDMappingMatrix(BaseModel):
    entries: List[MappingEntry] = Field(default_factory=list)


class LearningResource(BaseModel):
    title: str
    link: Optional[str] = None
    type: Optional[str] = None


class LearningTask(BaseModel):
    title: str
    description: Optional[str] = None
    duration_weeks: Optional[float] = None
    resources: List[LearningResource] = Field(default_factory=list)


class LearningPhase(BaseModel):
    name: str
    goal: Optional[str] = None
    duration_weeks: Optional[float] = None
    tasks: List[LearningTask] = Field(default_factory=list)


class LearningPlan(BaseModel):
    phases: List[LearningPhase] = Field(default_factory=list)


class FullAnalysisResult(BaseModel):
    resume_profile: Profile
    job_profile: Profile
    gap_analysis: GapAnalysisResult
    jd_mapping_matrix: JDMappingMatrix
    learning_plan: LearningPlan
    custom_resume_markdown: str


class AnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: str
    base_url: Optional[str] = Field(
        default="https://api.deepseek.com", description="OpenAI-compatible base URL"
    )
    api_key: Optional[str] = Field(
        default=None, description="LLM API key; falls back to environment if omitted"
    )
    model: Optional[str] = Field(default="deepseek-chat")


class ResumeCustomizeRequest(BaseModel):
    analysis_id: Optional[str] = None
    resume_text: str
    jd_text: str
    base_url: Optional[str] = Field(default="https://api.deepseek.com")
    api_key: Optional[str] = None
    model: Optional[str] = Field(default="deepseek-chat")


class DraftUpdateRequest(BaseModel):
    learning_plan: Optional[LearningPlan] = None
    custom_resume_markdown: Optional[str] = None


class PromptPayload(BaseModel):
    key: str
    content: str


class HistoryItem(BaseModel):
    id: str
    created_at: str
    summary: Optional[str] = None


class HistoryResponse(BaseModel):
    record: FullAnalysisResult
    draft_learning_plan: Optional[LearningPlan] = None
    draft_resume: Optional[str] = None


class StreamEvent(BaseModel):
    type: Literal["log", "result", "error", "end"]
    stage: str
    message: Optional[str] = None
    analysis_id: Optional[str] = None
    payload: Optional[FullAnalysisResult] = None
