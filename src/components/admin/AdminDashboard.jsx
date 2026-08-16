import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { StatusBadge } from '../StatusBadge.jsx';
import { AppointmentReceiptModal } from '../AppointmentReceiptModal.jsx';
import {
  Building2,
  Users,
  Calendar,
  Clock,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  UserCheck,
  User
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  // Navigation tab within Admin Portal
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'doctors' | 'appointments' | 'capacity' | 'patients'

  // Data states
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Doctor Modal
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docIsGeneral, setDocIsGeneral] = useState(false);
  const [docLicense, setDocLicense] = useState('');
  const [docQualifications, setDocQualifications] = useState('MBBS, FWACS');
  const [docExp, setDocExp] = useState('8');
  const [docBio, setDocBio] = useState('');
  const [docRoom, setDocRoom] = useState('Consulting Suite 1');
  const [docFee, setDocFee] = useState('6000');
  const [docConsultDuration, setDocConsultDuration] = useState('30');
  const [docBufferDuration, setDocBufferDuration] = useState('10');
  const [docDays, setDocDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [docStart, setDocStart] = useState('09:00');
  const [docEnd, setDocEnd] = useState('13:00');
  const [savingDoc, setSavingDoc] = useState(false);
  const [docModalError, setDocModalError] = useState('');

  // Capacity Inspector
  const [inspectorDoctorId, setInspectorDoctorId] = useState('');
  const [inspectorDate, setInspectorDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [inspecting, setInspecting] = useState(false);

  // Selected slip
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, aptsRes, specsRes, patientsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminDoctors(),
        api.getAppointments(),
        api.getSpecialties(),
        api.getAdminPatients()
      ]);
      setStats(statsRes);
      setDoctors(docsRes.doctors || []);
      setAppointments(aptsRes.appointments || []);
      setSpecialties(specsRes.specialties || []);
      setPatients(patientsRes.patients || []);

      if (docsRes.doctors && docsRes.doctors.length > 0 && !inspectorDoctorId) {
        setInspectorDoctorId(String(docsRes.doctors[0].id));
      }
    } catch (err) {
      console.error('Failed to load clinic management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run capacity inspection
  const handleInspectCapacity = async () => {
    if (!inspectorDoctorId || !inspectorDate) return;
    setInspecting(true);
    try {
      const data = await api.getAdminCapacityInspector(inspectorDoctorId, inspectorDate);
      setInspectionResult(data.calculation);
    } catch (err) {
      console.error('Failed to inspect capacity:', err);
      setInspectionResult(null);
    } finally {
      setInspecting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'capacity' && inspectorDoctorId && inspectorDate) {
      handleInspectCapacity();
    }
  }, [activeTab, inspectorDoctorId, inspectorDate]);

  // Open Add Doctor Modal
  const openAddDoctorModal = () => {
    setEditingDoctor(null);
    setDocName('');
    setDocEmail('');
    setDocPhone('');
    setDocPassword('DoctorPass123!');
    setDocSpecialty(specialties[0]?.id ? String(specialties[0].id) : '1');
    setDocIsGeneral(false);
    setDocLicense('MDCN-KAD-' + Math.floor(1000 + Math.random() * 9000));
    setDocQualifications('MBBS, FWACS');
    setDocExp('8');
    setDocBio('Consultant Specialist committed to excellence in patient diagnosis and care.');
    setDocRoom('Consulting Suite ' + (doctors.length + 1));
    setDocFee('6000');
    setDocConsultDuration('30');
    setDocBufferDuration('10');
    setDocDays([1, 2, 3, 4, 5]);
    setDocStart('09:00');
    setDocEnd('13:00');
    setDocModalError('');
    setDoctorModalOpen(true);
  };

  // Open Edit Doctor Modal
  const openEditDoctorModal = (doc) => {
    setEditingDoctor(doc);
    setDocName(doc.name);
    setDocEmail(doc.email);
    setDocPhone(doc.phone || '');
    setDocSpecialty(String(doc.specialty_id));
    setDocIsGeneral(Boolean(doc.is_general_doctor));
    setDocLicense(doc.license_number || '');
    setDocQualifications(doc.qualifications || '');
    setDocExp(String(doc.experience_years || 5));
    setDocBio(doc.bio || '');
    setDocRoom(doc.room_number || 'Room 1');
    setDocFee(String(doc.consultation_fee || 5000));
    setDocConsultDuration(String(doc.consultation_duration || 30));
    setDocBufferDuration(String(doc.buffer_duration !== undefined ? doc.buffer_duration : 10));
    const dayIndices = (doc.schedules || []).map((s) => s.day_of_week);
    setDocDays(dayIndices.length > 0 ? dayIndices : [1, 2, 3, 4, 5]);
    if (doc.schedules && doc.schedules.length > 0) {
      setDocStart(doc.schedules[0].start_time);
      setDocEnd(doc.schedules[0].end_time);
    }
    setDocModalError('');
    setDoctorModalOpen(true);
  };

  // Handle Save Doctor
  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    setSavingDoc(true);
    setDocModalError('');

    try {
      const schedulePayload = docDays.map((day) => ({
        day_of_week: day,
        start_time: docStart,
        end_time: docEnd
      }));

      if (editingDoctor) {
        await api.updateDoctor(editingDoctor.id, {
          specialty_id: Number(docSpecialty),
          is_general_doctor: docIsGeneral,
          license_number: docLicense,
          qualifications: docQualifications,
          experience_years: Number(docExp),
          bio: docBio,
          room_number: docRoom,
          consultation_fee: Number(docFee),
          consultation_duration: Number(docConsultDuration) || 30,
          buffer_duration: Number(docBufferDuration) >= 0 ? Number(docBufferDuration) : 10,
          schedules: schedulePayload
        });
      } else {
        await api.createDoctor({
          full_name: docName,
          email: docEmail,
          phone: docPhone,
          password: docPassword,
          specialty_id: Number(docSpecialty),
          clinic_id: user?.clinic?.id || 1,
          is_general_doctor: docIsGeneral,
          license_number: docLicense,
          qualifications: docQualifications,
          experience_years: Number(docExp),
          bio: docBio,
          room_number: docRoom,
          consultation_fee: Number(docFee),
          consultation_duration: Number(docConsultDuration) || 30,
          buffer_duration: Number(docBufferDuration) >= 0 ? Number(docBufferDuration) : 10,
          schedules: schedulePayload
        });
      }

      setDoctorModalOpen(false);
      await loadData();
    } catch (err) {
      setDocModalError(err.message || 'Failed to save doctor details.');
    } finally {
      setSavingDoc(false);
    }
  };

  // Toggle Doctor Active
  const handleToggleDoctor = async (docId) => {
    try {
      await api.toggleDoctorStatus(docId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Status Change for appointment
  const handleAppointmentStatus = async (aptId, newStatus) => {
    try {
      await api.updateAppointmentStatus(aptId, { status: newStatus });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update appointment');
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Clinic Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Healthcare Facility Management
            </span>
            <span className="text-xs text-slate-500">
              Admin: {user?.full_name}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {user?.clinic?.name || 'Kaduna Medical Centre'} Management Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{user?.clinic?.address || 'Kaduna, Nigeria'} • Automated 40-Minute Shift Operations</span>
          </p>
        </div>

        <button
          id="btn-admin-add-doctor"
          onClick={openAddDoctorModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Provision New Doctor
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="tab-admin-overview"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Operations Overview
        </button>
        <button
          id="tab-admin-doctors"
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'doctors' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Doctors & Rosters ({doctors.length})
        </button>
        <button
          id="tab-admin-appointments"
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'appointments' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Consultations ({appointments.length})
        </button>
        <button
          id="tab-admin-capacity"
          onClick={() => setActiveTab('capacity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'capacity' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          40-Min Capacity Inspector
        </button>
        <button
          id="tab-admin-patients"
          onClick={() => setActiveTab('patients')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'patients' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Patient Directory ({patients.length})
        </button>
      </div>

      {/* TAB 1: OPERATIONS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Doctors</span>
              <p className="text-2xl font-black text-slate-900">{stats?.total_doctors || doctors.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Bookings</span>
              <p className="text-2xl font-black text-slate-900">{stats?.total_appointments || appointments.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Today Consults</span>
              <p className="text-2xl font-black text-emerald-800">{stats?.today_appointments || 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Completed</span>
              <p className="text-2xl font-black text-teal-700">{stats?.completed_appointments || 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Cancelled</span>
              <p className="text-2xl font-black text-rose-600">{stats?.cancelled_appointments || 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">No Shows</span>
              <p className="text-2xl font-black text-slate-500">{stats?.no_show_appointments || 0}</p>
            </div>
          </div>

          {/* Quick Doctor Roster Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Hospital Medical Staff Roster</h3>
              <button
                onClick={() => setActiveTab('doctors')}
                className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Manage Staff →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div key={doc.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                      <p className="text-xs font-semibold text-emerald-800">{doc.specialty_name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      doc.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Room: {doc.room_number || 'Suite 1'} • Fee: ₦{Number(doc.consultation_fee || 5000).toLocaleString('en-NG')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCTOR MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Medical Doctor Management</h3>
              <p className="text-xs text-slate-500">Provision doctors, assign medical specialties, and configure shift working windows.</p>
            </div>
            <button
              onClick={openAddDoctorModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="py-3 px-4 font-bold">Doctor Name & Email</th>
                  <th className="py-3 px-4 font-bold">Specialty</th>
                  <th className="py-3 px-4 font-bold">Consulting Room</th>
                  <th className="py-3 px-4 font-bold">Shift Schedule</th>
                  <th className="py-3 px-4 font-bold">Fee (₦)</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                      <p className="text-slate-400 text-[11px]">{doc.email} • {doc.phone || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-800">{doc.specialty_name}</span>
                      {doc.is_general_doctor === 1 && (
                        <span className="block text-[10px] text-blue-600 font-medium">Primary Care</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {doc.room_number || 'Room 1'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {doc.schedules && doc.schedules.length > 0 ? (
                        <div>
                          <span className="font-semibold">{doc.schedules[0].start_time} – {doc.schedules[0].end_time}</span>
                          <span className="block text-[10px] text-slate-400">
                            {doc.schedules.length} working days/wk
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No active shift</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₦{Number(doc.consultation_fee || 5000).toLocaleString('en-NG')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleDoctor(doc.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          doc.is_active === 1
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {doc.is_active === 1 ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditDoctorModal(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Roster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: APPOINTMENT MANAGEMENT */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Hospital Consultation Registry</h3>
            <span className="text-xs text-slate-500 font-medium">Stored persistently in SQLite</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="py-3 px-4 font-bold">Reference</th>
                  <th className="py-3 px-4 font-bold">Patient Details</th>
                  <th className="py-3 px-4 font-bold">Doctor Assigned</th>
                  <th className="py-3 px-4 font-bold">Date & 40-Min Cycle</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {apt.appointment_code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{apt.patient_name}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{apt.patient_code} • {apt.patient_phone || 'No phone'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{apt.doctor_name}</p>
                      <p className="text-slate-400 text-[11px]">{apt.specialty_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold block">{apt.appointment_date}</span>
                      <span className="text-[11px] text-slate-500">{apt.start_time} – {apt.end_time}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={apt.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedSlip(apt)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer font-semibold"
                      >
                        Slip
                      </button>
                      {apt.status === 'Confirmed' && (
                        <button
                          onClick={() => handleAppointmentStatus(apt.id, 'Checked In')}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer font-semibold"
                        >
                          Check In
                        </button>
                      )}
                      {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                        <button
                          onClick={() => handleAppointmentStatus(apt.id, 'Cancelled')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 40-MINUTE CAPACITY INSPECTOR */}
      {activeTab === 'capacity' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">40-Minute Shift Capacity Inspector</h3>
            <p className="text-xs text-slate-500">
              Live mathematical breakdown of 30-minute consultations, 10-minute intervals, and protected 1-slot reserved buffer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Doctor</label>
              <select
                value={inspectorDoctorId}
                onChange={(e) => setInspectorDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Shift Date</label>
              <input
                type="date"
                value={inspectorDate}
                onChange={(e) => setInspectorDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              />
            </div>
          </div>

          {inspecting ? (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
              Computing capacity rules...
            </div>
          ) : !inspectionResult ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
              No active shift found for this doctor on the selected date.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Shift Hours</span>
                  <span className="text-sm font-black text-slate-900">{inspectionResult.shift_start} – {inspectionResult.shift_end}</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Duration</span>
                  <span className="text-sm font-black text-slate-900">{inspectionResult.total_working_minutes} Mins</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Possible 40m Cycles</span>
                  <span className="text-sm font-black text-slate-900">{inspectionResult.possible_cycles} Cycles</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Bookable / Reserved</span>
                  <span className="text-sm font-black text-emerald-950">
                    {inspectionResult.bookable_slots_count} Bookable + {inspectionResult.reserved_slots_count} Buffer
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Calculated Cycle Timeline</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {inspectionResult.slots.map((slot) => (
                    <div
                      key={slot.start_time}
                      className={`p-3 rounded-2xl border flex items-start justify-between text-xs ${
                        slot.is_reserved_capacity
                          ? 'border-amber-200 bg-amber-50/70'
                          : slot.is_booked
                          ? 'border-slate-200 bg-slate-100 text-slate-500'
                          : 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{slot.start_time} – {slot.end_time}</span>
                          <span className="text-[10px] text-slate-400">(Buffer to {slot.interval_end_time})</span>
                        </div>
                        <p className="text-[10px] mt-0.5">
                          {slot.is_reserved_capacity
                            ? 'Protected Clinic Buffer (Emergency / Catch-up)'
                            : slot.is_booked
                            ? `Booked: ${slot.appointment?.patient_name || 'Patient'}`
                            : 'Open for Patient Booking'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        slot.is_reserved_capacity
                          ? 'bg-amber-200 text-amber-900'
                          : slot.is_booked
                          ? 'bg-slate-300 text-slate-700'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {slot.is_reserved_capacity ? 'Reserved' : slot.is_booked ? 'Booked' : 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PATIENT DIRECTORY */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Hospital Patient Identification Index</h3>
            <span className="text-xs text-slate-500">{patients.length} Registered Patients</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="py-3 px-4 font-bold">Patient Code</th>
                  <th className="py-3 px-4 font-bold">Full Legal Name</th>
                  <th className="py-3 px-4 font-bold">Email & Contact</th>
                  <th className="py-3 px-4 font-bold">Gender & DOB</th>
                  <th className="py-3 px-4 font-bold">Total Consultations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {pat.patient_id || 'PAT-RECORD'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {pat.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pat.email} • {pat.phone || 'No phone'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pat.gender || '—'} {pat.dob ? `(${pat.dob})` : ''}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {pat.total_appointments || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Doctor */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingDoctor ? `Edit Doctor: ${editingDoctor.name}` : 'Provision New Doctor Account'}
              </h3>
              <button onClick={() => setDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {docModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {docModalError}
              </div>
            )}

            <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
              {!editingDoctor && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Doctor Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Haruna Sanusi"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="doctor@medisched.ng"
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+234 803..."
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={docPassword}
                      onChange={(e) => setDocPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Specialty *</label>
                  <select
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee (₦) *</label>
                  <input
                    type="number"
                    required
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consulting Room / Unit</label>
                  <input
                    type="text"
                    value={docRoom}
                    onChange={(e) => setDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Qualifications</label>
                <input
                  type="text"
                  value={docQualifications}
                  onChange={(e) => setDocQualifications(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              {/* Working Hours & Shift window */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Consultation Duration & Shift Configuration</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Direct Consultation Time</label>
                    <select
                      value={docConsultDuration}
                      onChange={(e) => setDocConsultDuration(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="20">20 Minutes</option>
                      <option value="30">30 Minutes (Standard)</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Buffer / Rest Interval</label>
                    <select
                      value={docBufferDuration}
                      onChange={(e) => setDocBufferDuration(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="0">0 Min (Back-to-back)</option>
                      <option value="5">5 Minutes</option>
                      <option value="10">10 Minutes (Standard)</option>
                      <option value="15">15 Minutes</option>
                      <option value="20">20 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Shift Start Time (HH:MM)</label>
                    <input
                      type="time"
                      value={docStart}
                      onChange={(e) => setDocStart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Shift End Time (HH:MM)</label>
                    <input
                      type="time"
                      value={docEnd}
                      onChange={(e) => setDocEnd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5">Working Days of Week</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                      const isSelected = docDays.includes(dayNum);
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setDocDays(docDays.filter((d) => d !== dayNum));
                            } else {
                              setDocDays([...docDays, dayNum].sort());
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {dayNames[dayNum].slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold disabled:opacity-50"
                >
                  {savingDoc ? 'Saving...' : editingDoctor ? 'Update Doctor Roster' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip Modal */}
      {selectedSlip && (
        <AppointmentReceiptModal
          appointment={selectedSlip}
          onClose={() => setSelectedSlip(null)}
        />
      )}
    </div>
  );
};
