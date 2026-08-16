import React from 'react';
import { Logo } from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  Stethoscope,
  Building2,
  Calendar,
  User,
  LogOut,
  ShieldCheck,
  PlusCircle,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

export const Header = ({
  activeView,
  onNavigate,
  onOpenAuth,
  onOpenClinicRegister
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNav = (view) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-emerald-950/98 backdrop-blur-md border-b border-emerald-900 sticky top-0 z-40 text-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="cursor-pointer flex items-center gap-2" onClick={() => handleNav('search')}>
            <Logo size="md" light={true} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-emerald-900/70 p-1.5 rounded-2xl border border-emerald-800/80 text-xs font-semibold">
            <button
              id="nav-search-specialists"
              onClick={() => handleNav('search')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'search'
                  ? 'bg-white text-emerald-950 shadow-sm font-bold'
                  : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Find Specialists & PHCs
            </button>

            <button
              id="nav-clinics-directory"
              onClick={() => handleNav('clinics')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'clinics'
                  ? 'bg-white text-emerald-950 shadow-sm font-bold'
                  : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Kaduna Facilities
            </button>

            {user?.role === 'patient' && (
              <>
                <button
                  id="nav-patient-appointments"
                  onClick={() => handleNav('appointments')}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'appointments'
                      ? 'bg-white text-emerald-950 shadow-sm font-bold'
                      : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  My Consultations
                </button>
                <button
                  id="nav-patient-profile"
                  onClick={() => handleNav('profile')}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'profile'
                      ? 'bg-white text-emerald-950 shadow-sm font-bold'
                      : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  My Profile
                </button>
              </>
            )}

            {user?.role === 'doctor' && (
              <button
                id="nav-doctor-dashboard"
                onClick={() => handleNav('doctor-dashboard')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'doctor-dashboard'
                    ? 'bg-white text-emerald-950 shadow-sm font-bold'
                    : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Clinical Portal
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                id="nav-admin-dashboard"
                onClick={() => handleNav('admin-dashboard')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'admin-dashboard'
                    ? 'bg-white text-emerald-950 shadow-sm font-bold'
                    : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Facility Management
              </button>
            )}
          </nav>

          {/* Desktop Right Side / Theme Toggle & Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="text-[11px] text-emerald-200">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-teal-200" />
                  <span className="text-[11px] text-emerald-200">Dark</span>
                </>
              )}
            </button>

            {!user ? (
              <>
                <button
                  id="btn-header-register-clinic"
                  onClick={onOpenClinicRegister}
                  className="px-3.5 py-2 rounded-xl border border-emerald-700/80 hover:border-emerald-500 text-xs font-bold text-emerald-100 hover:text-white hover:bg-emerald-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                  Register Hospital/PHC
                </button>

                <button
                  id="btn-header-login"
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
                >
                  Sign In / Register
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-white block leading-tight">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Clinic Admin' : user.role === 'doctor' ? 'Doctor' : 'Patient'}
                  </span>
                </div>

                <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-bold text-xs flex items-center justify-center border border-emerald-700">
                  {user.full_name?.charAt(0) || 'U'}
                </div>

                <button
                  id="btn-header-logout"
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-xl text-emerald-300 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-emerald-900 border border-emerald-800 text-emerald-200"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-teal-200" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-emerald-800 bg-emerald-900 text-emerald-100 hover:bg-emerald-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-emerald-900 space-y-2 text-xs font-semibold bg-emerald-950/95">
            <button
              onClick={() => handleNav('search')}
              className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'search' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
            >
              Find Specialists & PHCs
            </button>
            <button
              onClick={() => handleNav('clinics')}
              className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'clinics' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
            >
              Kaduna Facilities Directory
            </button>

            {user?.role === 'patient' && (
              <>
                <button
                  onClick={() => handleNav('appointments')}
                  className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'appointments' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
                >
                  My Consultations
                </button>
                <button
                  onClick={() => handleNav('profile')}
                  className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'profile' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
                >
                  My Profile
                </button>
              </>
            )}

            {user?.role === 'doctor' && (
              <button
                onClick={() => handleNav('doctor-dashboard')}
                className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'doctor-dashboard' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
              >
                Doctor Clinical Portal
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => handleNav('admin-dashboard')}
                className={`w-full text-left px-3 py-2 rounded-xl ${activeView === 'admin-dashboard' ? 'bg-emerald-900 text-white font-bold' : 'text-emerald-100'}`}
              >
                Clinic Operations Portal
              </button>
            )}

            <div className="pt-3 border-t border-emerald-900 flex flex-col gap-2">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-emerald-950 text-center font-extrabold"
                  >
                    Sign In / Register
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenClinicRegister();
                    }}
                    className="w-full py-2.5 rounded-xl border border-emerald-700 text-emerald-100 text-center font-bold"
                  >
                    Register Your Hospital / PHC
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2 rounded-xl bg-rose-950/60 text-rose-300 font-bold flex items-center justify-center gap-2 border border-rose-900"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out ({user.full_name})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
