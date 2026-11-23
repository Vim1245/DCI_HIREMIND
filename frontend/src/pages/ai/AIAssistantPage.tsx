import React, { useEffect, useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Award,
} from 'lucide-react';
import { aiAPI, candidatesAPI, jobsAPI } from '../../services/api';
import type { Candidate, Job, AIChatMessage, AIMatchResponse } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertBanner } from '../../components/common/AlertBanner';

export const AIAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'matching'>('copilot');

  // Context selectors
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | ''>('');
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');

  // Chat state
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your DCI HireMind AI Recruitment Copilot. I can evaluate candidate resumes, assess job requisition fit, draft interview guides, and analyze skill alignments. How can I assist your recruitment team today?',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('openai/gpt-4o-mini');

  // Match state
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<AIMatchResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [candRes, jobRes, aiStatus] = await Promise.all([
          candidatesAPI.list({ page_size: 50 }),
          jobsAPI.list({ page_size: 50 }),
          aiAPI.getStatus().catch(() => null),
        ]);
        setCandidates(candRes.items || []);
        setJobs(jobRes.items || []);
        if (candRes.items && candRes.items.length > 0) setSelectedCandidateId(candRes.items[0].id);
        if (jobRes.items && jobRes.items.length > 0) setSelectedJobId(jobRes.items[0].id);
        if (aiStatus?.ai_service?.model) {
          setModelName(aiStatus.ai_service.model);
        }
      } catch (err: unknown) {
        const msg =
          (err as { parsedMessage?: string }).parsedMessage ||
          'Failed to initialize AI recruitment assistant.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isSending) return;

    const userMsg = inputPrompt.trim();
    setInputPrompt('');
    const newHistory: AIChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setIsSending(true);
    setError(null);

    try {
      const response = await aiAPI.chat(
        userMsg,
        newHistory,
        selectedCandidateId ? Number(selectedCandidateId) : undefined,
        selectedJobId ? Number(selectedJobId) : undefined
      );

      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.model) setModelName(response.model);
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to receive AI response. Please ensure OpenAI API key is active.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error communicating with AI service: ${msg}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunMatch = async () => {
    if (!selectedCandidateId || !selectedJobId) {
      setError('Please select both a candidate and a job requisition.');
      return;
    }

    setIsMatching(true);
    setError(null);
    setMatchResult(null);

    try {
      const result = await aiAPI.match(Number(selectedCandidateId), Number(selectedJobId));
      setMatchResult(result);
    } catch (err: unknown) {
      const msg =
        (err as { parsedMessage?: string }).parsedMessage ||
        'Failed to generate AI candidate-job matching analysis.';
      setError(msg);
    } finally {
      setIsMatching(false);
    }
  };

  const quickPrompts = [
    'Assess candidate fit against selected job requirements',
    'Generate 5 role-specific technical interview questions',
    'Summarize candidate core strengths and development areas',
    'Draft a personalized interview invitation note',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI Recruitment Intelligence
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-teal-700 border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>{modelName}</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Enterprise candidate screening, contextual role fit analysis, and ethical talent evaluation.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'copilot'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Recruiter Chat
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'matching'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Role Matching Engine
          </button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} onClose={() => setError(null)} />}

      {/* Context Selection Bar */}
      <div className="enterprise-card p-4 bg-slate-900 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Active Candidate Context</span>
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">-- No Candidate Selected (General Query) --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.email}) - {c.years_of_experience || 0} yrs exp
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              <span>Active Job Requisition Context</span>
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">-- No Job Selected (General Query) --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department || 'General'}) - {j.location || 'Remote'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Connecting to AI recruitment engine..." />
      ) : activeTab === 'copilot' ? (
        /* ================= COPILOT CHAT VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Box */}
          <div className="lg:col-span-3 enterprise-card flex flex-col h-[600px]">
            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-xl p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100/90 text-slate-800 border border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex gap-3 justify-start items-center text-xs text-slate-400 italic">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-600 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <span>AI Copilot is analyzing recruitment data...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask HireMind AI about candidate fit, interview guides, skill gaps..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputPrompt.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Prompts & Ethical Guard Info */}
          <div className="space-y-4">
            <div className="enterprise-card p-4 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Quick Prompts</span>
              </div>
              <div className="space-y-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputPrompt(prompt);
                    }}
                    className="w-full text-left p-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50/70 hover:text-teal-900 border border-slate-200/80 rounded-lg transition-colors leading-snug"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            <div className="enterprise-card p-4 bg-blue-50/50 border-blue-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-teal-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Ethical AI Directive</span>
              </div>
              <p className="text-teal-950 text-[11px] leading-relaxed">
                HireMind AI assists recruitment decision-making by scoring competency alignment. It cannot automatically disqualify applicants without human approval.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ================= MATCHING ENGINE VIEW ================= */
        <div className="space-y-6">
          <div className="enterprise-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Automated Candidate-to-Job Matching Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates transparent competency scores based on required skills, experience level, and domain qualifications.
              </p>
            </div>
            <button
              onClick={handleRunMatch}
              disabled={isMatching || !selectedCandidateId || !selectedJobId}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors shrink-0"
            >
              {isMatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Calculating Match...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Matching Analysis</span>
                </>
              )}
            </button>
          </div>

          {matchResult && (
            <div className="enterprise-card p-6 space-y-6">
              {/* Score Header */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div className="space-y-1 text-center md:text-left">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Role Fit Assessment
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {matchResult.candidate_name} → {matchResult.job_title}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xl">{matchResult.analysis}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-2xl min-w-[120px]">
                    <div className="text-3xl font-extrabold text-teal-700">
                      {matchResult.match_score}%
                    </div>
                    <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mt-0.5">
                      Match Score
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl min-w-[160px]">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Recommendation
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>{matchResult.recommendation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Gaps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Identified Strengths & Overlap</span>
                  </div>
                  <ul className="space-y-2">
                    {matchResult.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Skill Gaps / Exploration Areas</span>
                  </div>
                  <ul className="space-y-2">
                    {matchResult.gaps.map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-amber-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ethical Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{matchResult.ethical_note}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
