"""
Comprehensive End-to-End Verification Test for DCI HireMind
Tests authentication, candidate CRUD, job CRUD, application workflow,
and Supabase Storage resume upload against live backend on http://127.0.0.1:8080.
"""

import io
import sys
import httpx

BASE_URL = "http://127.0.0.1:8080"

def test_full_pipeline():
    print("=" * 60)
    print("STARTING DCI HIREMIND COMPLETE INTEGRATION TEST")
    print("=" * 60)

    # 1. System Health Probe
    print("\n[1/10] Checking System & Database Health...")
    r = httpx.get(f"{BASE_URL}/health", timeout=10.0)
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    health_data = r.json()
    print("  ✓ /health Status:", health_data.get("status"))
    print("  ✓ Database Engine:", health_data.get("database", {}).get("engine"))
    print("  ✓ Supabase Host:", health_data.get("database", {}).get("host"))
    print("  ✓ Storage Bucket 'resumes':", health_data.get("storage", {}).get("status"))

    # 2. Authentication: Login Recruiter
    print("\n[2/10] Testing Authentication & JWT Generation...")
    recruiter_email = "recruiter_lead@hiremind.com"
    recruiter_pw = "EnterpriseSecurePass2026!"

    login_res = httpx.post(f"{BASE_URL}/api/auth/login", json={
        "email": recruiter_email,
        "password": recruiter_pw
    }, timeout=10.0)

    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    print("  ✓ Logged in as verified recruiter. Supabase JWT acquired.")

    headers = {"Authorization": f"Bearer {token}"}

    # Verify /api/auth/me
    me_res = httpx.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert me_res.status_code == 200, f"/api/auth/me failed: {me_res.text}"
    user_info = me_res.json().get("user", {})
    print(f"  ✓ Authenticated as: {user_info.get('email')} (Role: {user_info.get('role')})")

    # 3. Candidate Management: Creation
    print("\n[3/10] Creating Candidate in Supabase PostgreSQL...")
    cand_payload = {
        "first_name": "Marcus",
        "last_name": "Vance",
        "email": "marcus.vance.test@example.com",
        "phone": "+1-415-555-0199",
        "location": "San Francisco, CA",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker"],
        "years_of_experience": 5.5,
        "education_level": "Master's Degree"
    }

    # Ensure clean state if previously created
    cand_res = httpx.post(f"{BASE_URL}/api/candidates/", json=cand_payload, headers=headers)
    if cand_res.status_code == 409:
        print("  ℹ Candidate already exists, retrieving existing record...")
        list_res = httpx.get(f"{BASE_URL}/api/candidates/?q=marcus.vance", headers=headers)
        candidate = list_res.json()["items"][0]
    else:
        assert cand_res.status_code == 201, f"Candidate creation failed: {cand_res.text}"
        candidate = cand_res.json()

    candidate_id = candidate["id"]
    print(f"  ✓ Candidate saved: ID #{candidate_id}, Name: {candidate['first_name']} {candidate['last_name']}")
    print(f"  ✓ Ethical Anonymized ID generated: {candidate['anonymized_id']}")

    # 4. Candidate Management: List, Search, & Update
    print("\n[4/10] Testing Candidate Listing, Search, & Update...")
    list_cand = httpx.get(f"{BASE_URL}/api/candidates/?q=Python", headers=headers)
    assert list_cand.status_code == 200, "Candidate listing failed"
    print(f"  ✓ Query 'Python' returned {list_cand.json().get('total')} candidates in Supabase.")

    # Update candidate experience
    update_res = httpx.patch(f"{BASE_URL}/api/candidates/{candidate_id}", json={
        "years_of_experience": 6.0,
        "status": "SCREENING"
    }, headers=headers)
    assert update_res.status_code == 200, f"Candidate update failed: {update_res.text}"
    updated_cand = update_res.json()
    print(f"  ✓ Candidate updated: Experience now {updated_cand['years_of_experience']} yrs, Status: {updated_cand['status']}")

    # 5. Job Management: Creation & Listing
    print("\n[5/10] Creating Job Requisition in Supabase PostgreSQL...")
    job_payload = {
        "title": "Principal AI Automation Architect",
        "department": "Artificial Intelligence",
        "location": "Remote / New York",
        "employment_type": "Full-Time",
        "experience_level": "Senior",
        "description": "Design and lead enterprise AI workflow architectures using LangGraph and CrewAI.",
        "requirements": "7+ years software engineering, deep expertise in LLM agent orchestration.",
        "required_skills": ["Python", "LangGraph", "FastAPI", "PostgreSQL", "Docker"],
        "salary_min": 175000,
        "salary_max": 220000
    }
    job_res = httpx.post(f"{BASE_URL}/api/jobs/", json=job_payload, headers=headers)
    assert job_res.status_code == 201, f"Job creation failed: {job_res.text}"
    job = job_res.json()
    job_id = job["id"]
    print(f"  ✓ Job created: ID #{job_id}, Title: '{job['title']}', Status: {job['status']}")

    # Public Job Listing
    public_jobs = httpx.get(f"{BASE_URL}/api/jobs/")
    assert public_jobs.status_code == 200, "Public jobs list failed"
    print(f"  ✓ Public jobs endpoint returned {public_jobs.json().get('total')} total jobs.")

    # 6. Application Management: Candidate-to-Job Mapping
    print("\n[6/10] Submitting Application in Supabase PostgreSQL...")
    app_payload = {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "cover_letter": "I have extensive experience with FastAPI, LangGraph, and PostgreSQL orchestration."
    }
    app_res = httpx.post(f"{BASE_URL}/api/applications/", json=app_payload, headers=headers)
    if app_res.status_code == 409:
        print("  ℹ Application already exists, retrieving existing record...")
        apps_list = httpx.get(f"{BASE_URL}/api/applications/?job_id={job_id}", headers=headers)
        application = apps_list.json()["items"][0]
    else:
        assert app_res.status_code == 201, f"Application creation failed: {app_res.text}"
        application = app_res.json()

    application_id = application["id"]
    print(f"  ✓ Application created: ID #{application_id}, Stage: {application['stage']}")

    # 7. Application Status Progression (Shortlisting)
    print("\n[7/10] Progressing Application Stage to SHORTLISTED...")
    status_res = httpx.patch(f"{BASE_URL}/api/applications/{application_id}/status", json={
        "stage": "SHORTLISTED",
        "human_decision": "APPROVED_FOR_INTERVIEW",
        "human_feedback": "Strong architectural background; matched all core requirements."
    }, headers=headers)
    assert status_res.status_code == 200, f"Status update failed: {status_res.text}"
    updated_app = status_res.json()
    print(f"  ✓ Application stage updated: {updated_app['stage']}, Decision: {updated_app['human_decision']}")

    # 8. Ethical AI Validation: Zero Auto-Rejection Check
    print("\n[8/10] Testing Ethical AI Zero Auto-Rejection Policy...")
    invalid_rej = httpx.patch(f"{BASE_URL}/api/applications/{application_id}/status", json={
        "stage": "REJECTED"
        # Omitted human_decision on purpose
    }, headers=headers)
    assert invalid_rej.status_code == 422, "Expected 422 Unprocessable Entity when rejecting without human decision"
    print("  ✓ Zero Auto-Rejection Policy enforced: Automatic rejection correctly blocked with HTTP 422.")

    # 9. Supabase Storage: Resume Upload
    print("\n[9/10] Testing Resume Upload to Supabase Storage ('resumes' bucket)...")
    fake_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Marcus Vance Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    files = {"file": ("marcus_vance_resume.pdf", fake_pdf_content, "application/pdf")}
    data = {"candidate_id": str(candidate_id)}

    upload_res = httpx.post(f"{BASE_URL}/api/resumes/upload", data=data, files=files, headers=headers)
    assert upload_res.status_code == 201, f"Resume upload failed: {upload_res.text}"
    resume_info = upload_res.json()
    print(f"  ✓ Resume successfully uploaded to Supabase Storage: {resume_info.get('storage_path')}")
    print(f"  ✓ Temporary signed URL generated: {bool(resume_info.get('signed_url'))}")

    # Verify retrieval
    resumes_list = httpx.get(f"{BASE_URL}/api/resumes/candidate/{candidate_id}", headers=headers)
    assert resumes_list.status_code == 200
    resumes_count = len(resumes_list.json().get("resumes", []))
    print(f"  ✓ Verified {resumes_count} resume record(s) associated with candidate #{candidate_id} in Supabase.")

    # 10. Dashboard Statistics Verification
    print("\n[10/10] Verifying Real Dashboard Metrics from Backend...")
    cand_cnt = httpx.get(f"{BASE_URL}/api/candidates/?page_size=1", headers=headers).json().get("total")
    jobs_cnt = httpx.get(f"{BASE_URL}/api/jobs/?page_size=1").json().get("total")
    apps_cnt = httpx.get(f"{BASE_URL}/api/applications/?page_size=1", headers=headers).json().get("total")
    short_cnt = httpx.get(f"{BASE_URL}/api/applications/?stage=SHORTLISTED&page_size=1", headers=headers).json().get("total")

    print(f"  ✓ Total Candidates: {cand_cnt}")
    print(f"  ✓ Total Jobs: {jobs_cnt}")
    print(f"  ✓ Total Applications: {apps_cnt}")
    print(f"  ✓ Shortlisted Applications: {short_cnt}")

    assert cand_cnt >= 1 and jobs_cnt >= 1 and apps_cnt >= 1 and short_cnt >= 1
    print("\n" + "=" * 60)
    print("ALL 10 VERIFICATION PHASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
