import { Router } from 'express';
import { db } from '../db.js';
import { calculateDoctorSlotsForDate } from '../scheduler.js';
import { authenticateToken, requireRole } from '../auth.js';

export const doctorsRouter = Router();

// 1. Get Doctor's Own Clinical & Scheduling Settings (Authenticated Doctor)
doctorsRouter.get('/me/settings', authenticateToken, requireRole('doctor'), (req, res) => {
  try {
    const doctor = db.prepare(`
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
      WHERE d.user_id = ?
    `).get(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const schedules = db.prepare(`
      SELECT day_of_week, start_time, end_time, is_active
      FROM doctor_schedules
      WHERE doctor_id = ?
      ORDER BY day_of_week ASC
    `).all(doctor.id);

    res.json({
      doctor: {
        ...doctor,
        schedules
      }
    });
  } catch (error) {
    console.error('Fetch doctor settings error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor settings.' });
  }
});

// 2. Update Doctor's Own Consultation Duration, Buffer, and Schedule
doctorsRouter.patch('/me/settings', authenticateToken, requireRole('doctor'), (req, res) => {
  try {
    const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const docId = doctor.id;
    const {
      consultation_duration,
      buffer_duration,
      consultation_fee,
      room_number,
      bio,
      qualifications,
      schedules
    } = req.body;

    const validatedConsultDuration = consultation_duration ? Math.max(10, Math.min(180, Number(consultation_duration))) : null;
    const validatedBufferDuration = buffer_duration !== undefined && buffer_duration !== null ? Math.max(0, Math.min(60, Number(buffer_duration))) : null;

    db.prepare(`
      UPDATE doctors
      SET consultation_duration = COALESCE(?, consultation_duration),
          buffer_duration = COALESCE(?, buffer_duration),
          consultation_fee = COALESCE(?, consultation_fee),
          room_number = COALESCE(?, room_number),
          bio = COALESCE(?, bio),
          qualifications = COALESCE(?, qualifications)
      WHERE id = ?
    `).run(
      validatedConsultDuration,
      validatedBufferDuration,
      consultation_fee !== undefined ? Number(consultation_fee) : null,
      room_number ? String(room_number).trim() : null,
      bio !== undefined ? String(bio).trim() : null,
      qualifications !== undefined ? String(qualifications).trim() : null,
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
        if (s.day_of_week !== undefined && s.start_time && s.end_time) {
          insertSchedule.run(docId, Number(s.day_of_week), String(s.start_time), String(s.end_time));
        }
      }
    }

    // Fetch updated
    const updatedDoc = db.prepare(`
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
      WHERE d.id = ?
    `).get(docId);

    const updatedSchedules = db.prepare(`
      SELECT day_of_week, start_time, end_time, is_active
      FROM doctor_schedules
      WHERE doctor_id = ?
      ORDER BY day_of_week ASC
    `).all(docId);

    res.json({
      message: 'Consultation and schedule settings updated successfully.',
      doctor: {
        ...updatedDoc,
        schedules: updatedSchedules
      }
    });
  } catch (error) {
    console.error('Update doctor settings error:', error);
    res.status(500).json({ error: 'Failed to update consultation settings.' });
  }
});

// 3. Get All Specialties (Placed BEFORE /:id to prevent route shadowing)
doctorsRouter.get('/specialties/all', (req, res) => {
  try {
    const specialties = db.prepare(`
      SELECT
        s.*,
        COUNT(d.id) as doctor_count
      FROM specialties s
      LEFT JOIN doctors d ON s.id = d.specialty_id AND d.is_active = 1
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();

    res.json({ specialties });
  } catch (error) {
    console.error('Fetch specialties error:', error);
    res.status(500).json({ error: 'Failed to fetch medical specialties.' });
  }
});

doctorsRouter.get('/specialties', (req, res) => {
  try {
    const specialties = db.prepare(`
      SELECT
        s.*,
        COUNT(d.id) as doctor_count
      FROM specialties s
      LEFT JOIN doctors d ON s.id = d.specialty_id AND d.is_active = 1
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();

    res.json({ specialties });
  } catch (error) {
    console.error('Fetch specialties error:', error);
    res.status(500).json({ error: 'Failed to fetch medical specialties.' });
  }
});

// 4. Get All Clinics / Hospitals
doctorsRouter.get('/clinics/all', (req, res) => {
  try {
    const clinics = db.prepare(`
      SELECT
        c.*,
        COUNT(d.id) as doctor_count
      FROM clinics c
      LEFT JOIN doctors d ON c.id = d.clinic_id AND d.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ clinics });
  } catch (error) {
    console.error('Fetch clinics error:', error);
    res.status(500).json({ error: 'Failed to fetch healthcare facilities.' });
  }
});

doctorsRouter.get('/clinics', (req, res) => {
  try {
    const clinics = db.prepare(`
      SELECT
        c.*,
        COUNT(d.id) as doctor_count
      FROM clinics c
      LEFT JOIN doctors d ON c.id = d.clinic_id AND d.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ clinics });
  } catch (error) {
    console.error('Fetch clinics error:', error);
    res.status(500).json({ error: 'Failed to fetch healthcare facilities.' });
  }
});

