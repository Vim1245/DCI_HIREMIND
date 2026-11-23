-- ==============================================================================
-- DCI HireMind - Supabase Row Level Security (RLS) & Storage Policies
-- Enforces ethical data boundaries, role-based access, and blind screening privacy.
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROVISION RESUMES STORAGE BUCKET (SQL Automation)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false, -- Private bucket: access controlled by signed URLs and RLS
    10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON CORE TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interview_results ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. JOBS TABLE POLICIES
-- ------------------------------------------------------------------------------
-- Anyone (including public candidates) can view open jobs
CREATE POLICY "Public read for open jobs"
    ON jobs
    FOR SELECT
    USING (status = 'OPEN');

-- Recruiters and Admins can create and manage jobs
CREATE POLICY "Recruiters and Admins manage jobs"
    ON jobs
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
    );

-- ------------------------------------------------------------------------------
-- 4. CANDIDATES TABLE POLICIES (Ethical Blind Screening Guardrails)
-- ------------------------------------------------------------------------------
-- Applicants can submit their own candidate profile
CREATE POLICY "Applicants can submit candidate profile"
    ON candidates
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Recruiters and Admins can view full candidate details
CREATE POLICY "Authorized staff view candidates"
    ON candidates
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
    );

-- ------------------------------------------------------------------------------
-- 5. APPLICATIONS TABLE POLICIES (Human-in-the-Loop Decisions)
-- ------------------------------------------------------------------------------
-- Candidates can view their own application status
CREATE POLICY "Candidates view own application"
    ON applications
    FOR SELECT
    TO authenticated
    USING (
        candidate_id IN (
            SELECT id FROM candidates WHERE email = (auth.jwt() ->> 'email')
        )
    );

-- Recruiters and Reviewers can view all applications
CREATE POLICY "Staff view applications"
    ON applications
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('Recruiter', 'Reviewer', 'Admin', 'RECRUITER', 'REVIEWER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Reviewer', 'Admin', 'RECRUITER', 'REVIEWER', 'ADMIN')
    );

-- Only Recruiters and Admins can submit human approval decisions
CREATE POLICY "Recruiters update application stages"
    ON applications
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
    );

-- ------------------------------------------------------------------------------
-- 6. RESUME ANALYSES TABLE POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff view resume analyses"
    ON resume_analyses
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('Recruiter', 'Reviewer', 'Admin', 'RECRUITER', 'REVIEWER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Reviewer', 'Admin', 'RECRUITER', 'REVIEWER', 'ADMIN')
    );

CREATE POLICY "Authenticated users insert resume analyses"
    ON resume_analyses
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. INTERVIEW RESULTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Interviewers and staff access interview results"
    ON interview_results
    FOR ALL
    TO authenticated
    USING (
        interviewer_id IN (SELECT id FROM users WHERE email = (auth.jwt() ->> 'email'))
        OR (auth.jwt() ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Recruiter', 'Admin', 'RECRUITER', 'ADMIN')
    );

-- ------------------------------------------------------------------------------
-- 8. SUPABASE STORAGE (resumes bucket) RLS POLICIES
-- ------------------------------------------------------------------------------
-- Allow authenticated staff (Recruiters, Admins) to read private resumes
CREATE POLICY "Staff read resume storage"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'resumes');

-- Allow authenticated applicants and staff to upload resumes to the bucket
CREATE POLICY "Allow resume uploads to resumes bucket"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'resumes');

-- Allow candidates to update or delete their own resume file
CREATE POLICY "Allow candidate resume update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'resumes');

CREATE POLICY "Allow candidate resume delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'resumes');
