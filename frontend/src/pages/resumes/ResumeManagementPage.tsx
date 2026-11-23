import React, { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  User,
} from 'lucide-react';
import { resumesAPI, candidatesAPI } from '../../services/api';
import type { ResumeItem, Candidate } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';

export const ResumeManagementPage: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resumesResult, candidatesResult] = await Promise.allSettled([
        resumesAPI.list({ page_size: 50 }),
        candidatesAPI.list({ page_size: 100 }),
      ]);

      if (candidatesResult.status === 'fulfilled') {
        const cItems = candidatesResult.value.items || [];
        setCandidates(cItems);
        if (cItems.length > 0 && selectedCandidateId === '') {
          setSelectedCandidateId(cItems[0].id);
        }
      }

      if (resumesResult.status === 'fulfilled') {
        setResumes(resumesResult.value.items || []);
      }

      if (resumesResult.status === 'rejected' && candidatesResult.status === 'rejected') {
        const msg =
          (resumesResult.reason as { parsedMessage?: string })?.parsedMessage ||
          'Failed to load resume documents and candidate list.';
        setError(msg);
      } else if (resumesResult.status === 'rejected') {
        const msg =
          (resumesResult.reason as { parsedMessage?: string })?.parsedMessage ||
          'Failed to load uploaded resumes from Supabase Storage.';
        setError(msg);
      } else if (candidatesResult.status === 'rejected') {
        const msg =
          (candidatesResult.reason as { parsedMessage?: string })?.parsedMessage ||
          'Failed to load candidate list.';
        setError(msg);
      }
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string })?.parsedMessage ||
        'Failed to load resume documents from Supabase Storage.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedCandidateId) {
      setError('Please select a candidate and a valid resume file (PDF or DOCX).');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await resumesAPI.upload(Number(selectedCandidateId), uploadFile);
      setSuccessMsg(result.message || 'Resume uploaded successfully to Supabase Storage!');
      setUploadFile(null);
      // Reset input
      const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to upload resume document to Supabase Storage.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredResumes = resumes.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.file_name.toLowerCase().includes(q) ||
      (r.candidate_name && r.candidate_name.toLowerCase().includes(q)) ||
      (r.candidate_email && r.candidate_email.toLowerCase().includes(q))
    );
  });

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Resume Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage candidate CVs, parse candidate qualifications, and securely access files in Supabase Storage.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Upload Box */}
      <div className="enterprise-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Upload New Resume</h2>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Candidate
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.first_name || ''} {cand.last_name || ''} ({cand.email})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Resume Document (.pdf, .docx)
            </label>
            <input
              id="resume-file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-teal-700 hover:file:bg-blue-100"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isUploading || !uploadFile || !selectedCandidateId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Resumes List Header & Search */}
      <div className="enterprise-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Uploaded Resumes ({resumes.length})
            </h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading candidate resumes from Supabase Storage..." />
        ) : filteredResumes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">No resumes found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'No resumes match your search query.'
                : 'Upload a PDF or DOCX resume to start AI candidate screening and talent analysis.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 truncate max-w-xs">
                            {resume.file_name}
                          </div>
                          <div className="text-xs text-slate-400 uppercase font-mono">
                            {resume.file_type || 'PDF'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-800">
                            {resume.candidate_name || `Candidate #${resume.candidate_id}`}
                          </div>
                          {resume.candidate_email && (
                            <div className="text-xs text-slate-400">{resume.candidate_email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                      {formatFileSize(resume.file_size_bytes)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {resume.parsing_status || 'UPLOADED'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {resume.created_at
                            ? new Date(resume.created_at).toLocaleDateString()
                            : 'Recent'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {resume.signed_url ? (
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={resume.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Preview</span>
                          </a>
                          <a
                            href={resume.signed_url}
                            download={resume.file_name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Storage link private</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
