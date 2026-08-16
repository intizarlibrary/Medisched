import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  Printer,
  X,
  FileCheck,
  ShieldCheck,
  Building2,
  Phone
} from 'lucide-react';
import { Logo } from './Logo.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export const AppointmentReceiptModal = ({ appointment, onClose }) => {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden print:border-none print:shadow-none">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-800" />
            <span className="text-sm font-semibold text-slate-800">Official Consultation Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-slip"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              id="btn-close-slip"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Consultation Slip Area */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <Logo size="md" showTagline={true} />
              <p className="text-xs text-slate-500 mt-2">
                Northern Regional Medical Scheduling Engine • Kaduna Health Network
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Appointment Reference
              </span>
              <span className="text-lg font-mono font-bold text-emerald-800 tracking-tight">
                {appointment.appointment_code}
              </span>
              <div className="mt-1">
                <StatusBadge status={appointment.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Patient Identification Card Box */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Patient Information
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white rounded border border-slate-200 text-emerald-800">
                {appointment.patient_code || 'PAT-RECORD'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Full Name</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{appointment.patient_name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Contact Phone</p>
                <p className="font-semibold text-slate-700 mt-0.5">{appointment.patient_phone || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Gender & DOB</p>
                <p className="font-medium text-slate-700 mt-0.5">
                  {appointment.patient_gender || '—'} {appointment.patient_dob ? `• ${appointment.patient_dob}` : ''}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Primary Reason</p>
                <p className="font-medium text-slate-700 mt-0.5 truncate">{appointment.reason || 'General clinical consultation'}</p>
              </div>
            </div>
          </div>

          {/* Doctor & Facility Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Doctor Column */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-white">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-800" />
                Consulting Provider
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{appointment.doctor_name}</h4>
                <p className="text-xs font-semibold text-emerald-800 mt-0.5">{appointment.specialty_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Location: <span className="font-medium text-slate-700">{appointment.room_number || 'Consulting Room'}</span>
                </p>
              </div>
            </div>

            {/* Hospital / Clinic Column */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-white">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                Healthcare Facility
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{appointment.clinic_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>{appointment.clinic_address}, {appointment.clinic_city}, {appointment.clinic_state}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Schedule 40-Minute Cycle Window */}
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-800" />
                Scheduled Consultation Time
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                40-Min Cycle Engine
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div>
                <p className="text-sm font-bold text-slate-900">{formatDateLong(appointment.appointment_date)}</p>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-800" />
                  <span className="font-semibold text-slate-800">{appointment.start_time} – {appointment.end_time}</span>
                  <span className="text-slate-400">(30m consult + 10m buffer to {appointment.interval_end_time})</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-500 block">Consultation Fee</span>
                <span className="text-base font-bold text-slate-900">
                  ₦{Number(appointment.consultation_fee || 5000).toLocaleString('en-NG')}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Assessment Section if Completed */}
          {appointment.status === 'Completed' && (appointment.consultation_notes || appointment.prescription) && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Doctor Assessment & Prescriptions
              </span>
              {appointment.consultation_notes && (
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Clinical Notes:</span> {appointment.consultation_notes}
                </div>
              )}
              {appointment.prescription && (
                <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-900">Prescription:</span> {appointment.prescription}
                </div>
              )}
            </div>
          )}

          {/* Patient Instructions Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-start gap-2.5 text-slate-500 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Clinic Arrival Instructions:</p>
              <p>
                Please arrive at the hospital reception 15 minutes before your scheduled start time ({appointment.start_time}).
                Present this digital slip or quote your Patient ID (<strong>{appointment.patient_code}</strong>) and Appointment Reference (<strong>{appointment.appointment_code}</strong>).
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Close Slip
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Consultation Slip
          </button>
        </div>
      </div>
    </div>
  );
};
