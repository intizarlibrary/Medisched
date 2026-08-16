import { Router } from 'express';
import { db } from '../db.js';
import { authenticateToken, generateAppointmentCode } from '../auth.js';
import { validateBookingSlot } from '../scheduler.js';

export const appointmentsRouter = Router();

// 1. Book an Appointment (Patient)
appointmentsRouter.post('/', authenticateToken, (req, res) => {
  try {
    const { doctor_id, appointment_date, start_time, reason, symptoms } = req.body;

    if (!doctor_id || !appointment_date || !start_time) {
      return res.status(400).json({ error: 'Doctor, appointment date, and start time are required.' });
    }

    // Determine patient ID
    const patientId = req.user.id;

    // Check if doctor exists and is active
    const doctor = db.prepare(`
      SELECT d.*, c.id as clinic_id, c.name as clinic_name
      FROM doctors d
      JOIN clinics c ON d.clinic_id = c.id
      WHERE d.id = ? AND d.is_active = 1
    `).get(Number(doctor_id));

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found or currently inactive.' });
    }

    // Validate 40-minute cycle & reserved capacity & double-booking
    const validation = validateBookingSlot(Number(doctor_id), appointment_date, start_time);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const appointmentCode = generateAppointmentCode();

    const insertStmt = db.prepare(`
      INSERT INTO appointments (
        appointment_code, patient_id, doctor_id, clinic_id, appointment_date,
        start_time, end_time, interval_end_time, status, reason, symptoms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?)
    `);

    const result = insertStmt.run(
      appointmentCode,
      patientId,
      Number(doctor_id),
      doctor.clinic_id,
      appointment_date,
      start_time,
      validation.endTime,
      validation.intervalEndTime,
      reason ? reason.trim() : 'General consultation',
      symptoms ? symptoms.trim() : null
    );

    const createdAppointment = db.prepare(`
      SELECT
        a.*,
        u_doc.full_name as doctor_name,
        u_doc.phone as doctor_phone,
        d.room_number,
        d.consultation_fee,
        s.name as specialty_name,
        s.code as specialty_code,
        c.name as clinic_name,
        c.address as clinic_address,
        c.city as clinic_city,
        c.state as clinic_state,
        c.phone as clinic_phone,
        u_pat.full_name as patient_name,
        u_pat.patient_id as patient_code,
        u_pat.phone as patient_phone,
        u_pat.email as patient_email,
        u_pat.gender as patient_gender,
        u_pat.dob as patient_dob
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON a.clinic_id = c.id
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Appointment successfully confirmed.',
      appointment: createdAppointment
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment. Please try again.' });
  }
});

// 2. Get Appointments List (Role Filtered)
appointmentsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const { status, date, doctor_id } = req.query;

    let query = `
      SELECT
        a.*,
        u_doc.full_name as doctor_name,
        u_doc.phone as doctor_phone,
        d.room_number,
        d.consultation_fee,
        s.name as specialty_name,
        s.code as specialty_code,
        c.name as clinic_name,
        c.type as clinic_type,
        c.address as clinic_address,
        c.city as clinic_city,
        c.state as clinic_state,
        c.phone as clinic_phone,
        u_pat.full_name as patient_name,
        u_pat.patient_id as patient_code,
        u_pat.phone as patient_phone,
        u_pat.email as patient_email,
        u_pat.gender as patient_gender,
        u_pat.dob as patient_dob
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON a.clinic_id = c.id
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE 1=1
    `;

    const params = [];

    if (user.role === 'patient') {
      query += ` AND a.patient_id = ?`;
      params.push(user.id);
    } else if (user.role === 'doctor') {
      const docRecord = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user.id);
      if (!docRecord) {
        return res.json({ appointments: [] });
      }
      query += ` AND a.doctor_id = ?`;
      params.push(docRecord.id);
    } else if (user.role === 'admin') {
      const clinicRecord = db.prepare('SELECT id FROM clinics WHERE admin_id = ?').get(user.id);
      if (clinicRecord) {
        query += ` AND a.clinic_id = ?`;
        params.push(clinicRecord.id);
      }
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND a.appointment_date = ?`;
      params.push(date);
    }

    if (doctor_id) {
      query += ` AND a.doctor_id = ?`;
      params.push(Number(doctor_id));
    }

    query += ` ORDER BY a.appointment_date DESC, a.start_time ASC`;

    const appointments = db.prepare(query).all(...params);

    res.json({ appointments });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// 3. Get Appointment Details by ID
appointmentsRouter.get('/:id', authenticateToken, (req, res) => {
  try {
    const aptId = Number(req.params.id);

    const appointment = db.prepare(`
      SELECT
        a.*,
        u_doc.full_name as doctor_name,
        u_doc.phone as doctor_phone,
        d.room_number,
        d.consultation_fee,
        s.name as specialty_name,
        s.code as specialty_code,
        c.name as clinic_name,
        c.type as clinic_type,
        c.address as clinic_address,
        c.city as clinic_city,
        c.state as clinic_state,
        c.phone as clinic_phone,
        u_pat.full_name as patient_name,
        u_pat.patient_id as patient_code,
        u_pat.phone as patient_phone,
        u_pat.email as patient_email,
        u_pat.gender as patient_gender,
        u_pat.dob as patient_dob
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON a.clinic_id = c.id
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE a.id = ?
    `).get(aptId);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Role check: Patient can only view their own; Doctor can view their assigned; Admin can view facility
    if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Failed to retrieve appointment details.' });
  }
});

// 4. Update Appointment Status & Clinical Notes (Doctor / Admin)
// Transitions: Confirmed -> Checked In -> In Consultation -> Completed / No Show / Cancelled
appointmentsRouter.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const aptId = Number(req.params.id);
    const { status, consultation_notes, prescription, cancellation_reason } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid appointment status: ${status}` });
    }

    const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(aptId);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check authority
    if (req.user.role === 'patient') {
      if (status !== 'Cancelled') {
        return res.status(403).json({ error: 'Patients can only cancel consultations.' });
      }
      if (apt.patient_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (req.user.role === 'doctor') {
      const docRecord = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
      if (!docRecord || docRecord.id !== apt.doctor_id) {
        return res.status(403).json({ error: 'You are not assigned to this consultation.' });
      }
    }

    db.prepare(`
      UPDATE appointments
      SET status = ?,
          consultation_notes = COALESCE(?, consultation_notes),
          prescription = COALESCE(?, prescription),
          cancellation_reason = COALESCE(?, cancellation_reason),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      status,
      consultation_notes || null,
      prescription || null,
      cancellation_reason || null,
      aptId
    );

    const updated = db.prepare(`
      SELECT
        a.*,
        u_doc.full_name as doctor_name,
        d.room_number,
        s.name as specialty_name,
        c.name as clinic_name,
        u_pat.full_name as patient_name,
        u_pat.patient_id as patient_code,
        u_pat.phone as patient_phone
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON a.clinic_id = c.id
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE a.id = ?
    `).get(aptId);

    res.json({
      message: `Appointment status updated to ${status}.`,
      appointment: updated
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

// 5. Reschedule Appointment to a New 40-minute Slot
appointmentsRouter.post('/:id/reschedule', authenticateToken, (req, res) => {
  try {
    const aptId = Number(req.params.id);
    const { appointment_date, start_time } = req.body;

    if (!appointment_date || !start_time) {
      return res.status(400).json({ error: 'New appointment date and start time are required.' });
    }

    const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(aptId);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (req.user.role === 'patient' && apt.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate new slot
    const validation = validateBookingSlot(apt.doctor_id, appointment_date, start_time);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    db.prepare(`
      UPDATE appointments
      SET appointment_date = ?,
          start_time = ?,
          end_time = ?,
          interval_end_time = ?,
          status = 'Confirmed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      appointment_date,
      start_time,
      validation.endTime,
      validation.intervalEndTime,
      aptId
    );

    const updated = db.prepare(`
      SELECT
        a.*,
        u_doc.full_name as doctor_name,
        d.room_number,
        s.name as specialty_name,
        c.name as clinic_name,
        u_pat.full_name as patient_name,
        u_pat.patient_id as patient_code
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON a.clinic_id = c.id
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE a.id = ?
    `).get(aptId);

    res.json({
      message: 'Appointment rescheduled successfully.',
      appointment: updated
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment.' });
  }
});

// 6. Cancel Appointment (Frees the Slot)
appointmentsRouter.post('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const aptId = Number(req.params.id);
    const { reason } = req.body;

    const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(aptId);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (req.user.role === 'patient' && apt.patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    db.prepare(`
      UPDATE appointments
      SET status = 'Cancelled',
          cancellation_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason ? reason.trim() : 'Cancelled by user', aptId);

    res.json({
      message: 'Appointment has been cancelled successfully.'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});
