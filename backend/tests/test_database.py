"""
Database and Model Integration Tests - DCI HireMind
Tests model persistence, relationships, and connectivity using Python's standard unittest.
"""

import unittest
from datetime import datetime, timezone

from app.core.config import get_settings

# Enforce explicit local SQLite database for isolated unit test execution
settings = get_settings()
settings.USE_SQLITE = True

from app.database.session import SessionLocal, check_db_connection
from app.models import (
    Application,
    Candidate,
    InterviewResult,
    Job,
    ResumeAnalysis,
    User,
)


class TestDatabaseAndModels(unittest.TestCase):
    """Integration test suite for database and domain models."""

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_database_connectivity(self):
        """Verify check_db_connection returns True."""
        is_healthy, dialect, diagnostics = check_db_connection()
        self.assertTrue(is_healthy, f"Database connectivity check failed: {diagnostics}")
        self.assertIn(dialect, ["sqlite", "postgresql"])

    def test_create_user_and_job_relationship(self):
        """Verify user creation and foreign key relationship with job."""
        unique_email = f"recruiter_{int(datetime.now().timestamp())}@hiremind.test"
        user = User(
            email=unique_email,
            full_name="Alex Recruiter",
            hashed_password="mock_hashed_secret",
            role="RECRUITER",
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        self.assertIsNotNone(user.id)
        self.assertEqual(user.email, unique_email)

        # Create Job owned by User
        job = Job(
            title="Senior Full Stack Engineer",
            department="Engineering",
            location="Remote",
            description="Leading AI-first application development.",
            required_skills=["Python", "FastAPI", "React", "PostgreSQL"],
            status="OPEN",
            created_by_id=user.id,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        self.assertIsNotNone(job.id)
        self.assertEqual(job.created_by_id, user.id)
        self.assertEqual(job.created_by.email, unique_email)

    def test_blind_candidate_and_application_lifecycle(self):
        """
        Verify candidate creation with ethical blind screening attributes
        and application stage management with HITL approval fields.
        """
        ts = int(datetime.now().timestamp())
        anon_id = f"CAND-ANON-{ts}"

        # 1. Candidate Creation
        candidate = Candidate(
            first_name="Jordan",
            last_name="Doe",
            email=f"jordan_{ts}@candidate.test",
            anonymized_id=anon_id,
            raw_resume_text="Jordan Doe. Experienced Python Engineer.",
            anonymized_resume_text="[REDACTED CANDIDATE]. Experienced Python Engineer.",
            skills=["Python", "SQLAlchemy", "FastAPI"],
            years_of_experience=5.5,
            status="NEW",
        )
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)

        self.assertIsNotNone(candidate.id)
        self.assertEqual(candidate.anonymized_id, anon_id)

        # Create a test Job
        job = Job(
            title=f"AI Engineer {ts}",
            description="Developing multi-agent workflows.",
            status="OPEN",
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # 2. Application Submission & AI Match Analysis
        application = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            stage="AI_PROCESSED",
            match_score=88.5,
            match_rationale="Strong Python backend and LLM workflow experience.",
            skill_gap_analysis={"missing": ["Docker"], "matched": ["Python", "FastAPI"]},
            ai_recommendation="RECOMMENDED_FOR_REVIEW",
            # Ensure no automatic rejection: human fields start as None
            human_decision=None,
        )
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)

        self.assertIsNotNone(application.id)
        self.assertEqual(application.match_score, 88.5)
        self.assertIsNone(application.human_decision)

        # 3. Human-in-the-Loop Approval Action
        application.stage = "SHORTLISTED"
        application.human_decision = "SHORTLIST"
        application.human_feedback = "Approved by recruiter after blind profile review."
        application.human_reviewed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(application)

        self.assertEqual(application.stage, "SHORTLISTED")
        self.assertEqual(application.human_decision, "SHORTLIST")

    def test_resume_analysis_and_interview_result_models(self):
        """
        Verify ResumeAnalysis and InterviewResult persistence and relationships.
        """
        ts = int(datetime.now().timestamp())

        # Candidate
        candidate = Candidate(
            first_name="Sam",
            last_name="Smith",
            email=f"sam_{ts}@example.test",
            anonymized_id=f"ANON-SAM-{ts}",
            status="SCREENING",
        )
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)

        # Resume Analysis (Supabase Storage reference)
        resume_analysis = ResumeAnalysis(
            candidate_id=candidate.id,
            file_name="sam_resume.pdf",
            storage_path=f"candidates/{candidate.id}/uuid123_sam_resume.pdf",
            file_type="pdf",
            file_size_bytes=245000,
            raw_text="Sam Smith - Full Stack Developer",
            anonymized_text="[REDACTED] - Full Stack Developer",
            extracted_skills=["Python", "FastAPI", "React", "Docker"],
            experience_years=4.0,
            parsing_status="COMPLETED",
        )
        self.db.add(resume_analysis)
        self.db.commit()
        self.db.refresh(resume_analysis)

        self.assertIsNotNone(resume_analysis.id)
        self.assertEqual(resume_analysis.file_name, "sam_resume.pdf")
        self.assertEqual(resume_analysis.candidate_id, candidate.id)

        # Job & Application
        job = Job(title=f"Platform Engineer {ts}", description="Core backend role", status="OPEN")
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        application = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            stage="INTERVIEW",
            match_score=92.0,
        )
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)

        # Interview Result
        interview = InterviewResult(
            application_id=application.id,
            interview_type="TECHNICAL",
            status="COMPLETED",
            ai_suggested_questions=[
                {"question": "How do you handle database connection pooling in FastAPI?"}
            ],
            interviewer_rating=4.5,
            interviewer_feedback="Excellent knowledge of asynchronous Python and system architecture.",
            recommendation="STRONG_HIRE",
        )
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)

        self.assertIsNotNone(interview.id)
        self.assertEqual(interview.application_id, application.id)
        self.assertEqual(interview.recommendation, "STRONG_HIRE")
        self.assertEqual(interview.interviewer_rating, 4.5)


if __name__ == "__main__":
    unittest.main()
