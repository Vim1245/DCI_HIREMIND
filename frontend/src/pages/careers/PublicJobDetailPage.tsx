import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Zap,
  Briefcase,
  MapPin,
  Clock,
  Award,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { publicCareersAPI } from '../../services/api';
import type { PublicJobDetail } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PublicJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [job, setJob] = useState<PublicJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await publicCareersAPI.getJob(Number(id));
        setJob(data);
      } catch (err: unknown) {
        const msg =
          (err as { parsedMessage?: string }).parsedMessage ||
          'The requested job opening could not be found or is no longer accepting applications.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetail();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" message="Loading job opening details from DCI HireMind..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <Briefcase className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Job Not Available</h2>
          <p className="text-xs text-slate-400">{error || 'Job requisition was not found.'}</p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse All Open Roles</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#060c18]/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/careers"
            className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <span>DCI HireMind Careers</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-teal-400" />
              <span>{copied ? 'Link Copied!' : 'Share Role'}</span>
            </button>
            <Link
              to={`/careers/apply/${job.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shadow-sm"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Hero Card */}
        <div className="bg-slate-950 rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl"></div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              {job.department || 'General Department'}
            </span>
            <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full">
              {job.employment_type}
            </span>
            {job.experience_level && (
              <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.experience_level} Level</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {job.title}
          </h1>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            {job.location && (
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Location</span>
                </div>
                <div className="font-semibold text-slate-200">{job.location}</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Employment Type</span>
              </div>
              <div className="font-semibold text-slate-200">{job.employment_type}</div>
            </div>

            {(job.salary_min || job.salary_max) && (
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salary Estimate</span>
                </div>
                <div className="font-semibold text-teal-400">
                  ${job.salary_min ? job.salary_min.toLocaleString() : '0'}
                  {job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : '+'}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Review Policy</span>
              </div>
              <div className="font-semibold text-teal-300">Human Decision Guaranteed</div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-400" />
                <span>Role Overview & Responsibilities</span>
              </h2>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Candidate Requirements & Qualifications</span>
                </h2>
                <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {job.requirements}
                </div>
              </div>
            )}

            {/* Application Banner Callout */}
            <div className="bg-linear-to-r from-teal-500/15 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-2xl border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-white">Ready to Shape the Future with Us?</h3>
                <p className="text-xs text-slate-300">
                  Applications take under 3 minutes with no account creation or login required.
                </p>
              </div>
              <Link
                to={`/careers/apply/${job.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all shadow-lg shadow-teal-500/20 shrink-0"
              >
                <span>Apply for this Role</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Sidebar: Skills & Info */}
          <div className="space-y-6">
            {/* Required Skills Card */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Target Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {job.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold bg-slate-900 border border-slate-800 text-teal-300 px-3 py-1 rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hiring Process Card */}
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Our Transparent Hiring Journey
              </h3>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">Public Application</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submit resume and details without registration. Receive instant tracking ref.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">Human Recruiter Review</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Every single profile is evaluated by our talent acquisition team. Zero automated rejections.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">Interactive Interview</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Technical discussion and team alignment conversation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
