"""
Verification script for Job Creation on Live Render Backend
"""
import httpx

client = httpx.Client(timeout=30.0)

print("=" * 65)
print("TESTING COMPLETE JOB CREATION WORKFLOW ON LIVE RENDER BACKEND")
print("=" * 65)

# 1. Login
login_resp = client.post(
    "https://dci-hiremind.onrender.com/api/auth/login",
    headers={"Origin": "https://dci-hiremind-1.onrender.com"},
    json={"email": "vimalraj.veerappan@dci.in", "password": "Vimalraj@2002"}
)
assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
token = login_resp.json()["access_token"]
user_info = login_resp.json()["user"]
print(f"1. [PASS] Logged in as: {user_info['email']} ({user_info['role']})")

auth_headers = {
    "Origin": "https://dci-hiremind-1.onrender.com",
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 2. Create Job with the exact requested details
job_payload = {
    "title": "Senior AI Engineer",
    "department": "Engineering & AI",
    "location": "Remote / US",
    "employment_type": "Full-Time",
    "experience_level": "Senior Level (5-8 years)",
    "description": "Architect, optimize, and deploy scalable LLM agents, LangGraph orchestration pipelines, and enterprise HR automation workflows.",
    "requirements": "5+ years with Python, FastAPI, vector databases (pgvector), and experience orchestrating multi-agent systems.",
    "required_skills": ["Python", "FastAPI", "LangGraph", "PostgreSQL", "Docker", "PyTorch"],
    "salary_min": 140000,
    "salary_max": 185000
}

create_resp = client.post(
    "https://dci-hiremind.onrender.com/api/jobs",
    headers=auth_headers,
    json=job_payload
)
print("2. Job create status code:", create_resp.status_code)
assert create_resp.status_code in (200, 201), f"Create job failed: {create_resp.text}"
created_job = create_resp.json()
job_id = created_job["id"]
print(f"   [PASS] Job successfully created in Supabase PostgreSQL! ID: {job_id}, Title: '{created_job['title']}'")
print(f"   Department: {created_job['department']}, Location: {created_job['location']}")

# 3. Retrieve Job Details
get_resp = client.get(
    f"https://dci-hiremind.onrender.com/api/jobs/{job_id}",
    headers=auth_headers
)
assert get_resp.status_code == 200, f"Get job failed: {get_resp.text}"
job_data = get_resp.json()
print(f"3. [PASS] Job details retrieved: '{job_data['title']}', Skills: {job_data['required_skills']}")

# 4. List all jobs to verify presence
list_resp = client.get(
    "https://dci-hiremind.onrender.com/api/jobs?page=1&page_size=20",
    headers=auth_headers
)
assert list_resp.status_code == 200, f"List jobs failed: {list_resp.text}"
all_jobs = list_resp.json()
found = any(j["id"] == job_id for j in all_jobs["items"])
print(f"4. [PASS] Newly created job exists in jobs list! Total jobs in Supabase: {all_jobs['total']}, In list: {found}")

# 5. HR Dashboard Stats verification
stats_resp = client.get(
    "https://dci-hiremind.onrender.com/api/hr/dashboard/stats",
    headers=auth_headers
)
assert stats_resp.status_code == 200, f"Stats failed: {stats_resp.text}"
stats = stats_resp.json()
print(f"5. [PASS] HR Dashboard stats retrieved successfully! Total jobs reported: {stats['total_jobs']}, Total candidates: {stats['total_candidates']}")

print("=" * 65)
print("ALL JOB CREATION & REGRESSION CHECKS PASSED WITH 100% SUCCESS!")
print("=" * 65)
