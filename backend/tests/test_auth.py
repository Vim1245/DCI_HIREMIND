"""
Supabase Authentication & RBAC Integration Tests - DCI HireMind
Tests registration, role sanitization, login, token protection, and RBAC permissions.
"""

import time
import unittest
from fastapi.testclient import TestClient

from app.core.config import get_settings

# Enforce explicit local SQLite database for isolated unit test execution
settings = get_settings()
settings.USE_SQLITE = True

from app.core.auth import SupabaseUser, get_current_user
from app.database.session import SessionLocal
from app.main import app


class TestSupabaseAuthAndRBAC(unittest.TestCase):
    """Integration test suite for Supabase Auth and Role-Based Access Control."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()
        # Reset any dependency overrides after each test
        app.dependency_overrides.clear()

    def test_registration_security_rejects_admin_self_assignment(self):
        """
        Security requirement: Public frontend users cannot self-assign the 'Admin' role.
        """
        payload = {
            "email": f"hacker_{int(time.time())}@security.test",
            "password": "StrongPassword123!",
            "full_name": "Malicious User",
            "role": "Admin",  # Attempted privilege escalation
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Direct self-assignment of the 'Admin' role is prohibited",
            response.json()["detail"],
        )

    def test_unauthenticated_protected_endpoint_returns_401(self):
        """
        Verify that protected endpoints reject requests without a valid Bearer token.
        """
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertIn(
            "Authentication credentials were not provided",
            response.json()["detail"],
        )

    def test_invalid_login_credentials_returns_401(self):
        """
        Verify that login with incorrect credentials returns HTTP 401.
        """
        payload = {
            "email": "nonexistent_user_999@hiremind.test",
            "password": "WrongPassword123!",
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json()["detail"])

    def test_forgot_password_endpoint(self):
        """
        Verify that the password reset endpoint accepts email requests safely.
        """
        payload = {
            "email": "test_reset@hiremind.test",
        }
        response = self.client.post("/api/auth/forgot-password", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

    def test_logout_endpoint_requires_auth(self):
        """
        Verify logout endpoint requires authorization header.
        """
        response = self.client.post("/api/auth/logout")
        self.assertEqual(response.status_code, 401)

    # --------------------------------------------------------------------------
    # RBAC Role Permission Tests
    # --------------------------------------------------------------------------
    def test_candidate_role_permissions(self):
        """
        Candidate role:
        - CAN access candidate-only endpoint
        - CANNOT access recruiter-only endpoint (HTTP 403)
        - CANNOT access admin-only endpoint (HTTP 403)
        """
        app.dependency_overrides[get_current_user] = lambda: SupabaseUser(
            id="test-candidate-uuid-1",
            email="candidate@test.com",
            full_name="Candidate User",
            role="Candidate",
        )

        res_candidate = self.client.get("/api/auth/candidate-only")
        self.assertEqual(res_candidate.status_code, 200)
        self.assertTrue(res_candidate.json()["success"])

        res_recruiter = self.client.get("/api/auth/recruiter-only")
        self.assertEqual(res_recruiter.status_code, 403)

        res_admin = self.client.get("/api/auth/admin-only")
        self.assertEqual(res_admin.status_code, 403)

    def test_recruiter_role_permissions(self):
        """
        Recruiter role:
        - CAN access candidate-only endpoint
        - CAN access recruiter-only endpoint
        - CANNOT access admin-only endpoint (HTTP 403)
        """
        app.dependency_overrides[get_current_user] = lambda: SupabaseUser(
            id="test-recruiter-uuid-2",
            email="recruiter@test.com",
            full_name="Recruiter User",
            role="Recruiter",
        )

        res_candidate = self.client.get("/api/auth/candidate-only")
        self.assertEqual(res_candidate.status_code, 200)

        res_recruiter = self.client.get("/api/auth/recruiter-only")
        self.assertEqual(res_recruiter.status_code, 200)
        self.assertTrue(res_recruiter.json()["success"])

        res_admin = self.client.get("/api/auth/admin-only")
        self.assertEqual(res_admin.status_code, 403)

    def test_admin_role_permissions(self):
        """
        Admin role:
        - CAN access candidate-only endpoint
        - CAN access recruiter-only endpoint
        - CAN access admin-only endpoint
        """
        app.dependency_overrides[get_current_user] = lambda: SupabaseUser(
            id="test-admin-uuid-3",
            email="admin@test.com",
            full_name="Admin User",
            role="Admin",
        )

        res_candidate = self.client.get("/api/auth/candidate-only")
        self.assertEqual(res_candidate.status_code, 200)

        res_recruiter = self.client.get("/api/auth/recruiter-only")
        self.assertEqual(res_recruiter.status_code, 200)

        res_admin = self.client.get("/api/auth/admin-only")
        self.assertEqual(res_admin.status_code, 200)
        self.assertTrue(res_admin.json()["success"])


if __name__ == "__main__":
    unittest.main()
