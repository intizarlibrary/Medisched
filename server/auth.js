import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'medisched_super_secure_jwt_secret_capstone_2026';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      patient_id: user.patient_id || null
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authentication token.' });
    }

    // Verify user still exists in database
    const user = db.prepare('SELECT id, email, full_name, role, patient_id, phone, gender, dob FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  });
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

export function generatePatientId() {
  const currentYear = new Date().getFullYear();
  // Count total patient users
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'patient'
  `).get();

  const nextSeq = (result.count || 0) + 1;
  const padded = nextSeq.toString().padStart(6, '0');
  return `PAT-${currentYear}-${padded}`;
}

export function generateAppointmentCode() {
  const currentYear = new Date().getFullYear();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
  `).get();

  const nextSeq = (result.count || 0) + 1;
  const padded = nextSeq.toString().padStart(6, '0');
  return `APT-${currentYear}-${padded}`;
}
