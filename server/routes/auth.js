import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateToken, generatePatientId } from '../auth.js';

export const authRouter = Router();

// 1. Patient Registration
authRouter.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone, dob, gender } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const patientId = generatePatientId();

    const insertUser = db.prepare(`
      INSERT INTO users (email, password, full_name, phone, role, patient_id, gender, dob)
      VALUES (?, ?, ?, ?, 'patient', ?, ?, ?)
    `);

    const result = insertUser.run(
      email.toLowerCase().trim(),
      hashedPassword,
      full_name.trim(),
      phone ? phone.trim() : null,
      patientId,
      gender || 'Other',
      dob || null
    );

    const user = {
      id: result.lastInsertRowid,
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      role: 'patient',
      patient_id: patientId,
      gender: gender || 'Other',
      dob: dob || null
    };

    const token = generateToken(user);

    res.status(201).json({
      message: 'Patient registered successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during patient registration.' });
  }
});

// 2. Hospital / Clinic Registration ("Register Your Hospital / Clinic")
authRouter.post('/register-clinic', async (req, res) => {
  try {
    const {
      facility_name,
      facility_type,
      state,
      city,
      address,
      phone,
      email,
      description,
      admin_name,
      admin_email,
      password
    } = req.body;

    if (!facility_name || !address || !admin_name || !admin_email || !password) {
      return res.status(400).json({
        error: 'Facility name, address, administrator name, email, and password are required.'
      });
    }

    // Check if admin email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(admin_email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'An administrator account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertAdmin = db.prepare(`
      INSERT INTO users (email, password, full_name, phone, role, patient_id, gender, dob)
      VALUES (?, ?, ?, ?, 'admin', null, 'Other', null)
    `);

    const userRes = insertAdmin.run(
      admin_email.toLowerCase().trim(),
      hashedPassword,
      admin_name.trim(),
      phone ? phone.trim() : null
    );

    const adminUserId = userRes.lastInsertRowid;

    const insertClinic = db.prepare(`
      INSERT INTO clinics (name, type, state, city, address, phone, email, description, is_verified, admin_id, is_seed_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
    `);

    const clinicRes = insertClinic.run(
      facility_name.trim(),
      facility_type || 'General Hospital',
      state || 'Kaduna',
      city || 'Kaduna',
      address.trim(),
      phone ? phone.trim() : null,
      email ? email.toLowerCase().trim() : admin_email.toLowerCase().trim(),
      description ? description.trim() : `Registered healthcare facility: ${facility_name.trim()}`,
      adminUserId
    );

    const clinicId = clinicRes.lastInsertRowid;

    const user = {
      id: adminUserId,
      email: admin_email.toLowerCase().trim(),
      full_name: admin_name.trim(),
      phone: phone ? phone.trim() : null,
      role: 'admin',
      patient_id: null,
      gender: 'Other',
      dob: null,
      clinic: {
        id: clinicId,
        name: facility_name.trim(),
        type: facility_type || 'General Hospital',
        city: city || 'Kaduna',
        state: state || 'Kaduna'
      }
    };

    const token = generateToken(user);

    res.status(201).json({
      message: 'Hospital/Clinic registered successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Clinic registration error:', error);
    res.status(500).json({ error: 'Internal server error during clinic registration.' });
  }
});

// 3. User Login (Patient, Doctor, Admin)
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRecord = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      phone: userRecord.phone,
      role: userRecord.role,
      patient_id: userRecord.patient_id,
      gender: userRecord.gender,
      dob: userRecord.dob
    };

    // If doctor, load doctor profile
    if (user.role === 'doctor') {
      const doctorRecord = db.prepare(`
        SELECT d.*, c.name as clinic_name, s.name as specialty_name
        FROM doctors d
        JOIN clinics c ON d.clinic_id = c.id
        JOIN specialties s ON d.specialty_id = s.id
        WHERE d.user_id = ?
      `).get(user.id);

      if (doctorRecord) {
        user.doctor = doctorRecord;
      }
    }

    // If admin, load administered clinic if exists
    if (user.role === 'admin') {
      const clinicRecord = db.prepare(`
        SELECT * FROM clinics WHERE admin_id = ?
      `).get(user.id);

      if (clinicRecord) {
        user.clinic = clinicRecord;
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 4. Get Current Authenticated Session
authRouter.get('/me', authenticateToken, (req, res) => {
  try {
    const user = { ...req.user };

    if (user.role === 'doctor') {
      const doctorRecord = db.prepare(`
        SELECT d.*, c.name as clinic_name, s.name as specialty_name
        FROM doctors d
        JOIN clinics c ON d.clinic_id = c.id
        JOIN specialties s ON d.specialty_id = s.id
        WHERE d.user_id = ?
      `).get(user.id);

      if (doctorRecord) {
        user.doctor = doctorRecord;
      }
    }

    if (user.role === 'admin') {
      const clinicRecord = db.prepare(`
        SELECT * FROM clinics WHERE admin_id = ?
      `).get(user.id);

      if (clinicRecord) {
        user.clinic = clinicRecord;
      }
    }

    res.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to retrieve current user session.' });
  }
});

// 5. Update Profile
authRouter.patch('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone, gender, dob } = req.body;

    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          gender = COALESCE(?, gender),
          dob = COALESCE(?, dob)
      WHERE id = ?
    `).run(full_name || null, phone || null, gender || null, dob || null, req.user.id);

    const updatedUser = db.prepare('SELECT id, email, full_name, phone, role, patient_id, gender, dob FROM users WHERE id = ?').get(req.user.id);

    res.json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});
