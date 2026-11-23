import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CandidateListPage } from './pages/candidates/CandidateListPage';
import { CandidateRegistrationForm } from './pages/candidates/CandidateRegistrationForm';
import { JobListPage } from './pages/jobs/JobListPage';
import { JobCreateForm } from './pages/jobs/JobCreateForm';
import { ApplicationListPage } from './pages/applications/ApplicationListPage';
import { ResumeManagementPage } from './pages/resumes/ResumeManagementPage';
import { AIAssistantPage } from './pages/ai/AIAssistantPage';
import { EthicalGuardPage } from './pages/ethical/EthicalGuardPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CareersHomePage } from './pages/careers/CareersHomePage';
import { PublicJobDetailPage } from './pages/careers/PublicJobDetailPage';
import { PublicJobApplyPage } from './pages/careers/PublicJobApplyPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ========================================================= */}
          {/* 1. PUBLIC CAREERS WEBSITE ROUTES (No Login Required)      */}
          {/* ========================================================= */}
          <Route path="/" element={<CareersHomePage />} />
          <Route path="/careers" element={<CareersHomePage />} />
          <Route path="/careers/jobs" element={<CareersHomePage />} />
          <Route path="/careers/jobs/:id" element={<PublicJobDetailPage />} />
          <Route path="/careers/apply/:jobId" element={<PublicJobApplyPage />} />

          {/* ========================================================= */}
          {/* 2. AUTHENTICATION ROUTES                                  */}
          {/* ========================================================= */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ========================================================= */}
          {/* 3. PROTECTED HR RECRUITMENT MANAGEMENT PORTAL             */}
          {/* ========================================================= */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CandidateListPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/register"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CandidateRegistrationForm />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <JobListPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/new"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <JobCreateForm />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ApplicationListPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resumes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ResumeManagementPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AIAssistantPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ethical-guard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EthicalGuardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to public careers website */}
          <Route path="*" element={<Navigate to="/careers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
