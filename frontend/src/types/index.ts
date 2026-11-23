/**
 * DCI HireMind - Frontend Data Models & Types
 * Strongly typed interfaces aligned with FastAPI backend and Supabase PostgreSQL schema.
 */

export interface Candidate {
  id: number;
  anonymized_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  skills: string[] | null;
  years_of_experience: number | null;
  education_level: string | null;
  status: string; // NEW, SCREENING, IN_REVIEW, SHORTLISTED, ARCHIVED, HIRED
  created_at: string | null;
  updated_at: string | null;
}

export interface CandidateCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location?: string;
  skills?: string[];
  years_of_experience?: number;
  education_level?: string;
}

export interface CandidateUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  years_of_experience?: number;
  education_level?: string;
  status?: string;
}

export interface Job {
  id: number;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string; // Full-Time, Part-Time, Contract, Remote
  description: string;
  requirements: string | null;
  required_skills: string[] | null;
  experience_level: string | null; // Entry, Mid, Senior, Lead, Executive
  salary_min: number | null;
  salary_max: number | null;
  status: string; // OPEN, DRAFT, PAUSED, CLOSED
  created_by_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobCreate {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description: string;
  requirements?: string;
  required_skills?: string[];
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
}

export interface JobUpdate {
  title?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description?: string;
  requirements?: string;
  required_skills?: string[];
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  status?: string;
}

export interface Application {
  id: number;
  job_id: number;
  candidate_id: number;
  stage: string; // APPLIED, AI_PROCESSED, IN_REVIEW, SHORTLISTED, INTERVIEW, OFFER, REJECTED, HIRED
  match_score: number | null;
  match_rationale: string | null;
  ai_recommendation: string | null;
  human_decision: string | null;
  human_feedback: string | null;
  human_reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Optional enriched fields joined for UI display
  candidate?: Candidate;
  job?: Job;
}

export interface ApplicationCreate {
  job_id: number;
  candidate_id: number;
  cover_letter?: string;
}

export interface ApplicationStatusUpdate {
  stage?: string;
  human_decision?: string;
  human_feedback?: string;
}

export interface ResumeAnalysisRecord {
  id: number;
  candidate_id: number;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  storage_path: string;
  parsing_status: string;
  signed_url?: string | null;
  created_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface User {
  id?: string;
  email: string;
  full_name?: string;
  role: 'Admin' | 'Recruiter' | 'Candidate';
  phone_number?: string;
}

export interface DashboardMetrics {
  totalCandidates: number;
  totalJobs: number;
  totalApplications: number;
  shortlistedCount: number;
  databaseStatus: 'connected' | 'disconnected';
  databaseEngine: string;
}

export interface ResumeItem {
  id: number;
  candidate_id: number;
  candidate_name?: string;
  candidate_email?: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  storage_path: string;
  parsing_status: string;
  signed_url?: string | null;
  created_at: string | null;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatResponse {
  success: boolean;
  reply: string;
  model: string;
  tokens_used?: number;
}

export interface AIMatchResponse {
  success: boolean;
  candidate_name: string;
  job_title: string;
  match_score: number;
  analysis: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  ethical_note: string;
}

// ============================================================================
// Public Careers Types
// ============================================================================
export interface PublicJobSummary {
  id: number;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  experience_level: string | null;
  description_snippet: string;
  required_skills: string[] | null;
  created_at: string | null;
}

export interface PublicJobDetail {
  id: number;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  experience_level: string | null;
  description: string;
  requirements: string | null;
  required_skills: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string | null;
}

export interface PublicJobListResponse {
  items: PublicJobSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  departments: string[];
  locations: string[];
}

export interface PublicApplicationResponse {
  success: boolean;
  reference_number: string;
  message: string;
  job_id: number;
  job_title: string;
  applicant_name: string;
  submitted_at: string;
}

// ============================================================================
// HR Admin Portal Types
// ============================================================================
export interface HRDashboardStats {
  total_candidates: number;
  total_jobs: number;
  total_applications: number;
  new_applications: number;
  under_review_count: number;
  shortlisted_candidates: number;
  interview_scheduled: number;
  selected_candidates: number;
  rejected_count: number;
  recent_applications: {
    id: number;
    reference_number?: string;
    candidate_name: string;
    candidate_email: string;
    job_title: string;
    job_department?: string;
    stage: string;
    match_score?: number;
    created_at?: string;
  }[];
  recent_candidates: {
    id: number;
    full_name: string;
    email: string;
    location?: string;
    skills: string[];
    years_of_experience?: number;
    education_level?: string;
    created_at?: string;
  }[];
}

export interface HRApplicationItem {
  id: number;
  reference_number?: string;
  stage: string;
  job_id: number;
  job_title: string;
  job_department?: string;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_location?: string;
  candidate_experience_years?: number;
  candidate_education?: string;
  candidate_skills?: string[];
  resume_file_name?: string;
  resume_signed_url?: string;
  match_score?: number;
  match_rationale?: string;
  human_decision?: string;
  human_feedback?: string;
  human_reviewed_at?: string;
  created_at?: string;
}

export interface HRApplicationListResponse {
  items: HRApplicationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stage_counts: Record<string, number>;
}

export interface HRStatusUpdateRequest {
  stage: string;
  human_decision?: string;
  human_feedback?: string;
}

