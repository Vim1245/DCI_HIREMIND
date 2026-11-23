import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DciLogo } from '../../components/common/DciLogo';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Copy,
  ShieldCheck,
  AlertCircle,
  Building2,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';
import { publicCareersAPI } from '../../services/api';
import type { PublicJobDetail, PublicApplicationResponse } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';

interface ApplyFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  education_level: string;
  years_of_experience: number;
  skills: string;
  linkedin_url?: string;
  portfolio_url?: string;
  cover_letter?: string;
}

export const PublicJobApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<PublicJobDetail | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<PublicApplicationResponse | null>(null);
  const [refCopied, setRefCopied] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      location: '',
      education_level: "Bachelor's Degree",
      years_of_experience: 3,
      skills: '',
      linkedin_url: '',
      portfolio_url: '',
      cover_letter: '',
    },
  });

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      setIsLoadingJob(true);
      try {
        const data = await publicCareersAPI.getJob(Number(jobId));
        setJob(data);
      } catch (err: unknown) {
        const msg =
          (err as { parsedMessage?: string }).parsedMessage ||
          'The position you are applying for is closed or unavailable.';
        setJobError(msg);
      } finally {
        setIsLoadingJob(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setResumeFile(null);
      return;
    }

    const file = e.target.files[0];
    const allowed = ['pdf', 'doc', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !allowed.includes(ext)) {
      setResumeError('Invalid file type. Please upload a PDF, DOC, or DOCX document.');
      setResumeFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setResumeError('File size exceeds the 10MB limit. Please upload a smaller document.');
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const onSubmit = async (data: ApplyFormData) => {
    if (!jobId) return;

    if (!resumeFile) {
      setResumeError('Resume upload is required to complete your application.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('first_name', data.first_name.trim());
      formData.append('last_name', data.last_name.trim());
      formData.append('email', data.email.trim());
      formData.append('phone', data.phone.trim());
      formData.append('location', data.location.trim());
      formData.append('education_level', data.education_level.trim());
      formData.append('years_of_experience', data.years_of_experience.toString());
      formData.append('skills', data.skills.trim());
      formData.append('resume', resumeFile);

      if (data.linkedin_url) formData.append('linkedin_url', data.linkedin_url.trim());
      if (data.portfolio_url) formData.append('portfolio_url', data.portfolio_url.trim());
      if (data.cover_letter) formData.append('cover_letter', data.cover_letter.trim());

      const res = await publicCareersAPI.submitApplication(formData);
      setSubmissionSuccess(res);
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to submit your application. Please check your inputs and try again.';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (submissionSuccess?.reference_number) {
      navigator.clipboard.writeText(submissionSuccess.reference_number);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2500);
    }
  };

  if (isLoadingJob) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" message="Loading job opening..." />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Opening Not Found</h2>
          <p className="text-xs text-slate-400">{jobError || 'The job you requested is unavailable.'}</p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20 text-xs rounded-xl hover:bg-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Careers Homepage</span>
          </Link>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION VIEW
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-blue-500/30 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-16 h-16 bg-blue-600/15 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Application Received!</h1>
            <p className="text-sm text-slate-300">
              Thank you, <span className="font-semibold text-blue-400">{submissionSuccess.applicant_name}</span>. Your application for <span className="font-semibold text-white">{submissionSuccess.job_title}</span> has been stored in our recruitment system.
            </p>
          </div>

          {/* Reference Number Pill */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Application Reference Number
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-black text-blue-300 tracking-wider">
                {submissionSuccess.reference_number}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-2 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                title="Copy reference number"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {refCopied && (
              <p className="text-[11px] text-blue-400 font-medium">Copied to clipboard!</p>
            )}
            <p className="text-[11px] text-slate-500">
              Please save this reference number for all future communications with our talent team.
            </p>
          </div>

          <div className="p-4 bg-blue-600/5 rounded-xl border border-blue-500/10 text-xs text-slate-300 text-left space-y-2">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>What Happens Next?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Our human recruitment team will review your qualifications, experience, and uploaded resume against the job criteria. Candidates moving forward to the interview phase will be contacted directly via email or phone.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/careers"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 font-bold text-xs rounded-xl transition-all shadow-md"
            >
              Explore More Openings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // APPLICATION FORM VIEW
  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#060c18]/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to={`/careers/jobs/${job.id}`}
            className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <DciLogo className="w-8 h-8" />
            <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>Back to Role Details</span>
          </Link>

          <div className="text-xs text-slate-400">
            Applying as a <span className="text-sky-400 font-semibold">Public Applicant</span> (No login required)
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Job Context Strip */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Application for Position
            </div>
            <h1 className="text-2xl font-black text-white mt-1">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{job.department}</span>
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{job.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{job.employment_type}</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 bg-blue-600/10 border border-blue-500/20 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[11px] font-bold text-blue-400">100% Free & Open</span>
            <div className="text-[10px] text-slate-400">No account required</div>
          </div>
        </div>

        {submissionError && (
          <AlertBanner
            type="error"
            message={submissionError}
            onClose={() => setSubmissionError(null)}
          />
        )}

        {/* Application Form Card */}
        <div className="bg-slate-950 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 1. Personal & Contact Information */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span>Personal & Contact Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('first_name', { required: 'First name is required' })}
                    placeholder="e.g. Aravind"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                  {errors.first_name && (
                    <p className="text-xs text-rose-400 mt-1">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('last_name', { required: 'Last name is required' })}
                    placeholder="e.g. Krishnan"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                  {errors.last_name && (
                    <p className="text-xs text-rose-400 mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address format',
                      },
                    })}
                    placeholder="aravind@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    {...register('phone', { required: 'Contact phone number is required' })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-400 mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current City & Country <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('location', { required: 'Location is required' })}
                  placeholder="e.g. Chennai, India or Remote / New York"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                />
                {errors.location && (
                  <p className="text-xs text-rose-400 mt-1">{errors.location.message}</p>
                )}
              </div>
            </div>

            {/* 2. Professional Qualifications */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-black">
                  2
                </span>
                <span>Qualifications & Skills</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Educational Qualification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('education_level', { required: 'Education level is required' })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white"
                  >
                    <option value="Bachelor's Degree">Bachelor&apos;s Degree (B.Tech / B.E. / B.S.)</option>
                    <option value="Master's Degree">Master&apos;s Degree (M.Tech / M.S. / M.B.A.)</option>
                    <option value="Doctorate / Ph.D.">Doctorate / Ph.D.</option>
                    <option value="Associate Degree / Diploma">Associate Degree / Diploma</option>
                    <option value="Self-Taught / Boot Camp">Self-Taught / Practical Boot Camp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Years of Relevant Experience <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    {...register('years_of_experience', {
                      required: 'Experience in years is required',
                      valueAsNumber: true,
                    })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white"
                  />
                  {errors.years_of_experience && (
                    <p className="text-xs text-rose-400 mt-1">
                      {errors.years_of_experience.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Key Skills & Technologies (Comma-Separated) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('skills', { required: 'Please list your technical skills' })}
                  placeholder="e.g. Python, FastAPI, React, TypeScript, PostgreSQL, Docker"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                />
                {errors.skills && (
                  <p className="text-xs text-rose-400 mt-1">{errors.skills.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    LinkedIn Profile URL <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    {...register('linkedin_url')}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Portfolio / GitHub URL <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    {...register('portfolio_url')}
                    placeholder="https://github.com/username"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Resume File Upload */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-black">
                  3
                </span>
                <span>Resume Document Upload</span>
              </h2>

              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-900/60">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="resume-upload" className="cursor-pointer block space-y-3">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-blue-400 hover:underline">
                      Click to choose your resume file
                    </span>
                    <span className="text-slate-400 text-sm"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Supported formats: PDF, DOC, DOCX (Maximum file size: 10MB)
                  </p>
                </label>

                {resumeFile && (
                  <div className="mt-4 inline-flex items-center gap-2 p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white">{resumeFile.name}</span>
                    <span className="text-slate-400">
                      ({(resumeFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}

                {resumeError && <p className="text-xs text-rose-400 mt-3">{resumeError}</p>}
              </div>
            </div>

            {/* 4. Cover Letter */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center text-xs font-black">
                  4
                </span>
                <span>Cover Letter / Additional Notes <span className="text-slate-500 font-normal text-xs">(Optional)</span></span>
              </h2>

              <div>
                <textarea
                  rows={4}
                  {...register('cover_letter')}
                  placeholder="Introduce yourself, your key achievements, and why you are excited to join DCI HireMind..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-slate-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-500/20 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl transition-all shadow-xl shadow-teal-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Submitting Application & Uploading Resume to Supabase...'
                    : 'Submit Public Job Application'}
                </span>
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 text-center">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Your application will be stored privately in our Supabase PostgreSQL database. No login required.
                </span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
