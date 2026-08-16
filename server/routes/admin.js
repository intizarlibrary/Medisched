import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';
import { calculateDoctorSlotsForDate } from '../scheduler.js';

export const adminRouter = Router();

// Protect all admin endpoints with authentication and 'admin' role check
adminRouter.use(authenticateToken);
adminRouter.use(requireRole('admin'));

// Helper to get administered clinic ID
function getAdminClinicId(user) {
  const clinic = db.prepare('SELECT id FROM clinics WHERE admin_id = ?').get(user.id);
  return clinic ? clinic.id : null;
}

// 1. Get Clinic Management Overview & KPIs
adminRouter.get('/stats', (req, res) => {
  try {
    const clinicId = getAdminClinicId(req.user);

    let docCountQuery = 'SELECT COUNT(*) as count FROM doctors WHERE is_active = 1';
    let aptStatsQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN appointment_date = date('now') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN appointment_date > date('now') AND status = 'Confirmed' THEN 1 ELSE 0 END) as upcoming,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'No Show' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN status = 'In Consultation' THEN 1 ELSE 0 END) as in_consultation,
        SUM(CASE WHEN status = 'Checked In' THEN 1 ELSE 0 END) as checked_in
      FROM appointments
    `;

    const params = [];
    const aptParams = [];

    if (clinicId) {
      docCountQuery += ' AND clinic_id = ?';
      params.push(clinicId);

      aptStatsQuery += ' WHERE clinic_id = ?';
      aptParams.push(clinicId);
    }

    const docCount = db.prepare(docCountQuery).get(...params)?.count || 0;
    const aptStats = db.prepare(aptStatsQuery).get(...aptParams) || {
      total: 0, today: 0, upcoming: 0, completed: 0, cancelled: 0, no_show: 0, in_consultation: 0, checked_in: 0
    };

    const patientCount = db.prepare(`
      SELECT COUNT(DISTINCT patient_id) as count FROM appointments ${clinicId ? 'WHERE clinic_id = ?' : ''}
    `).get(...(clinicId ? [clinicId] : []))?.count || 0;

    const specialtyDistribution = db.prepare(`
      SELECT s.name, COUNT(a.id) as count
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN specialties s ON d.specialty_id = s.id
      ${clinicId ? 'WHERE a.clinic_id = ?' : ''}
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 6
    `).all(...(clinicId ? [clinicId] : []));

    res.json({
      total_doctors: docCount,
      total_appointments: aptStats.total || 0,
      today_appointments: aptStats.today || 0,
      upcoming_appointments: aptStats.upcoming || 0,
      completed_appointments: aptStats.completed || 0,
      cancelled_appointments: aptStats.cancelled || 0,
      no_show_appointments: aptStats.no_show || 0,
      in_consultation_appointments: aptStats.in_consultation || 0,
      checked_in_appointments: aptStats.checked_in || 0,
      total_patients: patientCount,
      specialty_distribution: specialtyDistribution
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    res.status(500).json({ error: 'Failed to load clinic statistics.' });
  }
});

// 2. Get All Doctors for Facility Management
adminRouter.get('/doctors', (req, res) => {
  try {
    const clinicId = getAdminClinicId(req.user);

    let query = `
      SELECT
        d.*,
        u.full_name as name,
        u.email,
        u.phone,
        s.name as specialty_name,
        s.code as specialty_code,
        c.name as clinic_name,
        c.city as clinic_city
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON d.clinic_id = c.id
    `;

    const params = [];
    if (clinicId) {
      query += ' WHERE d.clinic_id = ?';
      params.push(clinicId);
    }
    query += ' ORDER BY d.is_active DESC, u.full_name ASC';

    const doctors = db.prepare(query).all(...params);

    const scheduleStmt = db.prepare(`
      SELECT day_of_week, start_time, end_time, is_active
      FROM doctor_schedules
      WHERE doctor_id = ?
      ORDER BY day_of_week ASC
    `);

    const enriched = doctors.map((doc) => ({
      ...doc,
      schedules: scheduleStmt.all(doc.id)
    }));

    res.json({ doctors: enriched });
  } catch (error) {
    console.error('Fetch admin doctors error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctors list.' });
  }
});

// 3. Provision / Add a New Doctor Account
adminRouter.post('/doctors', (req, res) => {
  try {
    const adminClinicId = getAdminClinicId(req.user);
    const {
      full_name,
      email,
      phone,
      password,
      specialty_id,
      clinic_id,
      is_general_doctor,
      license_number,
      qualifications,
      experience_years,
      bio,
      room_number,
      consultation_fee,
      consultation_duration,
      buffer_duration,
      schedules // Array: [{ day_of_week: 1, start_time: "09:00", end_time: "13:00" }, ...]
    } = req.body;

    const targetClinicId = adminClinicId || clinic_id;

    if (!full_name || !email || !specialty_id || !targetClinicId) {
      return res.status(400).json({ error: 'Doctor name, email, specialty, and clinic are required.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this email address already exists.' });
    }

    const defaultPassword = password || 'DoctorPass123!';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    // Create user with 'doctor' role
    const userRes = db.prepare(`
      INSERT INTO users (email, password, full_name, phone, role, gender)
      VALUES (?, ?, ?, ?, 'doctor', 'Other')
    `).run(email.toLowerCase().trim(), hashedPassword, full_name.trim(), phone ? phone.trim() : null);

    const doctorUserId = userRes.lastInsertRowid;

    // Create doctor profile
    const docRes = db.prepare(`
      INSERT INTO doctors (
        user_id, clinic_id, specialty_id, is_general_doctor, license_number,
        qualifications, experience_years, bio, room_number, consultation_fee,
        consultation_duration, buffer_duration, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      doctorUserId,
      targetClinicId,
      Number(specialty_id),
      is_general_doctor ? 1 : 0,
      license_number || 'MDCN-PENDING',
      qualifications || 'MBBS',
      experience_years ? Number(experience_years) : 5,
      bio || '',
      room_number || 'Consulting Room 1',
      consultation_fee ? Number(consultation_fee) : 5000.0,
      consultation_duration ? Number(consultation_duration) : 30,
      buffer_duration !== undefined && buffer_duration !== null ? Number(buffer_duration) : 10
    );

    const doctorId = docRes.lastInsertRowid;

    // Insert schedules if provided, or default Mon-Fri 09:00 - 13:00
    const insertSchedule = db.prepare(`
      INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    if (Array.isArray(schedules) && schedules.length > 0) {
      for (const s of schedules) {
        insertSchedule.run(doctorId, s.day_of_week, s.start_time, s.end_time);
      }
    } else {
      for (let day = 1; day <= 5; day++) {
        insertSchedule.run(doctorId, day, '09:00', '13:00');
      }
    }

    res.status(201).json({
      message: 'Doctor account created and provisioned successfully.',
      doctorId
    });
  } catch (error) {
    console.error('Provision doctor error:', error);
    res.status(500).json({ error: 'Failed to provision doctor account.' });
  }
});

// 4. Update Doctor Profile & Scheduling
adminRouter.patch('/doctors/:id', (req, res) => {
  try {
    const docId = Number(req.params.id);
    const {
      specialty_id,
      is_general_doctor,
      license_number,
      qualifications,
      experience_years,
      bio,
      room_number,
      consultation_fee,
      consultation_duration,
      buffer_duration,
      is_active,
      schedules
    } = req.body;

    db.prepare(`
      UPDATE doctors
      SET specialty_id = COALESCE(?, specialty_id),
          is_general_doctor = COALESCE(?, is_general_doctor),
          license_number = COALESCE(?, license_number),
          qualifications = COALESCE(?, qualifications),
          experience_years = COALESCE(?, experience_years),
          bio = COALESCE(?, bio),
          room_number = COALESCE(?, room_number),
          consultation_fee = COALESCE(?, consultation_fee),
          consultation_duration = COALESCE(?, consultation_duration),
          buffer_duration = COALESCE(?, buffer_duration),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      specialty_id ? Number(specialty_id) : null,
      is_general_doctor !== undefined ? (is_general_doctor ? 1 : 0) : null,
      license_number || null,
      qualifications || null,
      experience_years ? Number(experience_years) : null,
      bio || null,
      room_number || null,
      consultation_fee ? Number(consultation_fee) : null,
      consultation_duration ? Number(consultation_duration) : null,
      buffer_duration !== undefined && buffer_duration !== null ? Number(buffer_duration) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      docId
    );

    // Update schedules if provided
    if (Array.isArray(schedules)) {
      db.prepare('DELETE FROM doctor_schedules WHERE doctor_id = ?').run(docId);
      const insertSchedule = db.prepare(`
        INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);
      for (const s of schedules) {
        insertSchedule.run(docId, s.day_of_week, s.start_time, s.end_time);
      }
    }

    res.json({ message: 'Doctor details updated successfully.' });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ error: 'Failed to update doctor profile.' });
  }
});

// 5. Toggle Doctor Active / Inactive Status
adminRouter.patch('/doctors/:id/toggle-status', (req, res) => {
  try {
    const docId = Number(req.params.id);
    const doc = db.prepare('SELECT is_active FROM doctors WHERE id = ?').get(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const newStatus = doc.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE doctors SET is_active = ? WHERE id = ?').run(newStatus, docId);

    res.json({
      message: `Doctor status updated to ${newStatus === 1 ? 'Active' : 'Inactive'}.`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Failed to toggle doctor status.' });
  }
});

// 6. Capacity & 40-Minute Cycle Inspector
adminRouter.get('/capacity-inspector', (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ error: 'Doctor ID and date (YYYY-MM-DD) are required.' });
    }

    const calculation = calculateDoctorSlotsForDate(Number(doctor_id), String(date));
    res.json({ calculation });
  } catch (error) {
    console.error('Capacity inspector error:', error);
    res.status(500).json({ error: 'Failed to inspect capacity.' });
  }
});

// 7. Get All Patients in Clinic Database
adminRouter.get('/patients', (req, res) => {
  try {
    const clinicId = getAdminClinicId(req.user);

    let query = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.patient_id,
        u.gender,
        u.dob,
        u.created_at,
        COUNT(a.id) as total_appointments,
        MAX(a.appointment_date) as last_visit_date
      FROM users u
      LEFT JOIN appointments a ON u.id = a.patient_id
      WHERE u.role = 'patient'
    `;

    const params = [];
    if (clinicId) {
      query += ' AND (a.clinic_id = ? OR a.clinic_id IS NULL)';
      params.push(clinicId);
    }
    query += ' GROUP BY u.id ORDER BY u.full_name ASC';

    const patients = db.prepare(query).all(...params);
    res.json({ patients });
  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients list.' });
  }
});
