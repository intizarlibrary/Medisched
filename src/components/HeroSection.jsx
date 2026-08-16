import React from 'react';
import {
  Stethoscope,
  Building2,
  CalendarCheck,
  ShieldCheck,
  Search,
  Sparkles,
  Clock,
  HeartPulse,
  Baby,
  Activity,
  ArrowRight,
  CheckCircle,
  Users
} from 'lucide-react';

export const HeroSection = ({
  searchQuery,
  onSearchChange,
  onSelectSpecialty,
  onSelectClinicType,
  onExploreFacilities,
  onOpenClinicRegister
}) => {
  const quickTags = [
    { label: 'Primary Healthcare (PHC)', action: () => onSelectClinicType('Primary Healthcare Centre (PHC)'), icon: Building2 },
    { label: 'Cardiology', action: () => onSelectSpecialty('CARD'), icon: HeartPulse },
    { label: 'Paediatrics', action: () => onSelectSpecialty('PAED'), icon: Baby },
    { label: 'Obstetrics & Gynae', action: () => onSelectSpecialty('OBGYN'), icon: Activity },
    { label: 'General Practice', action: () => onSelectSpecialty('GEN'), icon: Stethoscope }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-10 lg:p-12 border border-emerald-800/60 shadow-xl shadow-emerald-950/20 mb-8">
      {/* Decorative ambient background rings */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Top Trust Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 text-xs font-semibold backdrop-blur-md mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Kaduna State Official Healthcare Scheduling System</span>
          <span className="text-emerald-400">•</span>
          <span className="text-white font-bold">40-Minute Cycle Protocol</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
            Book Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">Specialist Doctors</span> & Primary Care in Kaduna
          </h1>
          <p className="mt-4 text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-normal">
            Directly schedule appointments across Barau Dikko Teaching Hospital, 44 Army Reference, ABUTH Zaria, and accredited Primary Healthcare Centres with automated buffer intervals and live clinical slots.
          </p>
        </div>

        {/* Quick Search Card in Hero */}
        <div className="mt-8 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-lg max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200" />
              <input
                id="hero-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by doctor name, specialty, hospital, or PHC (e.g. Dr. Amina, Cardiology, Badiko)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all shadow-inner"
              />
            </div>
            <button
              id="hero-search-btn"
              onClick={() => {
                const el = document.getElementById('doctors-list-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Explore Doctors</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Popular Quick Category Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">Popular:</span>
          {quickTags.map((tag, idx) => {
            const Icon = tag.icon;
            return (
              <button
                key={idx}
                onClick={tag.action}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 hover:text-white border border-emerald-700/60 transition-all text-xs font-medium cursor-pointer"
              >
                <Icon className="w-3 h-3 text-emerald-300" />
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>

        {/* Highlights & Trust Metrics */}
        <div className="mt-10 pt-8 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>20+ Doctors</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">MDCN Certified</p>
            <p className="text-[11px] text-emerald-200/80">Teaching & PHC medical officers</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>18 Facilities</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">Statewide</p>
            <p className="text-[11px] text-emerald-200/80">Kaduna Metropolis & Zaria</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>40-Min Cycles</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">Zero Delays</p>
            <p className="text-[11px] text-emerald-200/80">Protected buffer intervals</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Real-Time</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">Instant Slips</p>
            <p className="text-[11px] text-emerald-200/80">Unique digital verification code</p>
          </div>
        </div>
      </div>
    </div>
  );
};
