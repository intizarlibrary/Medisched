import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Award,
  ChevronRight,
  Building2,
  CheckCircle2
} from 'lucide-react';

export const DoctorCard = ({ doctor, onBook, onViewProfile }) => {
  const getDayNames = (schedules) => {
    if (!schedules || schedules.length === 0) return 'By schedule';
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return schedules.map((s) => dayMap[s.day_of_week]).join(', ');
  };

  const isPHC = doctor.clinic_name && doctor.clinic_name.includes('PHC');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
      <div className="space-y-4">
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              isPHC
                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}>
              <Stethoscope className="w-3 h-3" />
              {doctor.specialty_name}
            </span>
            {doctor.is_general_doctor === 1 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Primary Care
              </span>
            )}
          </div>
          <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-700">
            ₦{Number(doctor.consultation_fee || 5000).toLocaleString('en-NG')}
          </span>
        </div>

        {/* Doctor Info */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {doctor.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
            {doctor.qualifications || 'Specialist Physician'}
          </p>
        </div>

        {/* Hospital Affiliation */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{doctor.clinic_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.clinic_address}, {doctor.clinic_city}</span>
          </div>
        </div>

        {/* Experience & Working Days */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>{doctor.experience_years || 5}+ yrs exp</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              <Clock className="w-3 h-3" />
              <span>{doctor.consultation_duration || 30}m + {doctor.buffer_duration !== undefined ? doctor.buffer_duration : 10}m</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{getDayNames(doctor.schedules)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 mt-5 grid grid-cols-2 gap-2">
        <button
          id={`btn-view-profile-${doctor.id}`}
          onClick={() => onViewProfile(doctor)}
          className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          View Profile
        </button>
        <button
          id={`btn-book-doctor-${doctor.id}`}
          onClick={() => onBook(doctor)}
          className="py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          Book Slot
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
