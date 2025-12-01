"""Pydantic schema definitions for the AI career assistant."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class Skill(BaseModel):
    name: str
    level: str
    evidence: Optional[str] = None


class Education(BaseModel):
    degree: str
    major: str
    school: str
    start: Optional[str] = None
    end: Optional[str] = None


class Experience(BaseModel):
    id: str
    company: str
    title: str
    start: str
    end: str
    description: str


class Requirements(BaseModel):
    must_have: List[str] = Field(default_factory=list)
    nice_to_have: List[str] = Field(default_factory=list)


class Profile(BaseModel):
    profile_type: Literal["resume", "job"]
    title: str
    years_experience: float
    skills: List[Skill] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    experiences: List[Experience] = Field(default_factory=list)
    requirements: Optional[Requirements] = None


class Gap(BaseModel):
    id: str
    name: str
    importance: float = Field(ge=0.0, le=1.0)
    attainability: float = Field(ge=0.0, le=1.0)
    priority: float = Field(ge=0.0, le=1.0)
    reason: str


class GapAnalysisResult(BaseModel):
    gaps: List[Gap] = Field(default_factory=list)


class JDPoint(BaseModel):
    id: str
    text: str
    category: str
    required_level: str
    mandatory: bool


class ResumeMatchExperience(BaseModel):
    experience_id: str
    evidence: str


class ResumeMapping(BaseModel):
    jd_point_id: str
    coverage: Literal["full", "partial", "none"]
    match_experiences: List[ResumeMatchExperience] = Field(default_factory=list)


class JDMappingMatrix(BaseModel):
    jd_points: List[JDPoint] = Field(default_factory=list)
    resume_mapping: List[ResumeMapping] = Field(default_factory=list)


class LearningResource(BaseModel):
    title: str
    url: str


class LearningTask(BaseModel):
    title: str
    estimated_hours: int
    resources: List[LearningResource] = Field(default_factory=list)


class LearningPhase(BaseModel):
    name: str
    duration_weeks: int
    goals: List[str] = Field(default_factory=list)
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
    llm_api_key: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_model: Optional[str] = None
    client_run_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    analysis_id: Optional[str] = None
    result: FullAnalysisResult
    draft_result: Optional[FullAnalysisResult] = None


class ResumeOnlyRequest(BaseModel):
    resume_text: str
    llm_api_key: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_model: Optional[str] = None


class JobOnlyRequest(BaseModel):
    jd_text: str
    llm_api_key: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_model: Optional[str] = None


class ProfileResponse(BaseModel):
    profile: Profile


class CustomResumeRequest(BaseModel):
    resume_text: str
    jd_text: str
    llm_api_key: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_model: Optional[str] = None


class CustomResumeResponse(BaseModel):
    custom_resume_markdown: str


class ErrorResponse(BaseModel):
    detail: str


class PromptTemplateModel(BaseModel):
    name: str
    content: str
    description: str
    placeholders: List[str]


class PromptUpdateRequest(BaseModel):
    content: str


class DraftUpdateRequest(BaseModel):
    result: FullAnalysisResult
