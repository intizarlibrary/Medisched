import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { DoctorCard } from './DoctorCard.jsx';
import { SlotPickerModal } from './SlotPickerModal.jsx';
import { HeroSection } from '../HeroSection.jsx';
import {
  Search,
  Filter,
  Stethoscope,
  Building2,
  Calendar,
  MapPin,
  X,
  Award,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  Sparkles
} from 'lucide-react';

export const DoctorSearch = ({ onBookingSuccess, onRequireAuth, preselectedClinicId = null, onNavigateClinics, onOpenClinicRegister }) => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(preselectedClinicId ? String(preselectedClinicId) : '');
  const [isGeneralOnly, setIsGeneralOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // Modals state
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [profileDoctor, setProfileDoctor] = useState(null);

  // Load filter options
  useEffect(() => {
    async function loadMeta() {
      try {
        const [specsRes, clinicsRes] = await Promise.all([
          api.getSpecialties(),
          api.getClinics()
        ]);
        setSpecialties(specsRes.specialties || []);
        setClinics(clinicsRes.clinics || []);
      } catch (err) {
        console.error('Failed to load search metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Update selected clinic when prop changes
  useEffect(() => {
    if (preselectedClinicId) {
      setSelectedClinic(String(preselectedClinicId));
    }
  }, [preselectedClinicId]);

  // Load doctors whenever filters change
  useEffect(() => {
    async function fetchDoctors() {
      setLoading(true);
      try {
        const data = await api.getDoctors({
          search,
          specialty_id: selectedSpecialty,
          clinic_id: selectedClinic,
          is_general: isGeneralOnly ? '1' : '',
          date: selectedDate
        });
        setDoctors(data.doctors || []);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchDoctors, 200);
    return () => clearTimeout(timer);
  }, [search, selectedSpecialty, selectedClinic, isGeneralOnly, selectedDate]);

  const clearFilters = () => {
    setSearch('');
    setSelectedSpecialty('');
    setSelectedClinic('');
    setIsGeneralOnly(false);
    setSelectedDate('');
  };

  const handleHeroSelectSpecialty = (specCode) => {
    const found = specialties.find(s => s.code === specCode);
    if (found) {
      setSelectedSpecialty(String(found.id));
    }
    const el = document.getElementById('doctors-list-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHeroSelectClinicType = (clinicType) => {
    // Find matching clinic or search for type
    setSearch(clinicType.includes('Primary') ? 'Primary' : clinicType);
    const el = document.getElementById('doctors-list-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const hasActiveFilters = search || selectedSpecialty || selectedClinic || isGeneralOnly || selectedDate;

  return (
    <div className="space-y-6">
      {/* Interactive Hero Section */}
      <HeroSection
        searchQuery={search}
        onSearchChange={setSearch}
        onSelectSpecialty={handleHeroSelectSpecialty}
        onSelectClinicType={handleHeroSelectClinicType}
        onExploreFacilities={onNavigateClinics}
        onOpenClinicRegister={onOpenClinicRegister}
      />

      {/* Search & Filter Bar */}
      <div id="doctors-list-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 mb-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Specialist & Primary Care Directory
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Filter Doctors & Consultation Cycles
            </h2>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer w-fit"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Specialty select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Medical Specialty</label>
            <select
              id="select-filter-specialty"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="">All Medical Specialties</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.doctor_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Clinic select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Facility / Hospital / PHC</label>
            <select
              id="select-filter-clinic"
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="">All Kaduna Facilities & PHCs</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Target Consultation Date</label>
            <input
              id="input-filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          {/* Primary Care Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Care Level</label>
            <button
              type="button"
              id="btn-filter-general"
              onClick={() => setIsGeneralOnly(!isGeneralOnly)}
              className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isGeneralOnly
                  ? 'bg-teal-50 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 font-bold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{isGeneralOnly ? '✓ Primary Care Only' : 'Show Primary Care Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Header */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {loading ? 'Searching Medical Registry...' : `${doctors.length} Specialist${doctors.length === 1 ? '' : 's'} & Medical Officer${doctors.length === 1 ? '' : 's'} Available`}
        </span>
        <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Automated 40-Minute Cycle Verification</span>
        </span>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium text-sm animate-pulse">
          Loading Kaduna healthcare specialists and consultation availability...
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Doctors Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No doctors matched your current search and filter combination. Try resetting your filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onBook={(doc) => setBookingDoctor(doc)}
              onViewProfile={(doc) => setProfileDoctor(doc)}
            />
          ))}
        </div>
      )}

      {/* Doctor Profile Modal */}
      {profileDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-lg border border-emerald-200 dark:border-emerald-800">
                  {profileDoctor.name.replace('Dr. ', '').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {profileDoctor.specialty_name}
                    </span>
                    {profileDoctor.is_general_doctor === 1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Primary Healthcare
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">{profileDoctor.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setProfileDoctor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Body */}
            <div className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* Credentials & Bio */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Qualifications & Bio
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {profileDoctor.qualifications}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {profileDoctor.bio || 'Consultant Specialist providing comprehensive medical diagnosis, consultation, and patient care.'}
                </p>
              </div>

              {/* Clinic Affiliation */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Healthcare Facility & Room
                </span>
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                    <Building2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                    <span>{profileDoctor.clinic_name}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{profileDoctor.clinic_address}, {profileDoctor.clinic_city}</span>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium pt-1">
                    Consultation Room: <span className="font-bold">{profileDoctor.room_number || 'Room 1'}</span>
                  </p>
                </div>
              </div>

              {/* Fee and Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-400 block font-medium">Consultation Fee</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    ₦{Number(profileDoctor.consultation_fee || 5000).toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-400 block font-medium">Clinical Experience</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {profileDoctor.experience_years || 5}+ Years
                  </span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setProfileDoctor(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = profileDoctor;
                  setProfileDoctor(null);
                  setBookingDoctor(target);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Select 40-Min Appointment Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Picker Modal */}
      {bookingDoctor && (
        <SlotPickerModal
          doctor={bookingDoctor}
          isOpen={Boolean(bookingDoctor)}
          onClose={() => setBookingDoctor(null)}
          onBookingSuccess={onBookingSuccess}
          onRequireAuth={onRequireAuth}
        />
      )}
    </div>
  );
};
