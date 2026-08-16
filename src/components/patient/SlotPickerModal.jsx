import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldAlert,
  Info,
  ArrowRight
} from 'lucide-react';

export const SlotPickerModal = ({
  doctor,
  isOpen,
  onClose,
  onBookingSuccess,
  onRequireAuth
}) => {
  const { user } = useAuth();

  // Selected date (defaults to tomorrow or nearest future day)
  const getInitialDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [calculation, setCalculation] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState(null);

  // Selected slot state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch slot availability for selected date
  useEffect(() => {
    if (!doctor || !selectedDate) return;

    async function loadSlots() {
      setLoadingSlots(true);
      setUnavailableMessage(null);
      setSelectedSlot(null);
      setErrorMessage('');

      try {
        const data = await api.getDoctorAvailability(doctor.id, selectedDate);
        if (data.available === false) {
          setUnavailableMessage(data.message || 'Doctor does not hold active clinic on this day.');
          setCalculation(null);
        } else {
          setCalculation(data.calculation);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
        setUnavailableMessage(err.message || 'Could not retrieve schedule.');
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [doctor, selectedDate]);

  if (!isOpen || !doctor) return null;

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      onRequireAuth();
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Please select an available 40-minute consultation slot.');
      return;
    }

    setBookingLoading(true);

    try {
      const response = await api.bookAppointment({
        doctor_id: doctor.id,
        appointment_date: selectedDate,
        start_time: selectedSlot.start_time,
        reason: reason || 'General medical consultation',
        symptoms: symptoms || null
      });

      if (response && response.appointment) {
        onBookingSuccess(response.appointment);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Booking failed. Slot might have just been reserved.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {doctor.specialty_name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {calculation ? `${calculation.cycle_minutes}m Appointment Cycle` : `${doctor.consultation_duration || 30}m Consult`}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Book Appointment with {doctor.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{doctor.clinic_name} • {doctor.room_number || 'Consulting Room'}</span>
            </p>
          </div>

          <button
            id="btn-close-slot-picker"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleBookingSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Date Selector */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              1. Select Appointment Date
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                id="input-picker-date"
                type="date"
                required
                min={getInitialDate()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Live appointment times synced with doctor's clinical consultation roster.
              </span>
            </div>
          </div>

          {/* Dynamic Cycles & Real Availability */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Select Available Appointment Slot
              </label>
              {calculation && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Shift: {calculation.shift_start} – {calculation.shift_end} ({calculation.bookable_slots_count} bookable slots)
                </span>
              )}
            </div>

            {/* Explanatory Banner */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800 text-[11px] text-emerald-950 dark:text-emerald-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Doctor's Consultation Schedule:</strong> {calculation ? `${calculation.consultation_duration}-minute direct patient consultation with a ${calculation.buffer_duration}-minute transition/buffer interval (${calculation.cycle_minutes} min total cycle). 1 slot is preserved as protected clinic buffer.` : 'Loading schedule settings...'}
              </div>
            </div>

            {loadingSlots ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs animate-pulse">
                Computing shift capacity and appointment cycles...
              </div>
            ) : unavailableMessage ? (
              <div className="p-6 text-center bg-amber-50/60 dark:bg-amber-950/40 rounded-2xl border border-amber-200/60 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <p className="font-bold">No Clinic Schedule for Selected Date</p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">{unavailableMessage}</p>
              </div>
            ) : calculation && calculation.slots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calculation.slots.map((slot) => {
                  const isSelected = selectedSlot && selectedSlot.start_time === slot.start_time;

                  if (slot.is_reserved_capacity) {
                    return (
                      <div
                        key={slot.start_time}
                        className="p-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 flex items-start gap-2.5 opacity-80 cursor-not-allowed select-none"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">{slot.start_time} – {slot.end_time}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                              Reserved
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                            Protected clinic capacity (emergency & operational buffer)
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (slot.is_booked) {
                    return (
                      <div
                        key={slot.start_time}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-start gap-2.5 opacity-60 cursor-not-allowed select-none"
                      >
                        <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 line-through">
                            {slot.start_time} – {slot.end_time}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Booked by another patient
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      id={`slot-btn-${slot.start_time.replace(':', '-')}`}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-emerald-800 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/80 ring-2 ring-emerald-700/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50/80 dark:hover:bg-slate-750'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isSelected ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {slot.start_time} – {slot.end_time}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                            Available
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {slot.consultation_duration || 30}m consult + {slot.buffer_duration || 10}m buffer (cycle ends {slot.interval_end_time})
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Clinical Reason & Symptoms Input */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Consultation Details
            </label>
            <div>
              <input
                id="input-booking-reason"
                type="text"
                required
                placeholder="Chief medical reason (e.g. Routine blood pressure check, persistent cough, antenatal follow-up)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
            <div>
              <textarea
                id="input-booking-symptoms"
                rows={2}
                placeholder="Optional: Detail any symptoms, duration, or current medications..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Summary & Price */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Consultation Fee</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                ₦{Number(doctor.consultation_fee || 5000).toLocaleString('en-NG')}
              </span>
            </div>
            <div className="text-right text-slate-500 dark:text-slate-400">
              <span className="block">Patient Reference</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {user ? user.patient_id || user.full_name : 'Sign in required'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              id="btn-confirm-appointment"
              type="submit"
              disabled={bookingLoading || !selectedSlot}
              className="w-full py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingLoading ? 'Securing Slot in Database...' : 'Confirm Appointment'}
              {!bookingLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
