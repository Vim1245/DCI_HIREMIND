import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DciBrand } from '../../components/common/DciLogo';
import {
  Zap,
  Briefcase,
  Search,
  MapPin,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Mail,
  Phone,
  Globe,
  TrendingUp,
  Cpu,
  Code,
  Users,
  Palette,
  HeartHandshake,
  GraduationCap,
  Target,
  Compass,
  Menu,
  X,
  Send,
  Laptop,
} from 'lucide-react';
import { publicCareersAPI } from '../../services/api';
import type { PublicJobSummary } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const CareersHomePage: React.FC = () => {
  const [jobs, setJobs] = useState<PublicJobSummary[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await publicCareersAPI.listJobs({
        q: searchQuery || undefined,
        department: selectedDept !== 'All' ? selectedDept : undefined,
        location: selectedLocation !== 'All' ? selectedLocation : undefined,
        employment_type: selectedType !== 'All' ? selectedType : undefined,
      });
      setJobs(res.items || []);
      setTotal(res.total || 0);
      if (res.departments && res.departments.length > 0) {
        setDepartments(res.departments);
      }
      if (res.locations && res.locations.length > 0) {
        setLocations(res.locations);
      }
    } catch (err) {
      console.error('Failed to load published jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedDept, selectedLocation, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setIsSubmittingContact(true);
    setTimeout(() => {
      setIsSubmittingContact(false);
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
      setTimeout(() => setContactSubmitted(false), 6000);
    }, 800);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helper for Department icon
  const getDepartmentIcon = (dept?: string | null) => {
    const d = (dept || '').toLowerCase();
    if (d.includes('ai') || d.includes('intelligence') || d.includes('machine')) {
      return <Cpu className="w-4 h-4 text-[#00D4D8]" />;
    }
    if (d.includes('engineer') || d.includes('tech') || d.includes('software')) {
      return <Code className="w-4 h-4 text-[#00C9A7]" />;
    }
    if (d.includes('design') || d.includes('product') || d.includes('ux')) {
      return <Palette className="w-4 h-4 text-purple-400" />;
    }
    if (d.includes('hr') || d.includes('talent') || d.includes('people')) {
      return <Users className="w-4 h-4 text-amber-400" />;
    }
    return <Briefcase className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-[#00D4D8] selection:text-[#0B1120]">
      {/* ========================================================================= */}
      {/* 1. HEADER & BRANDING (Cyan/Teal Lightning Bolt Icon + DCI HireMind)       */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#0B1120]/95 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Subtitle */}
          <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => scrollToSection('hero')}>
            <DciBrand
              badgeText="CAREERS"
              subtitle="Enterprise AI Talent Opportunities"
              logoSize="w-11 h-11 group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToSection('open-positions')}
              className="hover:text-[#00D4D8] transition-colors cursor-pointer"
            >
              Open Positions
            </button>
            <button
              onClick={() => scrollToSection('about-us')}
              className="hover:text-[#00D4D8] transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection('why-join-us')}
              className="hover:text-[#00D4D8] transition-colors cursor-pointer"
            >
              Why Join Us
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-[#00D4D8] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* HR Admin Portal Button */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm shadow-black/40 hover:border-[#00D4D8]/40 hover:shadow-[#00D4D8]/10"
            >
              <LogIn className="w-3.5 h-3.5 text-[#00D4D8]" />
              <span>HR Admin Portal</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="p-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg"
              title="HR Portal"
            >
              <LogIn className="w-4 h-4 text-[#00D4D8]" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 rounded-lg"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0B1120] border-b border-slate-800 px-4 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('open-positions')}
              className="block w-full text-left py-2 text-sm text-slate-300 hover:text-[#00D4D8] font-medium"
            >
              Open Positions
            </button>
            <button
              onClick={() => scrollToSection('about-us')}
              className="block w-full text-left py-2 text-sm text-slate-300 hover:text-[#00D4D8] font-medium"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection('why-join-us')}
              className="block w-full text-left py-2 text-sm text-slate-300 hover:text-[#00D4D8] font-medium"
            >
              Why Join Us
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left py-2 text-sm text-slate-300 hover:text-[#00D4D8] font-medium"
            >
              Contact
            </button>
            <div className="pt-2 border-t border-slate-800">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-slate-800 rounded-lg border border-slate-700"
              >
                <LogIn className="w-3.5 h-3.5 text-[#00D4D8]" />
                <span>HR Admin Portal</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION – VISUALLY RICH CORPORATE ATMOSPHERE                       */}
      {/* ========================================================================= */}
      <section id="hero" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-[#0B1120] via-[#09152b] to-[#0B1120]">
        {/* Glow Spheres & Gradient Accents */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00D4D8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#00C9A7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading, Subtitle & Dual CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00D4D8]/10 border border-[#00D4D8]/25 text-[#00D4D8] text-xs font-semibold tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#00D4D8] animate-pulse" />
                <span>Now Hiring · {total} Live Requisitions Across Engineering & AI</span>
              </div>

              {/* Large Main Heading (Exact wording) */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Build Your Future with{' '}
                <span className="bg-gradient-to-r from-[#00D4D8] via-[#00C9A7] to-emerald-400 bg-clip-text text-transparent">
                  DCI HireMind
                </span>
              </h1>

              {/* Subtitle (Exact wording) */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Discover exciting career opportunities and become part of an innovative, AI-driven workforce.
              </p>

              {/* Two CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => scrollToSection('open-positions')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#00D4D8] to-[#00C9A7] hover:from-cyan-400 hover:to-teal-400 text-[#0B1120] font-bold text-sm rounded-xl shadow-lg shadow-[#00D4D8]/25 hover:shadow-[#00D4D8]/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Explore Opportunities</span>
                </button>

                <button
                  onClick={() => scrollToSection('about-us')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <span>Learn More About Us</span>
                  <ArrowRight className="w-4 h-4 text-[#00D4D8]" />
                </button>
              </div>

              {/* Trust Metric Badges */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-black text-white">{total}+</div>
                  <div className="text-xs text-slate-400 mt-0.5">Open Positions</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#00D4D8]">100%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Fair & Ethical AI</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#00C9A7]">48h</div>
                  <div className="text-xs text-slate-400 mt-0.5">Average Review Time</div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Quality Corporate Image with Floating Accent Badges */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative glow backing */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#00D4D8]/20 via-[#00C9A7]/20 to-purple-500/20 rounded-3xl blur-xl opacity-75" />

                {/* Main Office Image */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl shadow-[#00D4D8]/10">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                    alt="DCI HireMind Corporate Team Collaborating and Discussing Technology"
                    className="w-full h-80 sm:h-96 object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-80" />

                  {/* Image Caption overlay */}
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl">
                    <p className="text-xs font-semibold text-white">Innovation Pod at DCI HireMind</p>
                    <p className="text-[11px] text-slate-400">Collaborating on ethical generative AI workflows & models</p>
                  </div>
                </div>

                {/* Floating Badge 1 (Top Left) */}
                <div className="absolute -top-4 -left-4 sm:-left-6 bg-slate-950/90 backdrop-blur-md border border-[#00D4D8]/30 shadow-xl shadow-black/50 p-3 rounded-2xl flex items-center gap-3 animate-float">
                  <div className="w-8 h-8 rounded-lg bg-[#00D4D8]/20 text-[#00D4D8] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 fill-[#00D4D8]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>98% Skill Match</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">Direct ATS Alignment</div>
                  </div>
                </div>

                {/* Floating Badge 2 (Bottom Right) */}
                <div className="absolute -bottom-4 -right-4 sm:-right-6 bg-slate-950/90 backdrop-blur-md border border-[#00C9A7]/30 shadow-xl shadow-black/50 p-3 rounded-2xl flex items-center gap-3 animate-float-delayed">
                  <div className="w-8 h-8 rounded-lg bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Human-in-the-Loop</div>
                    <div className="text-[10px] text-slate-400">Zero Auto-Rejection Policy</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORPORATE VISUAL ELEMENTS SHOWCASE (Rich Enterprise Workplace Imagery) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-[#08101f] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-[#00D4D8] uppercase tracking-wider">
              Life at DCI HireMind
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Inside Our Innovation & Engineering Culture
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Experience a world-class environment designed for deep collaboration, technical excellence, and rapid personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Visual Card 1: Team Collaboration */}
            <div className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-[#00D4D8]/40 transition-all duration-300 shadow-lg hover:-translate-y-1">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"
                  alt="Corporate Team Collaboration"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00D4D8]">
                  <Users className="w-3.5 h-3.5" />
                  <span>Team Collaboration</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cross-functional squads brainstorming high-impact generative AI architectures.
                </p>
              </div>
            </div>

            {/* Visual Card 2: AI & Technology Innovation */}
            <div className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-[#00C9A7]/40 transition-all duration-300 shadow-lg hover:-translate-y-1">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"
                  alt="Technology and AI Innovation"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00C9A7]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AI & Tech Innovation</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Building next-generation vector retrieval and explainable evaluation engines.
                </p>
              </div>
            </div>

            {/* Visual Card 3: Modern Office Environment */}
            <div className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-400/40 transition-all duration-300 shadow-lg hover:-translate-y-1">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
                  alt="Modern Office Environment"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Modern Workspaces</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sleek architectural facilities with ergonomic setups and hybrid remote flexibility.
                </p>
              </div>
            </div>

            {/* Visual Card 4: Professional Strategy Meetings */}
            <div className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-400/40 transition-all duration-300 shadow-lg hover:-translate-y-1">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80"
                  alt="Professional Meetings & Strategy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Strategic Leadership</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mentorship from veteran engineering leaders with transparent product roadmaps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CURRENT JOB OPENINGS SECTION (Database Driven via FastAPI)             */}
      {/* ========================================================================= */}
      <section id="open-positions" className="py-20 bg-[#070e1e] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[#00D4D8] text-xs font-bold uppercase tracking-wider mb-2">
                <Briefcase className="w-4 h-4" />
                <span>Career Opportunities</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Current Job Openings
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Browse our live requisitions fetched directly from Supabase PostgreSQL. Apply in minutes with zero account creation.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Showing <strong className="text-white">{jobs.length}</strong> of <strong className="text-white">{total}</strong> Active Roles
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl shadow-xl mb-10 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch gap-3">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job title, keyword, or required tech (e.g. React, Python, Architect)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4D8]/50"
                />
              </form>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900 text-white">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900 text-white">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc} className="bg-slate-900 text-white">
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900 text-white">All Types</option>
                  <option value="Full-Time" className="bg-slate-900 text-white">Full-Time</option>
                  <option value="Part-Time" className="bg-slate-900 text-white">Part-Time</option>
                  <option value="Contract" className="bg-slate-900 text-white">Contract</option>
                  <option value="Remote" className="bg-slate-900 text-white">Remote</option>
                </select>
              </div>

              {/* Find Roles Button */}
              <button
                onClick={fetchJobs}
                className="px-5 py-2.5 bg-[#00D4D8] hover:bg-cyan-400 text-[#0B1120] font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Job Cards Grid */}
          {isLoading ? (
            <div className="py-24 flex justify-center">
              <LoadingSpinner size="lg" message="Loading live job openings from Supabase..." />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-slate-950/70 rounded-3xl border border-slate-800 p-8 max-w-xl mx-auto space-y-4">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No Matching Requisitions Found</h3>
              <p className="text-xs text-slate-400">
                We couldn&apos;t find any open positions matching your search filters. Try adjusting your query or resetting your criteria.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDept('All');
                  setSelectedLocation('All');
                  setSelectedType('All');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between bg-[#0B1528]/80 border border-slate-800/90 hover:border-[#00D4D8]/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00D4D8]/10 group"
                >
                  <div className="space-y-3">
                    {/* Header Tags */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00D4D8] bg-[#00D4D8]/10 border border-[#00D4D8]/20 px-2.5 py-0.5 rounded-full">
                        {getDepartmentIcon(job.department)}
                        <span>{job.department || 'General'}</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800/90 px-2.5 py-0.5 rounded-full">
                        {job.employment_type}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-[#00D4D8] transition-colors line-clamp-2">
                      {job.title}
                    </h3>

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{job.location}</span>
                        </span>
                      )}
                      {job.experience_level && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{job.experience_level}</span>
                        </span>
                      )}
                    </div>

                    {/* Description Snippet */}
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {job.description_snippet}
                    </p>

                    {/* Required Skills Badges */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.required_skills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.required_skills.length > 4 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{job.required_skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <Link
                      to={`/careers/jobs/${job.id}`}
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/careers/apply/${job.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-[#0B1120] bg-gradient-to-r from-[#00D4D8] to-[#00C9A7] hover:from-cyan-400 hover:to-teal-400 rounded-lg transition-all shadow-sm"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ABOUT US SECTION (Two-Column Corporate Story with Image)               */}
      {/* ========================================================================= */}
      <section id="about-us" className="py-20 bg-[#0B1120] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Corporate Team Meeting Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl shadow-[#00D4D8]/10">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"
                  alt="DCI HireMind Team Strategy Session"
                  className="w-full h-80 sm:h-96 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-80" />

                {/* Stat Overlay */}
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xl font-black text-white">10,000+</div>
                    <div className="text-[11px] text-slate-400">Applications Screened Fairly</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-[#00D4D8]">99.4%</div>
                    <div className="text-[11px] text-slate-400">Objective Accuracy</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Mission, Vision & AI Innovation */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#00D4D8] uppercase tracking-wider">
                  About DCI HireMind
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1.5 leading-tight">
                  Pioneering the Next Era of Fair, Intelligent Recruitment
                </h2>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  DCI HireMind was founded on the fundamental principle that artificial intelligence should empower human recruiters,
                  not automate away empathy. We build assistive platforms that pair objective, multi-dimensional competency scoring
                  with rigorous ethical guardrails.
                </p>
              </div>

              {/* Mission & Vision Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <div className="w-8 h-8 rounded-lg bg-[#00D4D8]/10 border border-[#00D4D8]/20 text-[#00D4D8] flex items-center justify-center mb-2.5">
                    <Target className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Our Mission</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    To democratize hiring through explainable AI matchmaking that recognizes verified skill over pedigree.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <div className="w-8 h-8 rounded-lg bg-[#00C9A7]/10 border border-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center mb-2.5">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Our Vision</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    A global workplace where every applicant receives transparent, merit-driven consideration free from demographic bias.
                  </p>
                </div>
              </div>

              {/* Core Innovation Highlights */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#00D4D8] shrink-0" />
                  <span>Explainable AI Match Scoring — Full transparency for every candidate recommendation</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#00D4D8] shrink-0" />
                  <span>Mandatory Human Oversight on Rejections — Zero automated candidate disqualification</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#00D4D8] shrink-0" />
                  <span>Enterprise Data Isolation — Isolated Supabase cloud storage for candidate privacy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. WHY JOIN US SECTION (6 Benefit Cards with Icons)                       */}
      {/* ========================================================================= */}
      <section id="why-join-us" className="py-20 bg-[#070e1e] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#00D4D8] uppercase tracking-wider">
              Life at DCI HireMind
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why Build Your Career with Us?
            </h2>
            <p className="text-sm text-slate-400">
              We empower team members to solve complex engineering and recruitment challenges in an inclusive, high-autonomy culture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Benefit 1: Career Growth */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-[#00D4D8]/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00D4D8]/5 group">
              <div className="w-11 h-11 bg-[#00D4D8]/10 border border-[#00D4D8]/20 text-[#00D4D8] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00D4D8] transition-colors">
                Career Growth
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Clear leadership pathways, bi-annual reviews, and structured promotion tracks to accelerate your professional journey.
              </p>
            </div>

            {/* Benefit 2: Innovative Technology */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-[#00C9A7]/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00C9A7]/5 group">
              <div className="w-11 h-11 bg-[#00C9A7]/10 border border-[#00C9A7]/20 text-[#00C9A7] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00C9A7] transition-colors">
                Innovative Technology
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Work directly with modern React 19, FastAPI, PostgreSQL, pgvector, and state-of-the-art LLM model orchestration.
              </p>
            </div>

            {/* Benefit 3: Learning Opportunities */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 group">
              <div className="w-11 h-11 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Learning Opportunities
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                $3,000 annual continuous education stipend, conference allowances, AI hackathons, and company-sponsored certifications.
              </p>
            </div>

            {/* Benefit 4: Collaborative Environment */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 group">
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Collaborative Environment
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                High-autonomy, cross-functional engineering pods with psychological safety and transparent, asynchronous communication.
              </p>
            </div>

            {/* Benefit 5: Professional Development */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group">
              <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Professional Development
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Patent filing bonuses, technical speaking support, executive mentorship, and internal mobility across global offices.
              </p>
            </div>

            {/* Benefit 6: Growth Opportunities */}
            <div className="p-6 bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 group">
              <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Growth Opportunities
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Remote-first autonomy, home-office equipment budget, comprehensive global health insurance, and generous paid time off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CONTACT SECTION (Contact Info + Interactive Message Form)              */}
      {/* ========================================================================= */}
      <section id="contact" className="py-20 bg-[#0B1120] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold text-[#00D4D8] uppercase tracking-wider">
              Get in Touch
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Connect with Our Talent Team
            </h2>
            <p className="text-sm text-slate-400">
              Have questions regarding an open requisition, the recruitment process, or life at DCI HireMind? Reach out to us directly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Contact Information Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00D4D8]/10 border border-[#00D4D8]/20 text-[#00D4D8] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Email Us</h4>
                  <p className="text-xs text-slate-400 mt-0.5">careers@dcihiremind.com</p>
                  <p className="text-xs text-slate-400">talent@dci.in</p>
                </div>
              </div>

              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/10 border border-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Direct Line</h4>
                  <p className="text-xs text-slate-400 mt-0.5">+1 (800) 555-HIRE (4473)</p>
                  <p className="text-xs text-slate-500">Mon-Fri, 9:00 AM - 6:00 PM IST</p>
                </div>
              </div>

              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Global Offices</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Technology Hubs: Chennai & Bangalore, India</p>
                  <p className="text-xs text-slate-400">Regional HQ: San Francisco, CA & Global Remote</p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-tr from-cyan-950/40 via-slate-900/90 to-slate-900/90 border border-[#00D4D8]/20 rounded-2xl">
                <div className="flex items-center gap-2 text-[#00D4D8] text-xs font-bold mb-1">
                  <Zap className="w-4 h-4 fill-[#00D4D8]" />
                  <span>Candidate Response Guarantee</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every submitted application is reviewed by our talent acquisition team with an average turnaround time of 48 hours.
                </p>
              </div>
            </div>

            {/* Right Column: Interactive Contact Form */}
            <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              <h3 className="text-lg font-bold text-white mb-2">Send Us a Direct Message</h3>
              <p className="text-xs text-slate-400 mb-6">
                Fill in your details and an executive recruiter will get back to you shortly.
              </p>

              {contactSubmitted && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Thank you! Your message has been sent to our talent acquisition team. We will respond within 48 hours.</span>
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Full Name <span className="text-[#00D4D8]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4D8]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address <span className="text-[#00D4D8]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. alex@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4D8]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="e.g. Inquiring about AI Architect requisition"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4D8]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Message <span className="text-[#00D4D8]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Describe your inquiry, background, or question..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4D8]/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00D4D8] to-[#00C9A7] hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 text-[#0B1120] font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingContact ? 'Sending Inquiry...' : 'Send Message to Recruitment'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-[#070B14] border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-900">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <DciBrand
                badgeText=""
                subtitle="Enterprise AI Talent Opportunities"
                logoSize="w-9 h-9"
              />
            </div>

            {/* Quick Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <button onClick={() => scrollToSection('open-positions')} className="hover:text-[#00D4D8] transition-colors cursor-pointer">
                Open Positions
              </button>
              <button onClick={() => scrollToSection('about-us')} className="hover:text-[#00D4D8] transition-colors cursor-pointer">
                About Us
              </button>
              <button onClick={() => scrollToSection('why-join-us')} className="hover:text-[#00D4D8] transition-colors cursor-pointer">
                Why Join Us
              </button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-[#00D4D8] transition-colors cursor-pointer">
                Contact
              </button>
              <Link to="/login" className="hover:text-[#00D4D8] transition-colors flex items-center gap-1 font-semibold text-slate-300">
                <LogIn className="w-3.5 h-3.5 text-[#00D4D8]" />
                <span>HR Portal</span>
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} DCI HireMind. All rights reserved. Enterprise AI Recruitment Platform.</p>
            <p className="text-[11px] text-slate-600">Built with React 19, FastAPI, & Supabase PostgreSQL.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
