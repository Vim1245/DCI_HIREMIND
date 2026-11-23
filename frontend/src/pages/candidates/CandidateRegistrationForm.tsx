import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UserPlus, Upload, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { candidatesAPI } from '../../services/api';
import type { CandidateCreate } from '../../types';
import { AlertBanner } from '../../components/common/AlertBanner';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  skills_input: string;
  years_of_experience: number;
  education_level: string;
}

export const CandidateRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id');

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: number;
    anonymized_id: string;
    email: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      location: '',
      skills_input: 'Python, FastAPI, React, SQL',
      years_of_experience: 3,
      education_level: "Bachelor's Degree",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse skills from comma-separated string
      const skillsArray = data.skills_input
        ? data.skills_input
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

      const candidatePayload: CandidateCreate = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || undefined,
        location: data.location?.trim() || undefined,
        skills: skillsArray,
        years_of_experience: Number(data.years_of_experience) || 0,
        education_level: data.education_level || undefined,
      };

      // 1. Create or Update Candidate in Supabase PostgreSQL
      let candidate;
      if (editId) {
        candidate = await candidatesAPI.update(Number(editId), candidatePayload);
      } else {
        candidate = await candidatesAPI.create(candidatePayload);
      }

      // 2. Upload Resume File if attached
      if (resumeFile && candidate.id) {
        try {
          await candidatesAPI.uploadResume(candidate.id, resumeFile);
        } catch (uploadErr) {
          console.warn('Resume upload note:', uploadErr);
          // Non-fatal if candidate record was created
        }
      }

      setSuccessResult({
        id: candidate.id,
        anonymized_id: candidate.anonymized_id,
        email: candidate.email,
      });
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to register candidate in Supabase database.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/candidates')}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {editId ? 'Edit Candidate Profile' : 'Candidate Registration'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Collect candidate details, upload resumes, and generate ethical blind-screening IDs.
          </p>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Success Modal / Banner */}
      {successResult ? (
        <div className="p-8 bg-white border border-emerald-200 rounded-xl shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Candidate Successfully Registered!
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Profile permanently saved in <strong>Supabase PostgreSQL</strong>.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-w-sm mx-auto text-xs space-y-1">
            <div className="text-slate-500">
              Database ID: <span className="font-mono font-bold text-slate-800">#{successResult.id}</span>
            </div>
            <div className="text-slate-500">
              Email: <span className="font-semibold text-slate-800">{successResult.email}</span>
            </div>
            <div className="text-slate-500">
              Ethical Anonymized ID:{' '}
              <span className="font-mono text-teal-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {successResult.anonymized_id}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setSuccessResult(null);
                setResumeFile(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Add Another Candidate
            </button>
            <button
              onClick={() => navigate('/candidates')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              View Candidates Directory
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-slate-200 rounded-xl shadow-2xs p-6 sm:p-8 space-y-6"
        >
          {/* Section 1: Personal Details */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('first_name', { required: 'First name is required' })}
                  placeholder="e.g. Sarah"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                {errors.first_name && (
                  <p className="text-xs text-rose-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('last_name', { required: 'Last name is required' })}
                  placeholder="e.g. Jenkins"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                {errors.last_name && (
                  <p className="text-xs text-rose-500 mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  placeholder="sarah.jenkins@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  {...register('location')}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Qualifications */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Skills & Qualifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  {...register('skills_input')}
                  placeholder="Python, FastAPI, React, PostgreSQL, Docker, Machine Learning"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Separate key technical proficiencies and competencies with commas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  {...register('years_of_experience', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highest Education Level
                </label>
                <select
                  {...register('education_level')}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white"
                >
                  <option value="High School">High School Diploma</option>
                  <option value="Associate Degree">Associate Degree</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate / PhD">Doctorate / PhD</option>
                  <option value="Self-Taught / Bootcamp">Bootcamp / Self-Taught</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Resume Document Upload */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Resume Document
            </h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 bg-slate-50/50 transition-colors">
              <input
                type="file"
                id="resume-file-input"
                accept=".pdf,.docx,.doc"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="resume-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-white rounded-full border border-slate-200 text-indigo-600 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {resumeFile ? resumeFile.name : 'Click to select or drag resume file'}
                </div>
                <p className="text-xs text-slate-400">
                  {resumeFile
                    ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload to Supabase Storage`
                    : 'Supported formats: PDF, DOCX (Max 10MB)'}
                </p>
              </label>
              {resumeFile && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700">
                  <FileText className="w-4 h-4" />
                  <span>{resumeFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setResumeFile(null);
                    }}
                    className="ml-2 text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/candidates')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Supabase...' : editId ? 'Update Profile' : 'Register Candidate'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
