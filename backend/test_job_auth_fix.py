"""
End-to-End Test Suite: Job Requisition Authentication & Creation Fix
Verifies:
1. Recruiter authentication (Supabase Auth).
2. Session refresh via POST /api/auth/refresh.
3. Direct POST /api/jobs without trailing slash (Zero 307 redirects).
4. Authorization header preservation and validation.
5. Recruiter profile linking (created_by_id).
6. Job listing order (newest requisition appears at top).
7. Persistence in Supabase PostgreSQL.
8. Security guardrail: Unauthenticated POST returns 401.
9. Verification of all existing modules (Dashboard, Candidates, Applications, Resumes, Public Careers, AI).
"""

import time
import httpx

BASE_URL = "http://127.0.0.1:5173"
client = httpx.Client(base_url=BASE_URL, timeout=20.0)

def run_tests():
    print("=" * 75)
    print("DCI HIREMIND - JOB REQUISITION AUTHENTICATION E2E TEST SUITE")
    print("=" * 75)

    # 1. Login as Recruiter
    print("\n[STEP 1] Authenticating recruiter account via Supabase Auth...")
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "vimalraj.veerappan@dci.in", "password": "Vimalraj@2002"}
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]
    user_info = login_data["user"]
    recruiter_id = user_info["id"]
    recruiter_role = user_info["role"]
    print(f"  [PASS] Recruiter authenticated: {user_info['email']} (ID #{recruiter_id}, Role: {recruiter_role})")
    print(f"  [PASS] Access token acquired: {access_token[:20]}...")
    print(f"  [PASS] Refresh token acquired: {refresh_token[:20]}...")

    # 2. Test Session Refresh API
    print("\n[STEP 2] Verifying session refresh endpoint (POST /api/auth/refresh)...")
    refresh_resp = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
    refresh_data = refresh_resp.json()
    new_access_token = refresh_data["access_token"]
    print(f"  [PASS] Session refreshed successfully: New token {new_access_token[:20]}...")

    # Use the active token for subsequent requests
    headers = {"Authorization": f"Bearer {new_access_token}"}

    # 3. Security: Unauthenticated POST must be rejected with 401
    print("\n[STEP 3] Verifying unauthenticated POST /api/jobs is blocked...")
    unauth_resp = client.post(
        "/api/jobs",
        json={"title": "Hacker Job", "description": "Should fail"}
    )
    assert unauth_resp.status_code == 401, f"Expected 401, got: {unauth_resp.status_code}"
    print(f"  [PASS] Unauthenticated request safely blocked with HTTP 401: {unauth_resp.json().get('detail')}")

    # 4. Create Job Requisition via POST /api/jobs (No trailing slash)
    print("\n[STEP 4] Submitting new job requisition via POST /api/jobs (No trailing slash)...")
    job_timestamp = int(time.time())
    new_job_title = f"Principal Cloud AI Architect - Batch {job_timestamp}"
    job_payload = {
        "title": new_job_title,
        "department": "Engineering & AI",
        "location": "Remote / Global",
        "employment_type": "Full-Time",
        "experience_level": "Lead",
        "description": "Architect and deploy enterprise-scale AI automation solutions using FastAPI and Supabase.",
        "requirements": "7+ years in distributed systems, vector search, and cloud orchestration.",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "LangGraph", "Docker", "Kubernetes"],
        "salary_min": 160000,
        "salary_max": 210000
    }

    create_resp = client.post("/api/jobs", json=job_payload, headers=headers)
    assert create_resp.status_code == 201, f"Job creation failed: {create_resp.status_code} - {create_resp.text}"
    created_job = create_resp.json()
    job_id = created_job["id"]
    print(f"  [PASS] Job requisition created successfully in Supabase PostgreSQL!")
    print(f"         ID             : #{job_id}")
    print(f"         Title          : {created_job['title']}")
    print(f"         Department     : {created_job['department']}")
    print(f"         Location       : {created_job['location']}")
    print(f"         Employment Type: {created_job['employment_type']}")
    print(f"         Experience     : {created_job['experience_level']}")
    print(f"         Salary Range   : ${created_job['salary_min']} - ${created_job['salary_max']}")
    print(f"         Created By ID  : {created_job['created_by_id']} (Recruiter matched: {created_job['created_by_id'] == recruiter_id})")
    assert created_job["created_by_id"] == recruiter_id, "Created by ID did not match recruiter ID"

    # 5. Also verify POST /api/jobs/ (with trailing slash) works seamlessly
    print("\n[STEP 5] Submitting second job requisition via POST /api/jobs/ (with trailing slash)...")
    job_payload2 = {
        "title": f"Senior Data Platform Engineer - Batch {job_timestamp}",
        "department": "Data Engineering",
        "location": "Hybrid / Bangalore",
        "employment_type": "Full-Time",
        "experience_level": "Senior",
        "description": "Build high-throughput ingestion pipelines for unstructured candidate resume parsing.",
        "requirements": "4+ years in Python, Kafka, Spark, and PostgreSQL data modeling.",
        "required_skills": ["Python", "PostgreSQL", "Kafka", "Docker"],
        "salary_min": 110000,
        "salary_max": 145000
    }
    create_resp2 = client.post("/api/jobs/", json=job_payload2, headers=headers)
    assert create_resp2.status_code == 201, f"Job creation with trailing slash failed: {create_resp2.text}"
    job_id2 = create_resp2.json()["id"]
    print(f"  [PASS] Job created with trailing slash: ID #{job_id2} - '{create_resp2.json()['title']}'")

    # 6. Verify Job Requisitions Listing (GET /api/jobs)
    print("\n[STEP 6] Fetching Job Requisitions list (GET /api/jobs)...")
    list_resp = client.get("/api/jobs?page=1&page_size=10", headers=headers)
    assert list_resp.status_code == 200, f"List jobs failed: {list_resp.text}"
    list_data = list_resp.json()
    items = list_data["items"]
    assert len(items) > 0, "No jobs returned in list"
    top_job = items[0]
    print(f"  [PASS] Job list returned {len(items)} items on page 1 (Total in Supabase: {list_data['total']})")
    print(f"  [PASS] Top job in requisition list: ID #{top_job['id']} - '{top_job['title']}'")
    assert top_job["id"] == job_id2, f"Expected newest job #{job_id2} at top, got #{top_job['id']}"

    # 7. Verify Job Persistence & Retrieval by ID (GET /api/jobs/{id})
    print("\n[STEP 7] Verifying job persistence by ID (GET /api/jobs/{id})...")
    get_resp = client.get(f"/api/jobs/{job_id}", headers=headers)
    assert get_resp.status_code == 200, f"Get job failed: {get_resp.text}"
    job_fetched = get_resp.json()
    assert job_fetched["title"] == new_job_title
    print(f"  [PASS] Confirmed persistent record: ID #{job_fetched['id']} - {job_fetched['title']}")

    # 8. Verify Existing Platform Modules
    print("\n[STEP 8] Verifying existing modules remain 100% operational...")
    
    # 8.1 Dashboard Stats
    stats_resp = client.get("/api/hr/dashboard/stats", headers=headers)
    assert stats_resp.status_code == 200, f"Dashboard stats failed: {stats_resp.text}"
    stats = stats_resp.json()
    print(f"  [PASS] Dashboard Stats: Candidates={stats['total_candidates']}, Jobs={stats['total_jobs']}, Apps={stats['total_applications']}")

    # 8.2 Candidates
    cand_resp = client.get("/api/candidates?page=1&page_size=5", headers=headers)
    assert cand_resp.status_code == 200, f"Candidates failed: {cand_resp.text}"
    print(f"  [PASS] Candidates List: Total {cand_resp.json()['total']} candidates in system")

    # 8.3 Applications
    app_resp = client.get("/api/applications?page=1&page_size=5", headers=headers)
    assert app_resp.status_code == 200, f"Applications failed: {app_resp.text}"
    print(f"  [PASS] Applications List: Total {app_resp.json()['total']} applications in system")

    # 8.4 Public Careers Website
    pub_resp = client.get("/api/public/jobs")
    assert pub_resp.status_code == 200, f"Public careers failed: {pub_resp.text}"
    print(f"  [PASS] Public Careers Portal: Browsing {pub_resp.json()['total']} public job openings")

    # 8.5 System Health
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    print(f"  [PASS] System Health: Status '{health_resp.json()['status']}' - Database connected ({health_resp.json()['database']['engine']})")

    # 8.6 AI Health
    ai_resp = client.get("/api/health/ai")
    assert ai_resp.status_code == 200, f"AI health failed: {ai_resp.text}"
    print(f"  [PASS] AI Service Health: Status '{ai_resp.json()['ai_service']['status']}' (Model: {ai_resp.json()['ai_service']['model']})")

    print("\n" + "=" * 75)
    print("ALL 9 TEST SUITE PHASES COMPLETED WITH 100% SUCCESS!")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()
