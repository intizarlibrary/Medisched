import { db } from './db.js';

// Convert "HH:MM" to total minutes from midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert total minutes from midnight to "HH:MM"
export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export const DEFAULT_CONSULTATION_DURATION = 30;
export const DEFAULT_BUFFER_DURATION = 10;

/**
 * Calculates all appointment cycles for a given doctor on a given date based on their
 * custom consultation duration and buffer interval.
 * Enforces the Reserved Capacity rule (1 reserved cycle for clinic operational buffer when >1 cycle).
 */
export function calculateDoctorSlotsForDate(doctorId, appointmentDate) {
  // 0. Fetch doctor configuration for custom consultation & buffer durations
  const doctor = db.prepare(`
    SELECT d.id, d.consultation_duration, d.buffer_duration, u.full_name as doctor_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).get(doctorId);

  const consultationDuration = Number(doctor?.consultation_duration) > 0 ? Number(doctor.consultation_duration) : DEFAULT_CONSULTATION_DURATION;
  const bufferDuration = doctor?.buffer_duration !== undefined && doctor?.buffer_duration !== null ? Number(doctor.buffer_duration) : DEFAULT_BUFFER_DURATION;
  const cycleMinutes = consultationDuration + bufferDuration;

  // 1. Get day of week for the appointment date (0=Sun, 1=Mon, ..., 6=Sat)
  const [year, month, day] = appointmentDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  // 2. Check if there is an active schedule exception for this date
  const exception = db.prepare(`
    SELECT * FROM schedule_exceptions
    WHERE doctor_id = ? AND exception_date = ?
  `).get(doctorId, appointmentDate);

  if (exception && exception.is_available === 0) {
    return {
      is_on_leave: true,
      leave_reason: exception.reason || 'Doctor unavailable on this date',
      consultation_duration: consultationDuration,
      buffer_duration: bufferDuration,
      cycle_minutes: cycleMinutes,
      slots: [],
      possible_cycles: 0,
      bookable_slots_count: 0,
      reserved_slots_count: 0
    };
  }

  // 3. Query doctor's schedule for this day
  const schedule = db.prepare(`
    SELECT * FROM doctor_schedules
    WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1
  `).get(doctorId, dayOfWeek);

  if (!schedule) {
    return null; // Doctor does not work on this day
  }

  const startMinutes = timeToMinutes(schedule.start_time);
  const endMinutes = timeToMinutes(schedule.end_time);
  const totalWorkingMinutes = endMinutes - startMinutes;

  if (totalWorkingMinutes < consultationDuration || cycleMinutes <= 0) {
    return null;
  }

  // Calculate total cycles that fit within the working window
  const possibleCycles = Math.floor(totalWorkingMinutes / cycleMinutes);

  if (possibleCycles === 0) {
    return null;
  }

  // Capacity rule: Reserve 1 slot if possibleCycles > 1, making (possibleCycles - 1) bookable
  const reservedSlotsCount = possibleCycles > 1 ? 1 : 0;
  const bookableSlotsCount = possibleCycles - reservedSlotsCount;

  // 4. Fetch existing appointments for this doctor on this date (excluding cancelled ones)
  const appointments = db.prepare(`
    SELECT a.*, u.full_name as patient_name, u.patient_id as patient_code, u.phone as patient_phone, u.gender as patient_gender, u.dob as patient_dob
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status NOT IN ('Cancelled')
  `).all(doctorId, appointmentDate);

  const bookedMap = new Map();
  for (const apt of appointments) {
    bookedMap.set(apt.start_time, apt);
  }

  const slots = [];

  for (let i = 0; i < possibleCycles; i++) {
    const cycleStart = startMinutes + i * cycleMinutes;
    const consultationEnd = cycleStart + consultationDuration;
    const intervalEnd = cycleStart + cycleMinutes;

    const startTimeStr = minutesToTime(cycleStart);
    const endTimeStr = minutesToTime(consultationEnd);
    const intervalEndStr = minutesToTime(intervalEnd);

    // The last slot is designated as Reserved Capacity (when possibleCycles > 1)
    const isReserved = possibleCycles > 1 && i === possibleCycles - 1;
    const existingAppointment = bookedMap.get(startTimeStr);

    slots.push({
      slot_number: i + 1,
      start_time: startTimeStr,
      end_time: endTimeStr,
      interval_end_time: intervalEndStr,
      consultation_duration: consultationDuration,
      buffer_duration: bufferDuration,
      is_reserved_capacity: isReserved,
      is_booked: Boolean(existingAppointment),
      appointment: existingAppointment || null
    });
  }

  return {
    doctor_id: doctorId,
    doctor_name: doctor?.doctor_name,
    consultation_duration: consultationDuration,
    buffer_duration: bufferDuration,
    cycle_minutes: cycleMinutes,
    shift_start: schedule.start_time,
    shift_end: schedule.end_time,
    total_working_minutes: totalWorkingMinutes,
    possible_cycles: possibleCycles,
    bookable_slots_count: bookableSlotsCount,
    reserved_slots_count: reservedSlotsCount,
    slots
  };
}

/**
 * Validates whether a requested appointment slot is valid for booking by a patient.
 */
export function validateBookingSlot(doctorId, appointmentDate, startTime) {
  const calculation = calculateDoctorSlotsForDate(doctorId, appointmentDate);

  if (!calculation) {
    return { isValid: false, error: 'Doctor has no active clinic schedule on the selected date.' };
  }

  if (calculation.is_on_leave) {
    return { isValid: false, error: calculation.leave_reason || 'Doctor is on scheduled leave on this date.' };
  }

  const targetSlot = calculation.slots.find((s) => s.start_time === startTime);

  if (!targetSlot) {
    return { isValid: false, error: `Requested start time does not align with a valid scheduling cycle (${calculation.consultation_duration}m consult + ${calculation.buffer_duration}m buffer) for this doctor.` };
  }

  if (targetSlot.is_reserved_capacity) {
    return {
      isValid: false,
      error: 'This slot is designated as Reserved Clinic Capacity (buffer/emergency) and cannot be booked by patients.'
    };
  }

  if (targetSlot.is_booked) {
    return {
      isValid: false,
      error: 'This appointment slot is already booked by another patient.'
    };
  }

  return {
    isValid: true,
    endTime: targetSlot.end_time,
    intervalEndTime: targetSlot.interval_end_time
  };
}
