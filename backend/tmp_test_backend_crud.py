"""
Script to test CRUD endpoints for candidates, jobs, and applications.
Runs against the local FastAPI server (http://127.0.0.1:8000).
"""
import json, sys, time
import httpx
BASE = "http://127.0.0.1:8000/api/v1"

def log(msg):
    print(f"[TEST] {msg}")

# Helper for auth
def register_user(email, password, role):
    r = httpx.post(f"{BASE}/auth/register", json={"email": email, "password": password, "role": role})
    return r

def login_user(email, password):
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    return r

def main():
    # 1. Register recruiter
    recruiter_email = "recruiter_test@example.com"
    recruiter_pw = "TestPass123!"
    log("Registering recruiter...")
    resp = register_user(recruiter_email, recruiter_pw, "Recruiter")
    if resp.status_code not in (200,201):
        log(f"Recruiter register failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    # login recruiter
    log("Logging in recruiter...")
    resp = login_user(recruiter_email, recruiter_pw)
    token = resp.json().get("access_token")
    if not token:
        log(f"Login failed: {resp.text}")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {token}"}
    # 2. Create a job
    job_payload = {
        "title": "Senior Python Engineer",
        "description": "Develop AI services.",
        "employment_type": "Full-Time",
        "required_skills": ["Python", "FastAPI"],
    }
    log("Creating job...")
    r = httpx.post(f"{BASE}/jobs/", json=job_payload, headers=headers)
    if r.status_code != 201:
        log(f"Job create failed: {r.status_code} {r.text}")
        sys.exit(1)
    job = r.json()
    job_id = job["id"]
    log(f"Job created id={job_id}")
    # 3. List jobs (public, no auth)
    r = httpx.get(f"{BASE}/jobs/")
    log(f"Jobs list status {r.status_code}, count {len(r.json().get('items',[]))}")
    # 4. Get job details
    r = httpx.get(f"{BASE}/jobs/{job_id}")
    log(f"Job get status {r.status_code}")
    # 5. Update job (change title)
    upd = {"title": "Senior Python Engineer (Updated)"}
    r = httpx.patch(f"{BASE}/jobs/{job_id}", json=upd, headers=headers)
    log(f"Job update status {r.status_code}")
    # 6. Delete/close job
    r = httpx.delete(f"{BASE}/jobs/{job_id}", headers=headers)
    log(f"Job close status {r.status_code}")
    # 7. Register candidate user
    cand_email = "candidate_test@example.com"
    cand_pw = "CandPass123!"
    log("Registering candidate...")
    resp = register_user(cand_email, cand_pw, "Candidate")
    if resp.status_code not in (200,201):
        log(f"Candidate register failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    # Login candidate
    resp = login_user(cand_email, cand_pw)
    cand_token = resp.json().get("access_token")
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    # 8. Create candidate profile (self)
    cand_profile = {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": cand_email,
        "phone": "1234567890",
        "location": "Remote",
        "skills": ["Python", "ML"],
        "years_of_experience": 3,
        "education_level": "Bachelor"
    }
    r = httpx.post(f"{BASE}/candidates/", json=cand_profile, headers=cand_headers)
    log(f"Candidate create status {r.status_code}")
    candidate = r.json()
    cand_id = candidate["id"]
    # 9. List candidates (admin required) should fail for candidate
    r = httpx.get(f"{BASE}/candidates/", headers=cand_headers)
    log(f"Candidate list as candidate status {r.status_code}")
    # 10. Create application (candidate applying to job)
    app_payload = {"job_id": job_id, "candidate_id": cand_id, "cover_letter": "I am interested"}
    r = httpx.post(f"{BASE}/applications/", json=app_payload, headers=cand_headers)
    log(f"Application create status {r.status_code}")
    app = r.json()
    app_id = app["id"]
    # 11. Recruiter updates application status to REJECTED with human decision
    status_payload = {"stage": "REJECTED", "human_decision": "REJECTED", "human_feedback": "Not a fit"}
    r = httpx.patch(f"{BASE}/applications/{app_id}/status", json=status_payload, headers=headers)
    log(f"Application status update (rejection) status {r.status_code}")
    # 12. Candidate attempts to view own application
    r = httpx.get(f"{BASE}/applications/{app_id}", headers=cand_headers)
    log(f"Candidate view own application status {r.status_code}")
    # 13. Cleanup: archive candidate (admin needed) - skip
    log("Tests completed")

if __name__ == "__main__":
    main()

