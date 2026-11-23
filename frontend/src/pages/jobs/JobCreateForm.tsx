import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, PlusCircle, CheckCircle2 } from 'lucide-react';
import { jobsAPI } from '../../services/api';
import type { JobCreate } from '../../types';
import { AlertBanner } from '../../components/common/AlertBanner';

interface JobFormData {
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string;
  description: string;
  requirements: string;
  skills_input: string;
  salary_min: number;
  salary_max: number;
}

export const JobCreateForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<{ id: number; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormData>({
    defaultValues: {
      title: 'Senior AI Engineer',
      department: 'Engineering & AI',
      location: 'Remote / US',
      employment_type: 'Full-Time',
      experience_level: 'Senior',
      description:
        'Architect, optimize, and deploy scalable LLM agents, LangGraph orchestration pipelines, and enterprise HR automation workflows.',
      requirements:
        '5+ years with Python, FastAPI, vector databases (pgvector), and experience orchestrating multi-agent systems.',
      skills_input: 'Python, FastAPI, LangGraph, PostgreSQL, Docker, PyTorch',
      salary_min: 140000,
      salary_max: 185000,
    },
  });

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const skillsArray = data.skills_input
        ? data.skills_input
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

      const payload: JobCreate = {
        title: data.title.trim(),
        department: data.department.trim() || undefined,
        location: data.location.trim() || undefined,
        employment_type: data.employment_type,
        experience_level: data.experience_level,
        description: data.description.trim(),
        requirements: data.requirements?.trim() || undefined,
        required_skills: skillsArray,
        salary_min: Number(data.salary_min) || undefined,
        salary_max: Number(data.salary_max) || undefined,
      };

      let result;
      if (editId) {
        result = await jobsAPI.update(Number(editId), payload);
      } else {
        result = await jobsAPI.create(payload);
      }

      setCreatedJob({ id: result.id, title: result.title });
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to save job requisition to Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/jobs')}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {editId ? 'Edit Job Requisition' : 'Post New Job Requisition'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define requirements, competencies, and compensation criteria for automated candidate matching.
          </p>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {createdJob ? (
        <div className="p-8 bg-white border border-emerald-200 rounded-xl shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Job Requisition Active!</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Successfully stored in <strong>Supabase PostgreSQL</strong>: &quot;{createdJob.title}&quot; (ID #{createdJob.id}).
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setCreatedJob(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Post Another Job
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              View All Jobs
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-slate-200 rounded-xl shadow-2xs p-6 sm:p-8 space-y-6"
        >
          {/* Requisition Basics */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Requisition Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Job title is required' })}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  {...register('department')}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  {...register('location')}
                  placeholder="e.g. Remote / New York, NY"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Type
                </label>
                <select
                  {...register('employment_type')}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Experience Level
                </label>
                <select
                  {...register('experience_level')}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="Entry">Entry Level (0-2 yrs)</option>
                  <option value="Mid">Mid Level (3-5 yrs)</option>
                  <option value="Senior">Senior Level (5-8 yrs)</option>
                  <option value="Lead">Lead / Staff (8+ yrs)</option>
                  <option value="Executive">Executive / Director</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description & Competencies */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Description & Evaluation Criteria
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  {...register('description', { required: 'Job description is required' })}
                  placeholder="Describe key responsibilities and mission..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-y"
                />
                {errors.description && (
                  <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requirements & Experience
                </label>
                <textarea
                  rows={3}
                  {...register('requirements')}
                  placeholder="Minimum qualifications and past achievements..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Competencies (comma-separated)
                </label>
                <input
                  type="text"
                  {...register('skills_input')}
                  placeholder="Python, FastAPI, React, PostgreSQL, Docker, AWS"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">
              Annual Compensation Range (USD)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Salary ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  {...register('salary_min', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Salary ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  {...register('salary_max', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Requisition...' : editId ? 'Update Requisition' : 'Post Requisition'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
