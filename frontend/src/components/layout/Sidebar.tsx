import React from 'react';
import { NavLink } from 'react-router-dom';
import { DciBrand } from '../common/DciLogo';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  PlusCircle,
  FileCheck2,
  FileText,
  Bot,
  ShieldCheck,
  Settings,
  X,
  Sparkles,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const primaryNavItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/candidates',
      label: 'Candidates',
      icon: Users,
    },
    {
      to: '/candidates/register',
      label: 'Add Candidate',
      icon: UserPlus,
    },
    {
      to: '/jobs',
      label: 'Job Requisitions',
      icon: Briefcase,
    },
    {
      to: '/jobs/new',
      label: 'Post New Job',
      icon: PlusCircle,
    },
    {
      to: '/applications',
      label: 'Applications Pipeline',
      icon: FileCheck2,
    },
    {
      to: '/resumes',
      label: 'Resume Management',
      icon: FileText,
    },
  ];

  const intelligenceNavItems = [
    {
      to: '/ai-assistant',
      label: 'AI Recruitment Assistant',
      icon: Bot,
      highlight: true,
    },
    {
      to: '/ethical-guard',
      label: 'Ethical AI Guard',
      icon: ShieldCheck,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1120] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto shrink-0 select-none`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <DciBrand
            badgeText="ENTERPRISE"
            logoSize="w-8 h-8"
            subtitle=""
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="p-3.5 space-y-6 flex-1 overflow-y-auto">
          {/* Main Recruitment Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Recruitment Ops
            </div>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* AI & Platform Intelligence Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-teal-400 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>AI & Governance</span>
            </div>
            {intelligenceNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      AI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Public Portal Link */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Public Access</span>
            </div>
            <a
              href="/careers"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-teal-300 transition-all"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Globe className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                <span className="truncate">Public Careers Site</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Ethical AI Guard Badge Card */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between font-semibold text-teal-300 mb-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs">Ethical AI Active</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Human recruiter oversight enforced. Zero automated candidate rejection.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
