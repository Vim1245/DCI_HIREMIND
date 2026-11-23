import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  PlusCircle,
  MapPin,
  DollarSign,
  Edit2,
  Trash2,
  RefreshCw,
  Send,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { jobsAPI, candidatesAPI, applicationsAPI } from '../../services/api';
import type { Job, Candidate } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const JobListPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 9;

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Job deletion state
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Apply Modal state
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | ''>('');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);

  const fetchJobs = async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await jobsAPI.list({
        page: targetPage,
        page_size: pageSize,
        q: searchTerm || undefined,
        status: statusFilter || undefined,
      });
      setJobs(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || targetPage);
      setTotalPages(res.total_pages || 1);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to load jobs from Supabase.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(1);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await jobsAPI.delete(jobToDelete.id);
      setActionSuccess(`Job "${jobToDelete.title}" has been closed.`);
      setJobToDelete(null);
      fetchJobs(page);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to close job.';
      setError(msg);
    }
  };

  const openApplyModal = async (job: Job) => {
    setApplyJob(job);
    setSelectedCandidateId('');
    setCoverLetter('');
    try {
      const res = await candidatesAPI.list({ page_size: 50 });
      setAvailableCandidates(res.items || []);
      if (res.items && res.items.length > 0) {
        setSelectedCandidateId(res.items[0].id);
      }
    } catch {
      // Ignore
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyJob || !selectedCandidateId) return;

    setIsSubmittingApp(true);
    setError(null);
    try {
      await applicationsAPI.create({
        job_id: applyJob.id,
        candidate_id: Number(selectedCandidateId),
        cover_letter: coverLetter || undefined,
      });
      setActionSuccess(`Application submitted successfully for candidate #${selectedCandidateId} to job "${applyJob.title}".`);
      setApplyJob(null);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to submit application.';
      setError(msg);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Requisitions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open employment requisitions, skill criteria, and automated candidate match pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchJobs(page)}
            disabled={isLoading}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
            title="Refresh Jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title (e.g. Engineer, AI, Full-Stack)..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <button
          onClick={() => fetchJobs(1)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <LoadingSpinner text="Fetching job requisitions from Supabase PostgreSQL..." />
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No job requisitions found</p>
          <p className="text-xs text-slate-400">
            Create an open position to begin receiving and screening candidate applications.
          </p>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post New Job</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                      job.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : job.status === 'CLOSED'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {job.status}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => navigate(`/jobs/new?edit_id=${job.id}`)}
                      title="Edit Job"
                      className="p-1 hover:text-amber-600 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setJobToDelete(job)}
                      title="Close Job"
                      className="p-1 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{job.title}</h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                  {job.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Skills tags */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.required_skills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-md font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                    {job.required_skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{job.required_skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  {job.salary_min || job.salary_max ? (
                    <span className="font-semibold text-slate-800 flex items-center gap-0.5">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      {job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k` : '0'} -{' '}
                      {job.salary_max ? `${(job.salary_max / 1000).toFixed(0)}k` : 'Open'}
                    </span>
                  ) : (
                    <span className="text-slate-400">Salary Negotiable</span>
                  )}
                </div>

                <button
                  onClick={() => openApplyModal(job)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Apply Candidate</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 shadow-2xs">
          <div>
            Showing <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span> requisitions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchJobs(page - 1)}
              disabled={page <= 1}
              className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchJobs(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Apply Candidate Modal */}
      {applyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submit Candidate Application
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Job: <span className="font-semibold text-slate-800">{applyJob.title}</span> (ID #{applyJob.id})
                </p>
              </div>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Candidate <span className="text-rose-500">*</span>
                </label>
                {availableCandidates.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No candidates found in directory. Please{' '}
                    <Link to="/candidates/register" className="font-semibold underline">
                      register a candidate
                    </Link>{' '}
                    first.
                  </div>
                ) : (
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    {availableCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cover Letter / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Candidate notes, referral origin, or background highlights..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApp || !selectedCandidateId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingApp ? 'Submitting...' : 'Confirm Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!jobToDelete}
        title="Close Job Requisition"
        message={`Are you sure you want to close requisition "${jobToDelete?.title}"? Its status will be updated to CLOSED in Supabase.`}
        confirmText="Close Requisition"
        onConfirm={handleConfirmDelete}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
};
