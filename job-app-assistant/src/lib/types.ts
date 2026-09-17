export interface WorkExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string; // "Present" allowed
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface ProfileInput {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  workExperience: WorkExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
}

export interface ParsedJobDescription {
  title: string;
  company: string;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
}

export interface TailoredResumeContent {
  summary: string;
  workExperience: WorkExperienceEntry[];
  skills: string[];
}

export interface TailoredResumeResult {
  tailoredContent: TailoredResumeContent;
  gapNotes: string; // honest notes on JD requirements not clearly covered by the profile
}
