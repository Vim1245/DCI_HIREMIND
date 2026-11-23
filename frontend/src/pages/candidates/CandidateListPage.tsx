import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { candidatesAPI } from '../../services/api';
import type { Candidate } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const CandidateListPage: React.FC = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 10;

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Delete / Archive Modal State
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const fetchCandidates = async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await candidatesAPI.list({
        page: targetPage,
        page_size: pageSize,
        q: searchTerm || undefined,
        status: statusFilter || undefined,
      });
      setCandidates(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || targetPage);
      setTotalPages(res.total_pages || 1);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to load candidates.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates(1);
  };

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;
    try {
      await candidatesAPI.delete(candidateToDelete.id);
      setActionSuccess(`Candidate ${candidateToDelete.first_name} ${candidateToDelete.last_name} was archived successfully.`);
      setCandidateToDelete(null);
      fetchCandidates(page);
    } catch (err: unknown) {
      const msg = (err as { parsedMessage?: string }).parsedMessage || 'Failed to archive candidate.';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse candidate profiles, inspect skills, and manage blind-screening applications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCandidates(page)}
            disabled={isLoading}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/candidates/register"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}
      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or skill (e.g. Python, React)..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="SCREENING">SCREENING</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="SHORTLISTED">SHORTLISTED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <button
          onClick={() => fetchCandidates(1)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Filter
        </button>
      </div>

      {/* Candidates Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Querying Supabase PostgreSQL..." />
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No candidates found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or register a new candidate.
            </p>
            <Link
              to="/candidates/register"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Candidate</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">Ethical Anonymized ID</th>
                  <th className="py-3.5 px-4">Skills & Exp</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {cand.first_name} {cand.last_name}
                      </div>
                      <div className="text-xs text-slate-500">{cand.email}</div>
                      {cand.phone && <div className="text-[11px] text-slate-400">{cand.phone}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md w-fit">
                        <Shield className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>{cand.anonymized_id ? `${cand.anonymized_id.slice(0, 10)}...` : `ID-${cand.id}`}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {cand.location || 'Location Not Specified'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800">
                        {cand.years_of_experience ? `${cand.years_of_experience} yrs experience` : 'Experience not listed'}
                      </div>
                      {cand.skills && cand.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 max-w-xs">
                          {cand.skills.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-md font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {cand.skills.length > 4 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{cand.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          cand.status === 'SHORTLISTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cand.status === 'ARCHIVED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {cand.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedCandidate(cand)}
                          title="View Dossier"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/candidates/register?edit_id=${cand.id}`)}
                          title="Edit Profile"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCandidateToDelete(cand)}
                          title="Archive Record"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
          <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
            <div>
              Showing <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-semibold text-slate-800">{total}</span> candidates
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCandidates(page - 1)}
                disabled={page <= 1}
                className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchCandidates(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Dossier Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCandidate.first_name} {selectedCandidate.last_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Anonymized ID: {selectedCandidate.anonymized_id}
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedCandidate.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block font-medium">Email</span>
                <span className="font-semibold text-slate-800">{selectedCandidate.email}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block font-medium">Phone</span>
                <span className="font-semibold text-slate-800">{selectedCandidate.phone || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block font-medium">Location</span>
                <span className="font-semibold text-slate-800">{selectedCandidate.location || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block font-medium">Education</span>
                <span className="font-semibold text-slate-800">{selectedCandidate.education_level || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">Skills Matrix</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                  selectedCandidate.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-medium"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No skills specified</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!candidateToDelete}
        title="Archive Candidate Profile"
        message={`Are you sure you want to archive candidate ${candidateToDelete?.first_name} ${candidateToDelete?.last_name}? This will mark their profile status as ARCHIVED in Supabase PostgreSQL.`}
        confirmText="Archive Candidate"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCandidateToDelete(null)}
      />
    </div>
  );
};