// 5. Get List of Doctors with Rich Search & Filters
doctorsRouter.get('/', (req, res) => {
  try {
    const { search, specialty_id, clinic_id, is_general, city, date } = req.query;

    let query = `
      SELECT
        d.id,
        d.user_id,
        d.clinic_id,
        d.specialty_id,
        d.is_general_doctor,
        d.license_number,
        d.qualifications,
        d.experience_years,
        d.bio,
        d.room_number,
        d.consultation_fee,
        d.consultation_duration,
        d.buffer_duration,
        d.is_active,
        d.is_seed_data,
        u.full_name as name,
        u.email,
        u.phone,
        s.name as specialty_name,
        s.code as specialty_code,
        s.icon_name as specialty_icon,
        c.name as clinic_name,
        c.type as clinic_type,
        c.city as clinic_city,
        c.state as clinic_state,
        c.address as clinic_address,
        c.is_seed_data as clinic_is_seed
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON d.clinic_id = c.id
      WHERE d.is_active = 1
    `;

    const params = [];

    if (search) {
      query += ` AND (
        u.full_name LIKE ? OR
        s.name LIKE ? OR
        c.name LIKE ? OR
        c.city LIKE ? OR
        d.qualifications LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (specialty_id) {
      query += ` AND d.specialty_id = ?`;
      params.push(Number(specialty_id));
    }

    if (clinic_id) {
      query += ` AND d.clinic_id = ?`;
      params.push(Number(clinic_id));
    }

    if (is_general !== undefined && is_general !== '') {
      query += ` AND d.is_general_doctor = ?`;
      params.push(is_general === 'true' || is_general === '1' ? 1 : 0);
    }

    if (city) {
      query += ` AND c.city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY d.is_general_doctor DESC, u.full_name ASC`;

    const doctors = db.prepare(query).all(...params);

    // Attach schedules and additional specialties to each doctor
    const scheduleStmt = db.prepare(`
      SELECT day_of_week, start_time, end_time
      FROM doctor_schedules
      WHERE doctor_id = ? AND is_active = 1
      ORDER BY day_of_week ASC
    `);

    const addSpecStmt = db.prepare(`
      SELECT s.id, s.name, s.code
      FROM doctor_specialties ds
      JOIN specialties s ON ds.specialty_id = s.id
      WHERE ds.doctor_id = ?
    `);

    let filteredDoctors = doctors.map((doc) => {
      const schedules = scheduleStmt.all(doc.id);
      const additionalSpecialties = addSpecStmt.all(doc.id);
      return {
        ...doc,
        schedules,
        additional_specialties: additionalSpecialties
      };
    });

    // If a specific date filter was provided, only keep doctors working on that day and not on leave
    if (date) {
      const [year, month, day] = String(date).split('-').map(Number);
      const targetDayOfWeek = new Date(year, month - 1, day).getDay();

      filteredDoctors = filteredDoctors.filter((doc) => {
        // Check if doctor has schedule on this day of week
        const worksOnDay = doc.schedules.some((s) => s.day_of_week === targetDayOfWeek);
        if (!worksOnDay) return false;

        // Check if on leave
        const exception = db.prepare(`
          SELECT is_available FROM schedule_exceptions
          WHERE doctor_id = ? AND exception_date = ?
        `).get(doc.id, date);

        if (exception && exception.is_available === 0) {
          return false;
        }

        return true;
      });
    }

    res.json({ doctors: filteredDoctors });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors registry.' });
  }
});

// 6. Get Real-Time Dynamic Cycles & Availability for Doctor on Date
doctorsRouter.get('/:id/slots', (req, res) => {
  try {
    const docId = Number(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid doctor ID.' });
    }

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
    }

    const calculation = calculateDoctorSlotsForDate(docId, String(date));

    if (!calculation) {
      return res.json({
        available: false,
        message: 'Doctor is not scheduled on this day of the week.',
        calculation: null
      });
    }

    if (calculation.is_on_leave) {
      return res.json({
        available: false,
        is_on_leave: true,
        message: calculation.leave_reason || 'Doctor is on scheduled leave on this date.',
        calculation
      });
    }

    res.json({
      available: true,
      calculation
    });
  } catch (error) {
    console.error('Fetch slots error:', error);
    res.status(500).json({ error: 'Failed to compute appointment cycles.' });
  }
});

// 7. Get Doctor By ID (Full Profile)
doctorsRouter.get('/:id', (req, res) => {
  try {
    const docId = Number(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid doctor ID.' });
    }

    const doc = db.prepare(`
      SELECT
        d.id,
        d.user_id,
        d.clinic_id,
        d.specialty_id,
        d.is_general_doctor,
        d.license_number,
        d.qualifications,
        d.experience_years,
        d.bio,
        d.room_number,
        d.consultation_fee,
        d.consultation_duration,
        d.buffer_duration,
        d.is_active,
        d.is_seed_data,
        u.full_name as name,
        u.email,
        u.phone,
        s.name as specialty_name,
        s.code as specialty_code,
        s.description as specialty_description,
        s.icon_name as specialty_icon,
        c.name as clinic_name,
        c.type as clinic_type,
        c.city as clinic_city,
        c.state as clinic_state,
        c.address as clinic_address,
        c.phone as clinic_phone,
        c.email as clinic_email,
        c.description as clinic_description,
        c.is_seed_data as clinic_is_seed
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN specialties s ON d.specialty_id = s.id
      JOIN clinics c ON d.clinic_id = c.id
      WHERE d.id = ?
    `).get(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const schedules = db.prepare(`
      SELECT day_of_week, start_time, end_time
      FROM doctor_schedules
      WHERE doctor_id = ? AND is_active = 1
      ORDER BY day_of_week ASC
    `).all(docId);

    const additionalSpecialties = db.prepare(`
      SELECT s.id, s.name, s.code
      FROM doctor_specialties ds
      JOIN specialties s ON ds.specialty_id = s.id
      WHERE ds.doctor_id = ?
    `).all(docId);

    res.json({
      doctor: {
        ...doc,
        schedules,
        additional_specialties: additionalSpecialties
      }
    });
  } catch (error) {
    console.error('Fetch doctor details error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor profile.' });
  }
});

