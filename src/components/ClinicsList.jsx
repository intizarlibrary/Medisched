import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

export const ClinicsList = ({ onSelectClinic }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    async function loadClinics() {
      try {
        const data = await api.getClinics();
        setClinics(data.clinics || []);
      } catch (err) {
        console.error('Failed to load clinics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClinics();
  }, []);

  const cities = ['all', ...new Set(clinics.map((c) => c.city).filter(Boolean))];
  const types = ['all', 'Primary Healthcare Centre (PHC)', 'Teaching Hospital', 'General Hospital', 'Specialist Hospital', 'Military / Reference Hospital'];

  const filteredClinics = clinics.filter((clinic) => {
    const matchesSearch =
      clinic.name.toLowerCase().includes(search.toLowerCase()) ||
      clinic.address.toLowerCase().includes(search.toLowerCase()) ||
      (clinic.description && clinic.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCity = selectedCity === 'all' || clinic.city === selectedCity;
    const matchesType = selectedType === 'all' || clinic.type === selectedType;
    return matchesSearch && matchesCity && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Title & Network Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Kaduna State Healthcare Network
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Accredited Hospitals & Primary Healthcare Centres
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Direct real-time appointment booking across tertiary teaching hospitals, military reference centres, general hospitals, and community primary healthcare centres (PHCs) throughout Kaduna metropolis, Zaria, and environs.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Facility Rosters</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
              <span>40-Min Cycle Scheduling Active</span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="input-search-clinics"
                type="text"
                placeholder="Search hospitals & PHCs by name, LGA, or area (e.g. Badiko, BDTH, Rigasa, Zaria)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCity === city
                      ? 'bg-emerald-950 dark:bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {city === 'all' ? 'All Locations' : city}
                </button>
              ))}
            </div>
          </div>

          {/* Type Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0 text-[11px] uppercase tracking-wider">Facility Type:</span>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedType === type
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clinics Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">
          Loading Kaduna healthcare facilities & PHCs...
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Facilities Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search keyword or location filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClinics.map((clinic) => {
            const isPHC = clinic.type && clinic.type.includes('Primary');
            return (
              <div
                key={clinic.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isPHC
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      isPHC
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}>
                      {clinic.type || 'General Hospital'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {clinic.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <span>{clinic.address}, {clinic.city}, {clinic.state}</span>
                    </p>
                  </div>

                  {clinic.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-slate-50/70 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {clinic.description}
                    </p>
                  )}

                  <div className="space-y-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
                    {clinic.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{clinic.phone}</span>
                      </div>
                    )}
                    {clinic.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{clinic.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                    <span>{clinic.doctor_count || 1} Specialist{clinic.doctor_count === 1 ? '' : 's'}</span>
                  </div>

                  <button
                    id={`btn-view-clinic-doctors-${clinic.id}`}
                    onClick={() => onSelectClinic(clinic.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    View Doctors
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
