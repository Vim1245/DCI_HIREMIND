import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Award,
  RefreshCw,
  PlusCircle,
  UserPlus,
  ArrowRight,
  Activity,
  Globe,
  Clock,
  Calendar,
  Eye,
} from 'lucide-react';
import { hrPortalAPI } from '../../services/api';
import type { HRDashboardStats } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await hrPortalAPI.getStats();
      setStats(data);
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to retrieve real recruitment metrics from Supabase PostgreSQL.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalCandidates = stats?.total_candidates || 0;
  const totalJobs = stats?.total_jobs || 0;
  const totalApplications = stats?.total_applications || 0;
  const newApplications = stats?.new_applications || 0;
  const underReviewCount = stats?.under_review_count || 0;
  const shortlistedCount = stats?.shortlisted_candidates || 0;
  const interviewCount = stats?.interview_scheduled || 0;
  const selectedCount = stats?.selected_candidates || 0;
  const rejectedCount = stats?.rejected_count || 0;

  const statCards = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      icon: Users,
      link: '/candidates',
      color: 'border-l-indigo-500 text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Total Jobs',
      value: totalJobs,
      icon: Briefcase,
      link: '/jobs',
      color: 'border-l-sky-500 text-sky-600 bg-sky-50',
    },
    {
      title: 'Total Applications',
      value: totalApplications,
      icon: FileCheck2,
      link: '/applications',
      color: 'border-l-amber-500 text-amber-600 bg-amber-50',
    },
    {
      title: 'New Applications',
      value: newApplications,
      icon: Clock,
      link: '/applications?stage=APPLIED',
      color: 'border-l-cyan-500 text-cyan-600 bg-cyan-50',
    },
    {
      title: 'Shortlisted',
      value: shortlistedCount,
      icon: CheckCircle2,
      link: '/applications?stage=SHORTLISTED',
      color: 'border-l-emerald-500 text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Interview Scheduled',
      value: interviewCount,
      icon: Calendar,
      link: '/applications?stage=INTERVIEW_SCHEDULED',
      color: 'border-l-blue-500 text-blue-600 bg-blue-50',
    },
    {
      title: 'Selected / Hired',
      value: selectedCount,
      icon: Award,
      link: '/applications?stage=SELECTED',
      color: 'border-l-purple-500 text-purple-600 bg-purple-50',
    },
    {
      title: 'Rejected',
      value: rejectedCount,
      icon: XCircle,
      link: '/applications?stage=REJECTED',
      color: 'border-l-rose-500 text-rose-600 bg-rose-50',
    },
  ];

  const pipelineTotal = Math.max(totalApplications, 1);
  const shortlistedPct = Math.round((shortlistedCount / pipelineTotal) * 100);
  const interviewPct = Math.round((interviewCount / pipelineTotal) * 100);
  const selectedPct = Math.round((selectedCount / pipelineTotal) * 100);
  const reviewPct = Math.round((underReviewCount / pipelineTotal) * 100);
  const newPct = Math.round((newApplications / pipelineTotal) * 100);
  const rejectedPct = Math.round((rejectedCount / pipelineTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner with Public Careers Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Enterprise HR Admin Portal
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full">
              PostgreSQL Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time pipeline analytics, candidate tracking, and live Supabase PostgreSQL data persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/careers"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 shadow-2xs transition-colors"
          >
            <Globe className="w-4 h-4 text-teal-600" />
            <span>View Public Careers Site</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/candidates/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </Link>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Job</span>
          </Link>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* 8 Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className={`p-3.5 bg-white rounded-xl border border-slate-200 border-l-4 shadow-2xs hover:shadow-sm transition-all group ${card.color.split(' ')[0]}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.color.split(' ')[2]}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color.split(' ')[1]}`} />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
                {isLoading ? '...' : card.value}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pipeline Funnel Visualizer */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Live Recruitment Pipeline Distribution
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Inflow: {totalApplications} applications
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${newPct}%` }}
            className="bg-cyan-500 transition-all"
            title={`New Applied: ${newApplications} (${newPct}%)`}
          />
          <div
            style={{ width: `${reviewPct}%` }}
            className="bg-sky-400 transition-all"
            title={`Under Review: ${underReviewCount} (${reviewPct}%)`}
          />
          <div
            style={{ width: `${shortlistedPct}%` }}
            className="bg-emerald-500 transition-all"
            title={`Shortlisted: ${shortlistedCount} (${shortlistedPct}%)`}
          />
          <div
            style={{ width: `${interviewPct}%` }}
            className="bg-blue-500 transition-all"
            title={`Interview Scheduled: ${interviewCount} (${interviewPct}%)`}
          />
          <div
            style={{ width: `${selectedPct}%` }}
            className="bg-purple-500 transition-all"
            title={`Selected / Hired: ${selectedCount} (${selectedPct}%)`}
          />
          <div
            style={{ width: `${rejectedPct}%` }}
            className="bg-rose-500 transition-all"
            title={`Rejected: ${rejectedCount} (${rejectedPct}%)`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Applied ({newApplications})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Under Review ({underReviewCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Shortlisted ({shortlistedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Interview Scheduled ({interviewCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Selected ({selectedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Rejected ({rejectedCount})</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Applications & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">Recent Applications</h3>
              </div>
              <Link
                to="/applications"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner size="md" message="Loading applications..." />
              </div>
            ) : !stats?.recent_applications || stats.recent_applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No applications submitted yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recent_applications.map((app) => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{app.candidate_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {app.reference_number}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{app.job_title}</div>
                      <div className="text-[10px] text-slate-400">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          app.stage === 'SHORTLISTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : app.stage === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : app.stage === 'SELECTED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : app.stage === 'INTERVIEW_SCHEDULED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : app.stage === 'UNDER_REVIEW'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {app.stage}
                      </span>
                      <Link
                        to="/applications"
                        className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100"
                        title="Process application"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Candidates List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Recent Candidate Profiles</h3>
              </div>
              <Link
                to="/candidates"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner size="md" message="Loading candidate profiles..." />
              </div>
            ) : !stats?.recent_candidates || stats.recent_candidates.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No candidates registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recent_candidates.map((cand) => (
                  <div key={cand.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900">{cand.full_name}</div>
                      <div className="text-[11px] text-slate-500">{cand.email}</div>
                      {cand.location && (
                        <div className="text-[10px] text-slate-400">{cand.location}</div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      {cand.education_level && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {cand.education_level}
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {cand.years_of_experience ? `${cand.years_of_experience} yrs exp` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
