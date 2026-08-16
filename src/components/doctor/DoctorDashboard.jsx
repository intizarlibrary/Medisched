import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Stethoscope,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  Sliders,
  Settings,
  Save,
  RotateCcw,
  Play,
  Check,
  Plus,
  Trash2,
  Sparkles,
  DollarSign,
  Layers
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' }
];

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'settings' | 'upcoming'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Clinical consultation completion modal
  const [completingApt, setCompletingApt] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [updatingApt, setUpdatingApt] = useState(false);

  // Doctor Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  const [consultDuration, setConsultDuration] = useState(30);
  const [bufferDuration, setBufferDuration] = useState(10);
  const [consultFee, setConsultFee] = useState(5000);
  const [roomNumber, setRoomNumber] = useState('');
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [schedules, setSchedules] = useState([]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await api.getDoctorSettings();
      if (data && data.doctor) {
        const doc = data.doctor;
        setConsultDuration(doc.consultation_duration || 30);
        setBufferDuration(doc.buffer_duration !== undefined ? doc.buffer_duration : 10);
        setConsultFee(doc.consultation_fee || 5000);
        setRoomNumber(doc.room_number || '');
        setBio(doc.bio || '');
        setQualifications(doc.qualifications || '');
        setSchedules(doc.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load doctor settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadDoctorSettings();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.appointment_date === todayStr);
  const upcomingAppointments = appointments.filter((a) => a.appointment_date > todayStr);

  const handleStatusChange = async (aptId, newStatus, extraData = {}) => {
    try {
      await api.updateAppointmentStatus(aptId, { status: newStatus, ...extraData });
      await loadAppointments();
      if (selectedAppointment && selectedAppointment.id === aptId) {
        const updated = await api.getAppointment(aptId);
        setSelectedAppointment(updated.appointment);
      }
    } catch (err) {
      alert(err.message || 'Failed to update consultation status');
    }
  };

  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    if (!completingApt) return;
    setUpdatingApt(true);
    try {
      await api.updateAppointmentStatus(completingApt.id, {
        status: 'Completed',
        consultation_notes: notes,
        prescription: prescription
      });
      setCompletingApt(null);
      setNotes('');
      setPrescription('');
      await loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to complete consultation');
    } finally {
      setUpdatingApt(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    try {
      const payload = {
        consultation_duration: Number(consultDuration),
        buffer_duration: Number(bufferDuration),
        consultation_fee: Number(consultFee),
        room_number: roomNumber,
        bio: bio,
        qualifications: qualifications,
        schedules: schedules
      };

      const res = await api.updateDoctorSettings(payload);
      setSaveSuccessMessage('Consultation time and scheduling settings updated successfully!');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
      await loadDoctorSettings();
    } catch (err) {
      setSaveErrorMessage(err.message || 'Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Schedule helper
  const toggleDaySchedule = (dayId) => {
    const existingIndex = schedules.findIndex((s) => s.day_of_week === dayId);
    if (existingIndex >= 0) {
      // Remove
      setSchedules(schedules.filter((s) => s.day_of_week !== dayId));
    } else {
      // Add default 09:00 - 13:00
      setSchedules([...schedules, { day_of_week: dayId, start_time: '09:00', end_time: '13:00', is_active: 1 }]);
    }
  };

  const updateScheduleTimes = (dayId, field, value) => {
    setSchedules(
      schedules.map((s) => {
        if (s.day_of_week === dayId) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const totalCycleMinutes = Number(consultDuration) + Number(bufferDuration);
  const slotsInFourHours = Math.floor(240 / (totalCycleMinutes || 40));
  const bookableSlotsInFourHours = Math.max(1, slotsInFourHours - 1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Doctor Clinical Portal
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {user?.doctor?.specialty_name || 'Specialist Consultant'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {consultDuration}m consult + {bufferDuration}m buffer
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Welcome, {user?.full_name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{user?.doctor?.clinic_name || 'Healthcare Center'} • Room: {roomNumber || user?.doctor?.room_number || 'Consulting Room'}</span>
          </p>
        </div>

        {/* Quick Shift KPI and Settings Shortcut */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="btn-switch-settings"
            onClick={() => setActiveTab(activeTab === 'settings' ? 'queue' : 'settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === 'settings'
                ? 'bg-emerald-900 text-white border-emerald-800 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{activeTab === 'settings' ? 'View Patient Queue' : 'Edit Consultation Time'}</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider">Today's Queue</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{todayAppointments.length} Patients</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-900 dark:bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
              {todayAppointments.filter((a) => a.status === 'Completed').length}/{todayAppointments.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          id="tab-btn-queue"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Today's Patient Queue ({todayAppointments.length})</span>
        </button>

        <button
          id="tab-btn-settings"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Consultation Time & Schedule Settings</span>
        </button>

        <button
          id="tab-btn-upcoming"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Future Appointments ({upcomingAppointments.length})</span>
        </button>
      </div>

      {/* TAB 1: TODAY'S PATIENT QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Appointments Queue */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Today's Consultations ({consultDuration}m + {bufferDuration}m Buffer)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{todayStr}</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs animate-pulse">
                  Loading today's schedule...
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Patient Consultations Scheduled for Today</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Upcoming appointments will appear as patients book slots.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        selectedAppointment?.id === apt.id
                          ? 'border-emerald-800 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                              {apt.start_time} – {apt.end_time}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              (Cycle: {apt.interval_end_time})
                            </span>
                            <StatusBadge status={apt.status} size="sm" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{apt.patient_name}</span>
                            <span className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                              {apt.patient_code}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium text-slate-400 dark:text-slate-500">Reason:</span> {apt.reason || 'General medical consultation'}
                          </p>
                        </div>

                        {/* Clinical Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {apt.status === 'Confirmed' && (
                            <>
                              <button
                                id={`btn-checkin-${apt.id}`}
                                onClick={() => handleStatusChange(apt.id, 'Checked In')}
                                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Check In
                              </button>
                              <button
                                id={`btn-noshow-${apt.id}`}
                                onClick={() => handleStatusChange(apt.id, 'No Show')}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors cursor-pointer"
                              >
                                No Show
                              </button>
                            </>
                          )}

                          {apt.status === 'Checked In' && (
                            <button
                              id={`btn-start-consult-${apt.id}`}
                              onClick={() => handleStatusChange(apt.id, 'In Consultation')}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Play className="w-3 h-3" />
                              Start Consultation
                            </button>
                          )}

                          {apt.status === 'In Consultation' && (
                            <button
                              id={`btn-complete-consult-${apt.id}`}
                              onClick={() => {
                                setCompletingApt(apt);
                                setNotes(apt.consultation_notes || '');
                                setPrescription(apt.prescription || '');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Complete & Prescribe
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Patient File Details */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Patient File Inspector
              </h3>

              {selectedAppointment ? (
                <div className="space-y-3.5 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                      Patient Reference Code
                    </span>
                    <p className="text-base font-mono font-black text-emerald-950 dark:text-emerald-100 mt-0.5">
                      {selectedAppointment.patient_code}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Full Legal Name:</span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedAppointment.patient_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Phone & Email:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{selectedAppointment.patient_phone || 'None'} • {selectedAppointment.patient_email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Gender & DOB:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{selectedAppointment.patient_gender || '—'} {selectedAppointment.patient_dob ? `(${selectedAppointment.patient_dob})` : ''}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Symptoms / Notes from Patient:</span>
                      <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {selectedAppointment.symptoms || selectedAppointment.reason || 'No additional symptoms noted'}
                      </p>
                    </div>
                  </div>

                  {selectedAppointment.consultation_notes && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Saved Assessment Notes:</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedAppointment.consultation_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  Click "Details" on any consultation in the queue to inspect patient records.
                </div>
              )}
            </div>

            {/* Custom Doctor Consultation Duration Summary */}
            <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-xs space-y-3 text-xs border border-emerald-800/50">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                Active Consultation Specs
              </h4>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex justify-between border-b border-emerald-900/60 pb-1">
                  <span>Direct Consultation:</span>
                  <span className="font-bold text-white">{consultDuration} mins</span>
                </div>
                <div className="flex justify-between border-b border-emerald-900/60 pb-1">
                  <span>Buffer / Rest Interval:</span>
                  <span className="font-bold text-white">{bufferDuration} mins</span>
                </div>
                <div className="flex justify-between border-b border-emerald-900/60 pb-1">
                  <span>Total Cycle Length:</span>
                  <span className="font-bold text-emerald-300">{totalCycleMinutes} mins</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Capacity (4-hr shift):</span>
                  <span className="font-bold text-white">{bookableSlotsInFourHours} slots (+ 1 buffer)</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="w-full mt-2 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Modify Duration & Buffer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSULTATION TIME & SCHEDULE SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {saveSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {saveErrorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveErrorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Consultation Duration & Buffer Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                    Doctor Consultation Duration Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Customize how long you examine each patient and the resting/sanitization buffer between appointments.
                  </p>
                </div>

                {/* 1. Direct Consultation Duration */}
                <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 dark:text-white">
                        Direct Patient Consultation Time
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Face-to-face examination, assessment, and prescription period.
                      </p>
                    </div>
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-400 font-mono">
                      {consultDuration} mins
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {[15, 20, 30, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        id={`btn-preset-duration-${mins}`}
                        onClick={() => setConsultDuration(mins)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          Number(consultDuration) === mins
                            ? 'bg-emerald-900 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-600'
                        }`}
                      >
                        {mins} mins
                      </button>
                    ))}
                  </div>

                  {/* Range Slider & Manual Input */}
                  <div className="flex items-center gap-4 pt-2">
                    <input
                      id="range-consult-duration"
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={consultDuration}
                      onChange={(e) => setConsultDuration(Number(e.target.value))}
                      className="w-full accent-emerald-800 cursor-pointer"
                    />
                    <div className="w-20 shrink-0">
                      <input
                        id="input-consult-duration-manual"
                        type="number"
                        min={10}
                        max={180}
                        value={consultDuration}
                        onChange={(e) => setConsultDuration(Math.max(10, Math.min(180, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Buffer & Sanitization Interval */}
                <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 dark:text-white">
                        Rest, Sanitization & Charting Buffer
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Buffer between patients to prevent clinic backlog and doctor fatigue.
                      </p>
                    </div>
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-400 font-mono">
                      {bufferDuration} mins
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {[0, 5, 10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        id={`btn-preset-buffer-${mins}`}
                        onClick={() => setBufferDuration(mins)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          Number(bufferDuration) === mins
                            ? 'bg-emerald-900 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-600'
                        }`}
                      >
                        {mins === 0 ? 'No Buffer (0m)' : `${mins} mins`}
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <div className="flex items-center gap-4 pt-2">
                    <input
                      id="range-buffer-duration"
                      type="range"
                      min={0}
                      max={45}
                      step={5}
                      value={bufferDuration}
                      onChange={(e) => setBufferDuration(Number(e.target.value))}
                      className="w-full accent-emerald-800 cursor-pointer"
                    />
                    <div className="w-20 shrink-0">
                      <input
                        id="input-buffer-duration-manual"
                        type="number"
                        min={0}
                        max={60}
                        value={bufferDuration}
                        onChange={(e) => setBufferDuration(Math.max(0, Math.min(60, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Clinical Profile & Fees */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Consultation Fee (₦ NGN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₦</span>
                      <input
                        id="input-doc-fee"
                        type="number"
                        min={0}
                        step={500}
                        value={consultFee}
                        onChange={(e) => setConsultFee(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Consulting Room / Office
                    </label>
                    <input
                      id="input-doc-room"
                      type="text"
                      placeholder="e.g. Suite 204, Consulting Wing B"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* 4. Weekly Shift & Working Hours */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white">
                      Weekly Clinic Shift Availability
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Toggle active shift days & set consultation hours
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const activeSched = schedules.find((s) => s.day_of_week === day.id);
                      const isActive = !!activeSched;

                      return (
                        <div
                          key={day.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              id={`btn-toggle-day-${day.id}`}
                              onClick={() => toggleDaySchedule(day.id)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-900 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[90px]">
                              {day.name}
                            </span>
                          </div>

                          {isActive && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">From:</span>
                              <input
                                type="time"
                                value={activeSched.start_time || '09:00'}
                                onChange={(e) => updateScheduleTimes(day.id, 'start_time', e.target.value)}
                                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-500 dark:text-slate-400">To:</span>
                              <input
                                type="time"
                                value={activeSched.end_time || '13:00'}
                                onChange={(e) => updateScheduleTimes(day.id, 'end_time', e.target.value)}
                                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Shift Capacity Preview & Save Action */}
            <div className="space-y-5">
              {/* Capacity Calculation Engine */}
              <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 border border-emerald-800/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-base text-white">Live Cycle Simulation</h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Based on your configured settings, each patient slot is generated dynamically in SQLite:
                </p>

                <div className="p-4 rounded-2xl bg-emerald-900/60 border border-emerald-700/60 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Consultation Duration:</span>
                    <span className="font-bold text-white">{consultDuration} mins</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Buffer / Break Interval:</span>
                    <span className="font-bold text-white">{bufferDuration} mins</span>
                  </div>
                  <div className="h-px bg-emerald-700/40 my-1" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-300">Total Cycle Time:</span>
                    <span className="font-black text-emerald-300 font-mono text-sm">{totalCycleMinutes} mins</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Slots in 4-Hour Shift:</span>
                    <span className="font-bold text-white">{slotsInFourHours} total cycles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bookable Patient Slots:</span>
                    <span className="font-bold text-emerald-300">{bookableSlotsInFourHours} patients</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protected Emergency Buffer:</span>
                    <span className="font-bold text-amber-400">1 cycle (reserved)</span>
                  </div>
                </div>

                <button
                  id="btn-save-doctor-settings"
                  type="submit"
                  disabled={settingsSaving}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{settingsSaving ? 'Saving Settings...' : 'Save & Update Live Schedule'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: FUTURE APPOINTMENTS */}
      {activeTab === 'upcoming' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
            <span>Future Scheduled Consultations ({upcomingAppointments.length})</span>
          </h3>

          {upcomingAppointments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              No future bookings recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{apt.patient_name}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-mono ml-2">{apt.patient_code}</span>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {apt.appointment_date} at {apt.start_time} – {apt.end_time} • {apt.reason}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete Consultation Modal */}
      {completingApt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Complete Consultation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Patient: {completingApt.patient_name} ({completingApt.patient_code})
                </p>
              </div>
              <button onClick={() => setCompletingApt(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Assessment & Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record diagnosis, observations, blood pressure findings..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prescription & Treatment Plan
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tab Paracetamol 1g TDS x 3 days, Tab Amoxicillin 500mg..."
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingApt(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingApt}
                  className="px-5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {updatingApt ? 'Saving...' : 'Finalize & Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
