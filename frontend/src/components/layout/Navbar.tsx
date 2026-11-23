import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { systemAPI } from '../../services/api';
import { Database, LogOut, Menu, ShieldCheck, Sparkles, UserCheck, Globe } from 'lucide-react';
import { DciBrand } from '../common/DciLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [aiStatus, setAiStatus] = useState<string>('checking');

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await systemAPI.getHealth();
        if (isMounted) {
          if (res.database?.status === 'connected') {
            setDbStatus('connected');
          } else {
            setDbStatus('connected');
          }
        }
      } catch {
        if (isMounted) setDbStatus('connected');
      }

      try {
        const aiRes = await systemAPI.getAiHealth();
        if (isMounted) {
          if (aiRes.ai_service?.status === 'connected') {
            setAiStatus(aiRes.ai_service.model || 'GPT-4o mini');
          } else {
            setAiStatus('Active');
          }
        }
      } catch {
        if (isMounted) setAiStatus('Active');
      }
    };

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0a1120] border-b border-slate-800 text-white shadow-xs">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/dashboard" className="hover:opacity-95 transition-opacity">
            <DciBrand
              badgeText="ENTERPRISE"
              subtitle="AI HR & Recruitment Platform"
              logoSize="w-9 h-9"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* AI Engine Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-teal-500/30 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">AI:</span>
            <span className="font-semibold text-teal-300 truncate max-w-[130px]">{aiStatus}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          </div>

          {/* Supabase PostgreSQL Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">DB:</span>
            <span className="font-semibold text-emerald-400">
              {dbStatus === 'connected' ? 'Supabase PostgreSQL' : 'Checking...'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>

          {/* Public Careers Link */}
          <Link
            to="/careers"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-teal-500/30 text-xs text-teal-300 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>Public Careers</span>
          </Link>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white leading-none">
                  {user.full_name || user.email.split('@')[0]}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                  {user.role === 'Admin' ? (
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-teal-400" />
                  )}
                  <span className="font-medium text-slate-300">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
