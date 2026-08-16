import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';
import { AppointmentReceiptModal } from '../AppointmentReceiptModal.jsx';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Building2,
  FileCheck,
  RotateCcw,
  XCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Plus
} from 'lucide-react';

export const PatientAppointments = ({ onBookNew }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'all'
  const [selectedSlipAppointment, setSelectedSlipAppointment] = useState(null);

  // Reschedule state
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState(null);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Cancel state
  const [cancellingApt, setCancellingApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to load patient appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    if (filterTab === 'upcoming') {
      return apt.appointment_date >= todayStr && apt.status !== 'Cancelled' && apt.status !== 'Completed';
    }
    if (filterTab === 'completed') {
      return apt.status === 'Completed' || apt.status === 'No Show' || apt.appointment_date < todayStr;
    }
    return true;
  });

  // Handle Cancel
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingApt) return;
    setCancelLoading(true);
    try {
      await api.cancelAppointment(cancellingApt.id, cancelReason || 'Cancelled by patient');
      setCancellingApt(null);
      setCancelReason('');
      await loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reschedule Modal
  const openReschedule = (apt) => {
    setReschedulingApt(apt);
    setRescheduleDate(apt.appointment_date);
    setSelectedNewSlot(null);
    setRescheduleError('');
  };

  // Fetch slots for reschedule
  useEffect(() => {
    if (!reschedulingApt || !rescheduleDate) return;
    async function loadNewSlots() {
      try {
        const data = await api.getDoctorSlots(reschedulingApt.doctor_id, rescheduleDate);
        if (data.available && data.calculation) {
          setRescheduleSlots(data.calculation.slots || []);
        } else {
          setRescheduleSlots([]);
        }
      } catch (err) {
        setRescheduleSlots([]);
      }
    }
    loadNewSlots();
  }, [reschedulingApt, rescheduleDate]);

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!reschedulingApt || !selectedNewSlot) return;
    setRescheduleLoading(true);
    setRescheduleError('');

    try {
      await api.rescheduleAppointment(reschedulingApt.id, {
        appointment_date: rescheduleDate,
        start_time: selectedNewSlot.start_time
      });
      setReschedulingApt(null);
      await loadAppointments();
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Consultations & Appointments
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your scheduled 40-minute clinical cycles, view consultation slips, and reschedule bookings.
          </p>
        </div>

        <button
          id="btn-book-new-consultation"
          onClick={onBookNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Book New Specialist
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-appointments-upcoming"
          onClick={() => setFilterTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'upcoming'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Upcoming Bookings
        </button>
        <button
          id="tab-appointments-completed"
          onClick={() => setFilterTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'completed'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Past & Completed
        </button>
        <button
          id="tab-appointments-all"
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Records ({appointments.length})
        </button>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium text-xs animate-pulse">
          Loading your medical consultations from database...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">No Appointments Found</h4>
          <p className="text-xs text-slate-500">
            {filterTab === 'upcoming'
              ? "You have no upcoming consultations scheduled. Search for a specialist to book."
              : "No appointments matching this filter tab."}
          </p>
          {filterTab === 'upcoming' && (
            <button
              onClick={onBookNew}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              Discover Specialists Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Main Info */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {apt.appointment_code}
                  </span>
                  <StatusBadge status={apt.status} />
                  <span className="text-xs text-slate-400">
                    {apt.specialty_name}
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>{apt.doctor_name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{apt.clinic_name} • {apt.room_number || 'Room 1'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    <span>{apt.appointment_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-800" />
                    <span className="font-bold">{apt.start_time} – {apt.end_time}</span>
                    <span className="text-slate-400 text-[11px]">(40m cycle to {apt.interval_end_time})</span>
                  </div>
                  <div className="text-slate-500">
                    Fee: <span className="font-bold text-slate-900">₦{Number(apt.consultation_fee || 5000).toLocaleString('en-NG')}</span>
                  </div>
                </div>

                {apt.reason && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Reason:</span> {apt.reason}
                  </p>
                )}

                {apt.consultation_notes && (
                  <div className="text-xs text-slate-700 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-950">Clinical Notes:</span> {apt.consultation_notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 justify-end">
                <button
                  id={`btn-view-slip-${apt.id}`}
                  onClick={() => setSelectedSlipAppointment(apt)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-800" />
                  View Official Slip
                </button>

                {apt.status === 'Confirmed' && (
                  <>
                    <button
                      id={`btn-reschedule-${apt.id}`}
                      onClick={() => openReschedule(apt)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Reschedule
                    </button>

                    <button
                      id={`btn-cancel-${apt.id}`}
                      onClick={() => setCancellingApt(apt)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slip Modal */}
      {selectedSlipAppointment && (
        <AppointmentReceiptModal
          appointment={selectedSlipAppointment}
          onClose={() => setSelectedSlipAppointment(null)}
        />
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Consultation</h3>
                <p className="text-xs text-slate-500">
                  Select a new 40-minute slot with {reschedulingApt.doctor_name}
                </p>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Appointment Date
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Open 40-Minute Slot
                </label>
                {rescheduleSlots === null ? (
                  <p className="text-xs text-slate-400 animate-pulse">Loading slots...</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl">
                    Doctor has no open schedule on this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot) => {
                      if (slot.is_reserved_capacity || slot.is_booked) return null;
                      const isSel = selectedNewSlot && selectedNewSlot.start_time === slot.start_time;
                      return (
                        <button
                          key={slot.start_time}
                          type="button"
                          onClick={() => setSelectedNewSlot(slot)}
                          className={`p-2 rounded-xl border text-xs text-left cursor-pointer ${
                            isSel
                              ? 'border-emerald-800 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-700/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {slot.start_time} – {slot.end_time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !selectedNewSlot}
                  className="px-5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                >
                  {rescheduleLoading ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Consultation</h3>
                <p className="text-xs text-slate-500">Ref: {cancellingApt.appointment_code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your consultation with <strong>{cancellingApt.doctor_name}</strong> on {cancellingApt.appointment_date}? This will free the 40-minute slot for other patients in SQLite immediately.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule conflict, feeling better..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingApt(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
