import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { Header } from './components/Header.jsx';
import { DoctorSearch } from './components/patient/DoctorSearch.jsx';
import { PatientAppointments } from './components/patient/PatientAppointments.jsx';
import { PatientProfile } from './components/patient/PatientProfile.jsx';
import { ClinicsList } from './components/ClinicsList.jsx';
import { DoctorDashboard } from './components/doctor/DoctorDashboard.jsx';
import { AdminDashboard } from './components/admin/AdminDashboard.jsx';
import { AuthModal } from './components/auth/AuthModal.jsx';
import { ClinicRegisterModal } from './components/auth/ClinicRegisterModal.jsx';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Heart
} from 'lucide-react';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  // Navigation view state: 'search' | 'clinics' | 'appointments' | 'profile' | 'doctor-dashboard' | 'admin-dashboard'
  const [activeView, setActiveView] = useState('search');

  // Clinic filter passed from ClinicsList to DoctorSearch
  const [selectedClinicForFilter, setSelectedClinicForFilter] = useState(null);

  // Auth Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [isClinicRegisterOpen, setIsClinicRegisterOpen] = useState(false);

  // Automatically direct user to appropriate view upon login or role update
  useEffect(() => {
    if (user?.role === 'doctor') {
      setActiveView('doctor-dashboard');
    } else if (user?.role === 'admin') {
      setActiveView('admin-dashboard');
    }
  }, [user?.role]);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleNavigate = (view) => {
    // If selecting search directly without clinic filter, clear clinic filter
    if (view === 'search' && activeView !== 'clinics') {
      setSelectedClinicForFilter(null);
    }
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-200 transition-colors">
      {/* 1. Header Navigation */}
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenClinicRegister={() => setIsClinicRegisterOpen(true)}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* PUBLIC & PATIENT VIEWS */}
        {activeView === 'search' && (
          <DoctorSearch
            onBookingSuccess={() => {
              if (user?.role === 'patient') {
                setActiveView('appointments');
              }
            }}
            onRequireAuth={() => handleOpenAuth('login')}
            preselectedClinicId={selectedClinicForFilter}
            onNavigateClinics={() => setActiveView('clinics')}
            onOpenClinicRegister={() => setIsClinicRegisterOpen(true)}
          />
        )}

        {activeView === 'clinics' && (
          <ClinicsList
            onSelectClinic={(clinicId) => {
              setSelectedClinicForFilter(clinicId);
              setActiveView('search');
            }}
          />
        )}

        {activeView === 'appointments' && (
          user?.role === 'patient' ? (
            <PatientAppointments onBookNew={() => setActiveView('search')} />
          ) : user?.role === 'doctor' ? (
            <DoctorDashboard />
          ) : user?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-xs border border-emerald-200 dark:border-emerald-800">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Patient Consultations & Appointments</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Sign in or register your patient profile to view your scheduled visits, reschedule appointments, and download official appointment slips.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="btn-appointments-sign-in"
                  onClick={() => handleOpenAuth('login')}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Sign In to Account
                </button>
                <button
                  id="btn-appointments-register"
                  onClick={() => handleOpenAuth('register')}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Create Patient ID
                </button>
              </div>
            </div>
          )
        )}

        {activeView === 'profile' && (
          user?.role === 'patient' ? (
            <PatientProfile />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-md mx-auto my-8">
              <p className="text-xs text-slate-500 dark:text-slate-400">Please sign in to view your patient profile.</p>
            </div>
          )
        )}

        {/* DOCTOR CLINICAL DASHBOARD */}
        {activeView === 'doctor-dashboard' && (
          user?.role === 'doctor' ? (
            <DoctorDashboard />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-md mx-auto my-8 space-y-4">
              <Stethoscope className="w-10 h-10 text-emerald-800 dark:text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Doctor Clinical Portal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This portal is reserved for registered specialist doctors to manage queues, patient check-ins, and clinical consultation records.
              </p>
              <button
                onClick={() => handleOpenAuth('login')}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 cursor-pointer"
              >
                Sign In as Doctor
              </button>
            </div>
          )
        )}

        {/* CLINIC MANAGEMENT / ADMIN DASHBOARD */}
        {activeView === 'admin-dashboard' && (
          user?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center max-w-md mx-auto my-8 space-y-4">
              <Building2 className="w-10 h-10 text-emerald-800 dark:text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hospital Facility Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage doctor rosters, configure 40-minute shift capacities, and monitor patient queues across Kaduna hospital facilities.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 cursor-pointer"
                >
                  Admin Sign In
                </button>
                <button
                  onClick={() => setIsClinicRegisterOpen(true)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Register New Hospital / PHC
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* 3. Footer */}
      <footer className="bg-slate-900 dark:bg-black text-slate-400 text-xs border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">MediSched NG</p>
                <p className="text-[11px] text-slate-400">
                  Healthcare Appointment & Specialist Capacity Platform • Kaduna, Nigeria
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>30m Consultations + 10m Interval Cycle Standard</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Protected 1-Slot Reserved Capacity Buffer</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Barau Dikko, 44 Military, ABUTH, PHCs & Specialist Centres</span>
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} MediSched NG. All rights reserved.</p>
            <p>Designed for Kaduna State Primary Healthcare Centres & Specialist Hospital Operations.</p>
          </div>
        </div>
      </footer>

      {/* 4. Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenClinicRegister={() => setIsClinicRegisterOpen(true)}
      />

      {/* 5. Clinic Registration Modal */}
      <ClinicRegisterModal
        isOpen={isClinicRegisterOpen}
        onClose={() => setIsClinicRegisterOpen(false)}
        onSuccess={() => setActiveView('admin-dashboard')}
      />
    </div>
  );
}
