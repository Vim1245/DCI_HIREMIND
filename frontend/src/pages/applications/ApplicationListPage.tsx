import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Filter,
  Clock,
  RefreshCw,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  MapPin,
  X,
  Eye,
  FileText,
} from 'lucide-react';
import { hrPortalAPI, jobsAPI } from '../../services/api';
import type { HRApplicationItem, Job } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';

export const ApplicationListPage: React.FC = () => {
  const [applications, setApplications] = useState<HRApplicationItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 10;

  // Filter & Search state
  const [activeStage, setActiveStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [jobsList, setJobsList] = useState<Job[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Review Modal State
  const [reviewApp, setReviewApp] = useState<HRApplicationItem | null>(null);
  const [newStage, setNewStage] = useState<string>('UNDER_REVIEW');
  const [humanDecision, setHumanDecision] = useState<string>('');
  const [humanFeedback, setHumanFeedback] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Detailed Profile Modal State
  const [detailApp, setDetailApp] = useState<any | null>(null);

  const fetchApplications = async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hrPortalAPI.listApplications({
        page: targetPage,
        page_size: pageSize,
        stage: activeStage !== 'ALL' ? activeStage : undefined,
        job_id: selectedJobId !== 'ALL' ? Number(selectedJobId) : undefined,
        q: searchQuery || undefined,
      });

      setApplications(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || targetPage);
      setTotalPages(res.total_pages || 1);
      if (res.stage_counts) {
        setStageCounts(res.stage_counts);
      }
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to load applications from Supabase PostgreSQL.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(1);
  }, [activeStage, selectedJobId]);

  useEffect(() => {
    // Load jobs list for dropdown filter
    const loadJobs = async () => {
      try {
        const res = await jobsAPI.list({ page_size: 50 });
        setJobsList(res.items || []);
      } catch {
        // ignore
      }
    };
    loadJobs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications(1);
  };

  const openReviewModal = (app: HRApplicationItem) => {
    setReviewApp(app);
    setNewStage(app.stage || 'UNDER_REVIEW');
    setHumanDecision(app.human_decision || '');
    setHumanFeedback(app.human_feedback || '');
  };

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewApp) return;

    if (newStage === 'REJECTED' && !humanDecision.trim()) {
      setError(
        'Ethical AI Human-in-the-Loop Policy: An explicit human decision explanation is mandatory when rejecting a candidate.'
      );
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);
    try {
      await hrPortalAPI.updateStatus(reviewApp.id, {
        stage: newStage,
        human_decision: humanDecision.trim() || undefined,
        human_feedback: humanFeedback.trim() || undefined,
      });
      setActionSuccess(`Application #${reviewApp.id} (${reviewApp.candidate_name}) updated to ${newStage}.`);
      setReviewApp(null);
      fetchApplications(page);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to update application status.';
      setError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openDetailModal = async (appId: number) => {
    try {
      const res = await hrPortalAPI.getApplication(appId);
      setDetailApp(res);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to fetch application details.';
      setError(msg);
    }
  };

  const stageTabs = [
    { key: 'ALL', label: 'All Applications' },
    { key: 'APPLIED', label: 'Applied' },
    { key: 'UNDER_REVIEW', label: 'Under Review' },
    { key: 'SHORTLISTED', label: 'Shortlisted' },
    { key: 'INTERVIEW_SCHEDULED', label: 'Interview' },
    { key: 'SELECTED', label: 'Selected' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Application Pipeline Management
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-teal-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
              HR Protected
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Review public applicant submissions, download resumes securely, and track human decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchApplications(page)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner
          type="success"
          message={actionSuccess}
          onClose={() => setActionSuccess(null)}
        />
      )}
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200">
        {stageTabs.map((tab) => {
          const count = stageCounts[tab.key] || 0;
          const isActive = activeStage === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveStage(tab.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Job Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, email, or city..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none cursor-pointer w-full sm:w-64"
          >
            <option value="ALL">All Requisitions</option>
            {jobsList.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex justify-center">
            <LoadingSpinner size="lg" message="Loading candidate applications from Supabase..." />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 p-6">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Applications Match Filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no candidate records in the &quot;{activeStage}&quot; stage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Target Job</th>
                  <th className="py-3 px-4">Ref & Date</th>
                  <th className="py-3 px-4">Resume</th>
                  <th className="py-3 px-4">Status Stage</th>
                  <th className="py-3 px-4">HR Decision</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{app.candidate_name}</div>
                      <div className="text-[11px] text-slate-500">{app.candidate_email}</div>
                      {app.candidate_location && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{app.candidate_location}</span>
                        </div>
                      )}
                    </td>

                    {/* Job */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{app.job_title}</div>
                      <div className="text-[10px] text-slate-500">{app.job_department || 'General'}</div>
                    </td>

                    {/* Ref & Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div className="font-semibold text-teal-700">{app.reference_number}</div>
                      <div className="text-[10px] text-slate-400">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </td>

                    {/* Resume */}
                    <td className="py-3.5 px-4">
                      {app.resume_signed_url ? (
                        <a
                          href={app.resume_signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}
                    </td>

                    {/* Status Stage */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${
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
                    </td>

                    {/* HR Decision / Feedback */}
                    <td className="py-3.5 px-4">
                      {app.human_decision ? (
                        <div>
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {app.human_decision}
                          </div>
                          {app.human_feedback && (
                            <div className="text-[10px] text-slate-500 truncate max-w-xs">
                              &ldquo;{app.human_feedback}&rdquo;
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openDetailModal(app.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={() => openReviewModal(app)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-semibold text-slate-800">{total}</span> applications
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchApplications(page - 1)}
                disabled={page <= 1}
                className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchApplications(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STATUS REVIEW MODAL */}
      {reviewApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Application Stage
                </h3>
                <p className="text-xs text-slate-500">
                  {reviewApp.candidate_name} &bull; {reviewApp.job_title}
                </p>
              </div>
              <button
                onClick={() => setReviewApp(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Recruitment Stage <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="APPLIED">1. Applied</option>
                  <option value="UNDER_REVIEW">2. Under Review</option>
                  <option value="SHORTLISTED">3. Shortlisted</option>
                  <option value="INTERVIEW_SCHEDULED">4. Interview Scheduled</option>
                  <option value="SELECTED">5. Selected / Hired</option>
                  <option value="REJECTED">6. Rejected</option>
                </select>
              </div>

              {/* Zero Auto-Rejection Alert when REJECTED is selected */}
              {newStage === 'REJECTED' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Ethical AI Gate: Human Decision Required</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Under DCI HireMind&apos;s Zero Auto-Rejection policy, candidates can never be rejected by an AI algorithm. You must supply an explicit human decision explanation.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Human Decision Rationale {newStage === 'REJECTED' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                </label>
                <input
                  type="text"
                  value={humanDecision}
                  onChange={(e) => setHumanDecision(e.target.value)}
                  placeholder={
                    newStage === 'REJECTED'
                      ? 'e.g. Lacks required 5+ years experience in distributed systems'
                      : 'e.g. Candidate approved for technical panel interview'
                  }
                  required={newStage === 'REJECTED'}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal HR Notes & Feedback <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={humanFeedback}
                  onChange={(e) => setHumanFeedback(e.target.value)}
                  placeholder="Private internal notes for hiring managers and recruiters..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isUpdatingStatus ? 'Saving in PostgreSQL...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANDIDATE DETAIL MODAL */}
      {detailApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {detailApp.application?.reference_number}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {detailApp.candidate?.full_name}
                </h2>
                <p className="text-xs text-slate-500">
                  Applied for {detailApp.job?.title} &bull; {detailApp.job?.department}
                </p>
              </div>
              <button
                onClick={() => setDetailApp(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Email Address</div>
                <div className="font-semibold text-slate-900 mt-0.5">{detailApp.candidate?.email}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Phone Number</div>
                <div className="font-semibold text-slate-900 mt-0.5">{detailApp.candidate?.phone || 'Not provided'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Location</div>
                <div className="font-semibold text-slate-900 mt-0.5">{detailApp.candidate?.location || 'Not provided'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Education</div>
                <div className="font-semibold text-slate-900 mt-0.5">{detailApp.candidate?.education_level || 'Not provided'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Experience</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {detailApp.candidate?.years_of_experience ? `${detailApp.candidate.years_of_experience} Years` : 'Not provided'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Current Stage</div>
                <div className="font-bold text-teal-700 mt-0.5">{detailApp.application?.stage}</div>
              </div>
            </div>

            {/* Skills */}
            {detailApp.candidate?.skills && detailApp.candidate.skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Candidate Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {detailApp.candidate.skills.map((s: string, idx: number) => (
                    <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            {detailApp.application?.cover_letter && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Submitted Cover Letter</h4>
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-line leading-relaxed border border-slate-200/60">
                  {detailApp.application.cover_letter}
                </div>
              </div>
            )}

            {/* Resume File */}
            {detailApp.resume && (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-teal-900">{detailApp.resume.file_name}</div>
                    <div className="text-[10px] text-teal-700">Supabase Storage Verified</div>
                  </div>
                </div>
                {detailApp.resume.signed_url && (
                  <a
                    href={detailApp.resume.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Resume</span>
                  </a>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailApp(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
