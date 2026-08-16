import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'medisched.sqlite');

function createDatabaseInstance() {
  try {
    const instance = new Database(dbPath);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    return instance;
  } catch (err) {
    console.error('[DB] SQLite file corrupted or failed to initialize, recreating fresh database:', err?.message || err);
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    } catch (cleanErr) {
      console.error('[DB] Error cleaning corrupted database files:', cleanErr);
    }
    const instance = new Database(dbPath);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    return instance;
  }
}

export const db = createDatabaseInstance();

export function initDatabase() {
  // Check if existing tables have outdated schema or missing PHC clinics
  try {
    const docCols = db.prepare("PRAGMA table_info(doctors)").all().map(c => c.name);
    if (docCols.length > 0) {
      if (!docCols.includes('consultation_duration')) {
        db.exec("ALTER TABLE doctors ADD COLUMN consultation_duration INTEGER DEFAULT 30;");
      }
      if (!docCols.includes('buffer_duration')) {
        db.exec("ALTER TABLE doctors ADD COLUMN buffer_duration INTEGER DEFAULT 10;");
      }
    }
    const phcCount = db.prepare("SELECT COUNT(*) as c FROM clinics WHERE type LIKE '%Primary%'").get()?.c || 0;
    if (docCols.length > 0 && (!docCols.includes('is_active') || !docCols.includes('license_number') || !docCols.includes('consultation_fee') || phcCount === 0)) {
      console.log('[DB] Upgrading schema & enriching dataset with Kaduna Primary Healthcare Centres...');
      db.exec(`
        DROP TABLE IF EXISTS appointments;
        DROP TABLE IF EXISTS schedule_exceptions;
        DROP TABLE IF EXISTS doctor_schedules;
        DROP TABLE IF EXISTS doctor_specialties;
        DROP TABLE IF EXISTS doctors;
        DROP TABLE IF EXISTS specialties;
        DROP TABLE IF EXISTS clinics;
        DROP TABLE IF EXISTS users;
      `);
    }
  } catch (e) {
    // Ignore if tables don't exist yet
  }

  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT CHECK(role IN ('patient', 'doctor', 'admin')) NOT NULL DEFAULT 'patient',
      patient_id TEXT UNIQUE,
      gender TEXT,
      dob TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Clinics / Hospitals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'General Hospital',
      state TEXT NOT NULL DEFAULT 'Kaduna',
      city TEXT NOT NULL DEFAULT 'Kaduna',
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      description TEXT,
      is_verified INTEGER DEFAULT 1,
      admin_id INTEGER DEFAULT 0,
      is_seed_data INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Specialties table
  db.exec(`
    CREATE TABLE IF NOT EXISTS specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      icon_name TEXT DEFAULT 'Activity'
    );
  `);

  // 4. Doctors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      clinic_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      is_general_doctor INTEGER DEFAULT 0,
      license_number TEXT,
      qualifications TEXT,
      experience_years INTEGER DEFAULT 5,
      bio TEXT,
      room_number TEXT,
      consultation_fee REAL DEFAULT 5000.0,
      consultation_duration INTEGER DEFAULT 30,
      buffer_duration INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      is_seed_data INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id)
    );
  `);

  // 5. Doctor Additional Specialties
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, specialty_id)
    );
  `);

  // 6. Doctor Schedules
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
      start_time TEXT NOT NULL,      -- "HH:MM"
      end_time TEXT NOT NULL,        -- "HH:MM"
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, day_of_week)
    );
  `);

  // 7. Schedule Exceptions
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      exception_date TEXT NOT NULL, -- "YYYY-MM-DD"
      reason TEXT NOT NULL,
      is_available INTEGER DEFAULT 0,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
  `);

  // 8. Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_code TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      clinic_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,   -- "YYYY-MM-DD"
      start_time TEXT NOT NULL,         -- "HH:MM"
      end_time TEXT NOT NULL,           -- "HH:MM" (30 min consultation)
      interval_end_time TEXT NOT NULL,  -- "HH:MM" (40 min cycle end)
      status TEXT CHECK(status IN ('Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'Rescheduled', 'No Show')) DEFAULT 'Confirmed',
      reason TEXT,
      symptoms TEXT,
      consultation_notes TEXT,
      prescription TEXT,
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already initialized
  }

  console.log('[DB] Seeding database with Kaduna hospitals, PHCs, specialties, doctors, and users...');

  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  // 1. Seed Specialties
  const specialties = [
    { name: 'General Medicine', code: 'GEN', description: 'Primary healthcare, fever triage, routine health checkups, and chronic disease management', icon_name: 'Stethoscope' },
    { name: 'Cardiology', code: 'CARD', description: 'Heart diseases, hypertension management, cardiovascular health, and ECG evaluation', icon_name: 'HeartPulse' },
    { name: 'Paediatrics', code: 'PAED', description: 'Infant, child, and adolescent healthcare, immunisation, and developmental monitoring', icon_name: 'Baby' },
    { name: 'Obstetrics & Gynaecology', code: 'OBGYN', description: 'Women health, prenatal antenatal care, maternity, and reproductive medicine', icon_name: 'Activity' },
    { name: 'Ophthalmology', code: 'OPHTH', description: 'Eye exams, cataracts, glaucoma screening, visual acuity, and laser treatments', icon_name: 'Eye' },
    { name: 'Orthopaedics', code: 'ORTHO', description: 'Bones, joints, fractures, spinal health, and musculoskeletal rehabilitation', icon_name: 'Bone' },
    { name: 'Neurology', code: 'NEURO', description: 'Brain, stroke recovery, nervous system disorders, migraines, and epilepsy care', icon_name: 'Brain' },
    { name: 'Dermatology', code: 'DERM', description: 'Skin conditions, rashes, allergic reactions, eczema, and dermatological procedures', icon_name: 'Sparkles' },
    { name: 'Internal Medicine', code: 'INTMED', description: 'Complex adult multisystem diseases, diabetes care, and metabolic health', icon_name: 'Stethoscope' },
    { name: 'ENT (Otolaryngology)', code: 'ENT', description: 'Ear, nose, throat, sinusitis, hearing loss, and vocal chord assessments', icon_name: 'Headphones' },
    { name: 'Urology', code: 'UROL', description: 'Urinary tract health, kidneys, bladder, and male reproductive health', icon_name: 'Shield' },
    { name: 'Dentistry', code: 'DENT', description: 'Oral hygiene, dental fillings, root canals, and orthodontic consultations', icon_name: 'Smile' },
    { name: 'Psychiatry & Mental Health', code: 'PSYCH', description: 'Clinical psychology, stress, depression, anxiety, and behavioral therapy', icon_name: 'Smile' }
  ];

  const insertSpec = db.prepare('INSERT INTO specialties (name, code, description, icon_name) VALUES (?, ?, ?, ?)');
  const specMap = {};
  for (const s of specialties) {
    const info = insertSpec.run(s.name, s.code, s.description, s.icon_name);
    specMap[s.code] = info.lastInsertRowid;
  }

  // 2. Seed Kaduna Healthcare Facilities (Teaching, Specialist, General, Military, and Primary Healthcare Centres)
  const clinics = [
    {
      name: 'Barau Dikko Teaching Hospital',
      type: 'Teaching Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Lafiya Road, Off Independence Way, Kaduna Central, Kaduna',
      phone: '+234 803 111 2233',
      email: 'bdth.kaduna@example.com',
      description: 'Major tertiary teaching hospital of Kaduna State University providing specialist care, cardiology, emergency, and surgical suites.',
      is_seed_data: 0
    },
    {
      name: '44 Nigerian Army Reference Hospital',
      type: 'Military / Reference Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Independence Way, Old NDA Ground, Kaduna',
      phone: '+234 802 222 3344',
      email: 'narh44.kaduna@example.com',
      description: 'Premier military reference hospital in Northern Nigeria equipped for major trauma, orthopaedics, urology, and intensive clinical care.',
      is_seed_data: 0
    },
    {
      name: 'Yusuf Dantsoho Memorial Hospital',
      type: 'General Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Poly Road, Tudun Wada, Kaduna South, Kaduna',
      phone: '+234 803 333 4455',
      email: 'ydmh.tudunwada@example.com',
      description: 'High-volume urban general hospital serving Tudun Wada and Kaduna metropolis with round-the-clock maternity, paediatric, and general clinics.',
      is_seed_data: 0
    },
    {
      name: 'Dialogue Hospital',
      type: 'Specialist Private Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Gwiwa Close, Off Alkali Road, Marafa Estate, Kaduna',
      phone: '+234 803 444 5566',
      email: 'dialogue.hospital@example.com',
      description: 'Renowned modern private specialist centre known for dermatology, minimally invasive surgery, obstetrics, and cardiology diagnostics.',
      is_seed_data: 0
    },
    {
      name: 'Ahmadu Bello University Teaching Hospital (ABUTH)',
      type: 'Teaching Hospital',
      state: 'Kaduna',
      city: 'Zaria',
      address: 'Shika, Off Zaria-Sokoto Highway, Zaria, Kaduna State',
      phone: '+234 805 555 6677',
      email: 'abuth.shika@example.com',
      description: 'One of West Africa largest tertiary medical institutions, with comprehensive specialist departments, oncology, and advanced paediatrics.',
      is_seed_data: 0
    },
    {
      name: 'Garkuwa Specialist Hospital',
      type: 'Specialist Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: '8 Sultan Road, Ungwan Rimi, Kaduna North, Kaduna',
      phone: '+234 803 666 7788',
      email: 'garkuwa.hospital@example.com',
      description: 'Well-established private specialist healthcare facility offering state-of-the-art diagnostics, internal medicine, and executive health screenings.',
      is_seed_data: 0
    },
    {
      name: 'National Eye Centre',
      type: 'Specialist Centre',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Off Nnamdi Azikiwe Expressway, Mando, Kaduna',
      phone: '+234 802 777 8899',
      email: 'nationaleyecentre.kaduna@example.com',
      description: 'Apex federal ophthalmological specialist hospital in Nigeria for advanced retinal surgeries, cornea grafts, and optical care.',
      is_seed_data: 0
    },
    {
      name: 'St. Gerard Catholic Hospital',
      type: 'Mission Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Sardauna Crescent, Kakuri, Kaduna South, Kaduna',
      phone: '+234 803 888 9900',
      email: 'stgerards.kakuri@example.com',
      description: 'Historic mission hospital renowned for compassionate surgical care, dentistry, orthopaedics, and community maternity outreach.',
      is_seed_data: 0
    },
    {
      name: 'Kaduna State Specialist Hospital',
      type: 'Specialist Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Millennium City, Eastern Bypass, Kaduna',
      phone: '+234 802 999 0011',
      email: 'kssh.millennium@example.com',
      description: 'Modern flagship tertiary health facility designed for advanced neuroscience, cardiology, psychiatry, and kidney care.',
      is_seed_data: 0
    },
    {
      name: 'Turai YarAdua Maternal and Child Hospital',
      type: 'Specialist Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Rigasa Railway Station Road, Rigasa, Kaduna',
      phone: '+234 803 123 4567',
      email: 'turai.rigasa@example.com',
      description: 'Dedicated maternal, neonatal, and paediatric hospital offering specialized neonatal ICU and high-risk pregnancy care.',
      is_seed_data: 0
    },
    {
      name: 'Giwa Hospital',
      type: 'Private Specialist Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Swimming Pool Road, Police College Roundabout, Kaduna North, Kaduna',
      phone: '+234 803 234 5678',
      email: 'giwa.hospital@example.com',
      description: 'Central Kaduna private hospital specializing in trauma, obstetrics, internal medicine, and corporate health retainerships.',
      is_seed_data: 0
    },
    {
      name: 'Harmony Hospital',
      type: 'Private Hospital',
      state: 'Kaduna',
      city: 'Kaduna',
      address: 'Barnawa Shopping Complex Road, Barnawa, Kaduna South, Kaduna',
      phone: '+234 803 345 6789',
      email: 'harmony.barnawa@example.com',
      description: 'Family and community wellness centre providing general medical consultations, ultrasound diagnostics, and routine health checks.',
      is_seed_data: 0
    },
    // PRIMARY HEALTHCARE CENTRES (PHCs)
    {
      name: 'Primary Healthcare Centre (PHC) Badiko',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Kaduna South',
      address: 'Badiko New Layout, Near Central Mosque, Kaduna South, Kaduna',
      phone: '+234 803 555 1101',
      email: 'phc.badiko@kadphcda.gov.ng',
      description: 'Community primary healthcare centre delivering routine immunisation, antenatal services, outpatient malaria/fever triage, and family health consults.',
      is_seed_data: 0
    },
    {
      name: 'Primary Healthcare Centre (PHC) Kawo',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Kaduna North',
      address: 'Kawo District Head Road, Kawo, Kaduna North, Kaduna',
      phone: '+234 803 555 1102',
      email: 'phc.kawo@kadphcda.gov.ng',
      description: 'Accredited primary healthcare facility providing maternal child health, routine growth monitoring, primary outpatient care, and rapid diagnostic testing.',
      is_seed_data: 0
    },
    {
      name: 'Primary Healthcare Centre (PHC) Ungwan Rimi',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Kaduna North',
      address: 'Kanta Road by Ungwan Rimi Market, Kaduna North, Kaduna',
      phone: '+234 803 555 1103',
      email: 'phc.ungwanrimi@kadphcda.gov.ng',
      description: 'Community health post providing walk-in and booked consultations for non-communicable disease screening, hypertension checks, and maternal care.',
      is_seed_data: 0
    },
    {
      name: 'Primary Healthcare Centre (PHC) Sabon Tasha',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Chikun LGA',
      address: 'Kachia Expressway, Sabon Tasha, Chikun, Kaduna',
      phone: '+234 803 555 1104',
      email: 'phc.sabontasha@kadphcda.gov.ng',
      description: 'High-density community primary clinic offering primary pediatric care, prenatal clinics, nutritional support, and doctor outpatient consultations.',
      is_seed_data: 0
    },
    {
      name: 'Comprehensive Health Centre (CHC) Rigasa',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Igabi LGA',
      address: 'Danmani Road, Rigasa Community, Igabi, Kaduna',
      phone: '+234 803 555 1105',
      email: 'chc.rigasa@kadphcda.gov.ng',
      description: 'Comprehensive 24/7 primary healthcare and maternity centre serving the Rigasa metropolis with dedicated medical officers and delivery suites.',
      is_seed_data: 0
    },
    {
      name: 'Primary Healthcare Centre (PHC) Samaru',
      type: 'Primary Healthcare Centre (PHC)',
      state: 'Kaduna',
      city: 'Zaria',
      address: 'Main Market Road, Samaru, Zaria, Kaduna State',
      phone: '+234 803 555 1106',
      email: 'phc.samaru@kadphcda.gov.ng',
      description: 'Urban primary health centre in Zaria delivering primary student and family consultations, wellness checkups, and routine preventive medicine.',
      is_seed_data: 0
    }
  ];

  const insertClinic = db.prepare(`
    INSERT INTO clinics (name, type, state, city, address, phone, email, description, is_verified, is_seed_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
  `);

  const clinicIds = [];
  for (const c of clinics) {
    const res = insertClinic.run(c.name, c.type, c.state, c.city, c.address, c.phone, c.email, c.description);
    clinicIds.push(res.lastInsertRowid);
  }

  // 3. Seed Users (Admin, Demo Patients, and Doctors)
  const insertUser = db.prepare(`
    INSERT INTO users (email, password, full_name, phone, role, patient_id, gender, dob)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin for Barau Dikko / MediSched
  insertUser.run('admin@medisched.ng', adminHash, 'Hajia Zainab Umar (Operations Lead)', '+234 803 000 1122', 'admin', null, 'Female', '1984-05-12');
  
  // Seed Patients
  insertUser.run('patient.demo@medisched.ng', passwordHash, 'Amaka Okonkwo', '+234 803 987 6543', 'patient', 'PAT-2026-000001', 'Female', '1995-09-18');
  insertUser.run('musa.bello@example.com', passwordHash, 'Musa Bello', '+234 802 345 6789', 'patient', 'PAT-2026-000002', 'Male', '1990-03-24');

  // Seed Doctors across Teaching Hospitals, Specialists, General Hospitals, and Primary Healthcare Centres
  const doctorSeeds = [
    {
      name: 'Dr. Amina Yusuf',
      email: 'dr.amina.yusuf@medisched.ng',
      phone: '+234 803 101 2001',
      clinicIndex: 0, // Barau Dikko Teaching Hospital
      specialtyCode: 'CARD',
      isGeneral: 0,
      license: 'MDCN-KAD-2012-4481',
      qualifications: 'MBBS (ABU), FWACP (Cardiology), MSc Clinical Cardiology',
      exp: 14,
      bio: 'Senior Consultant Cardiologist specializing in adult cardiovascular disease, hypertension management, preventive cardiac health, and echocardiography interpretation.',
      room: 'Room 204 (Cardiology Wing)',
      fee: 8500.0,
      days: [1, 2, 3, 4], // Mon-Thu
      start: '09:00',
      end: '13:00' // 240 mins -> 6 cycles (5 bookable + 1 reserved)
    },
    {
      name: 'Dr. Ibrahim Sule',
      email: 'dr.ibrahim.sule@medisched.ng',
      phone: '+234 803 101 2002',
      clinicIndex: 0, // Barau Dikko Teaching Hospital
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2016-8912',
      qualifications: 'MBBS (UDUS), FMCGP (Family Medicine)',
      exp: 9,
      bio: 'Chief Medical Officer in General Practice focused on acute illness, fever triage, diabetes monitoring, routine wellness checkups, and preventive medicine.',
      room: 'Consulting Room 12',
      fee: 4000.0,
      days: [1, 2, 3, 4, 5],
      start: '08:00',
      end: '12:00' // 240 mins -> 6 cycles (5 bookable + 1 reserved)
    },
    {
      name: 'Dr. Maryam Abdullahi',
      email: 'dr.maryam.abdullahi@medisched.ng',
      phone: '+234 803 101 2003',
      clinicIndex: 4, // ABUTH Zaria
      specialtyCode: 'PAED',
      isGeneral: 0,
      license: 'MDCN-ZAR-2014-6721',
      qualifications: 'MBBS (ABU), FMCPaed, Fellowship in Neonatal Care',
      exp: 11,
      bio: 'Consultant Paediatrician with extensive experience in child infectious diseases, infant nutrition, developmental monitoring, and asthma care.',
      room: 'Paediatric Complex Room 4',
      fee: 7500.0,
      days: [1, 2, 4, 5],
      start: '09:00',
      end: '14:20' // 320 mins -> 8 cycles (7 bookable + 1 reserved)
    },
    {
      name: 'Dr. Daniel Okafor',
      email: 'dr.daniel.okafor@medisched.ng',
      phone: '+234 803 101 2004',
      clinicIndex: 1, // 44 Nigerian Army Reference Hospital
      specialtyCode: 'ORTHO',
      isGeneral: 0,
      license: 'MDCN-KAD-2010-3320',
      qualifications: 'MBBS (UNN), FWACS (Orthopaedics), Fellow Arthroplasty',
      exp: 16,
      bio: 'Lead Orthopaedic and Trauma Surgeon focusing on joint reconstruction, sports injuries, fracture management, and musculoskeletal trauma.',
      room: 'Orthopaedic Suite B',
      fee: 10000.0,
      days: [1, 3, 5],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Fatima Musa',
      email: 'dr.fatima.musa@medisched.ng',
      phone: '+234 803 101 2005',
      clinicIndex: 3, // Dialogue Hospital
      specialtyCode: 'DERM',
      isGeneral: 0,
      license: 'MDCN-KAD-2015-7729',
      qualifications: 'MBBS (Bayero), FWACP (Dermatology)',
      exp: 10,
      bio: 'Consultant Dermatologist treating complex skin conditions, eczema, psoriasis, allergic reactions, and medical dermatological procedures.',
      room: 'Dermatology Suite 2',
      fee: 7000.0,
      days: [1, 2, 3, 5],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Samuel Bello',
      email: 'dr.samuel.bello@medisched.ng',
      phone: '+234 803 101 2006',
      clinicIndex: 2, // Yusuf Dantsoho Memorial Hospital
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2017-5510',
      qualifications: 'MBBS (Ilorin), Primary Family Medicine',
      exp: 8,
      bio: 'General Practitioner dedicated to primary healthcare delivery, hypertension screening, acute fever treatments, and preventive physicals.',
      room: 'Outpatient Clinic 3',
      fee: 3500.0,
      days: [1, 2, 3, 4, 5],
      start: '08:30',
      end: '12:30'
    },
    {
      name: 'Dr. Hadiza Ibrahim',
      email: 'dr.hadiza.ibrahim@medisched.ng',
      phone: '+234 803 101 2007',
      clinicIndex: 2, // Yusuf Dantsoho Memorial Hospital
      specialtyCode: 'OBGYN',
      isGeneral: 0,
      license: 'MDCN-KAD-2013-6611',
      qualifications: 'MBBS (ABU), FWACS (Obstetrics & Gynaecology)',
      exp: 13,
      bio: 'Consultant Obstetrician & Gynaecologist providing comprehensive antenatal management, high-risk maternity care, and reproductive health counseling.',
      room: 'Maternal Wing Room 1',
      fee: 6500.0,
      days: [1, 2, 3, 4],
      start: '08:40',
      end: '12:40'
    },
    {
      name: 'Dr. Hassan Abdullahi',
      email: 'dr.hassan.abdullahi@medisched.ng',
      phone: '+234 803 101 2008',
      clinicIndex: 0, // Barau Dikko Teaching Hospital
      specialtyCode: 'NEURO',
      isGeneral: 0,
      license: 'MDCN-KAD-2009-2219',
      qualifications: 'MBBS (ABU), FMCP (Neurology), MSc Neurobiology',
      exp: 17,
      bio: 'Senior Neurologist with extensive expertise in stroke recovery, seizure disorders, neuropathy, chronic migraines, and movement disorders.',
      room: 'Neurology Unit 105',
      fee: 12000.0,
      days: [1, 3, 4],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Grace Emmanuel',
      email: 'dr.grace.emmanuel@medisched.ng',
      phone: '+234 803 101 2009',
      clinicIndex: 6, // National Eye Centre
      specialtyCode: 'OPHTH',
      isGeneral: 0,
      license: 'MDCN-KAD-2011-9102',
      qualifications: 'MBBS (Jos), FMCOphth, Glaucoma Specialist',
      exp: 15,
      bio: 'Senior Consultant Ophthalmologist focusing on comprehensive eye examinations, glaucoma diagnosis, optical health, and cataract treatment.',
      room: 'Diagnostic Eye Suite 3',
      fee: 8000.0,
      days: [1, 2, 4, 5],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Abdulrahman Sani',
      email: 'dr.abdulrahman.sani@medisched.ng',
      phone: '+234 803 101 2010',
      clinicIndex: 5, // Garkuwa Specialist Hospital
      specialtyCode: 'INTMED',
      isGeneral: 0,
      license: 'MDCN-KAD-2013-4519',
      qualifications: 'MBBS (ABU), FWACP (Internal Medicine), Endocrinology Fellow',
      exp: 12,
      bio: 'Internal Medicine and Endocrinology consultant specializing in complex diabetic conditions, thyroid disorders, and metabolic health.',
      room: 'Specialist Clinic 102',
      fee: 9000.0,
      days: [2, 3, 4, 6],
      start: '10:00',
      end: '14:00'
    },
    {
      name: 'Dr. Zainab Ahmad',
      email: 'dr.zainab.ahmad@medisched.ng',
      phone: '+234 803 101 2011',
      clinicIndex: 4, // ABUTH Zaria
      specialtyCode: 'ENT',
      isGeneral: 0,
      license: 'MDCN-ZAR-2014-4519',
      qualifications: 'MBBS (ABU), FWACS (ORL/ENT Specialist)',
      exp: 11,
      bio: 'Consultant ENT Specialist treating chronic sinusitis, hearing impairments, tonsillar infections, and vocal disorders.',
      room: 'ENT Suite 2',
      fee: 7500.0,
      days: [2, 3, 5],
      start: '08:30',
      end: '12:30'
    },
    {
      name: 'Dr. Yusuf Ibrahim',
      email: 'dr.yusuf.ibrahim@medisched.ng',
      phone: '+234 803 101 2012',
      clinicIndex: 1, // 44 Nigerian Army Reference Hospital
      specialtyCode: 'UROL',
      isGeneral: 0,
      license: 'MDCN-KAD-2010-8812',
      qualifications: 'MBBS (Maiduguri), FWACS (Urology)',
      exp: 15,
      bio: 'Consultant Urologist experienced in prostate health management, urinary tract stone disorders, and reconstructive urology.',
      room: 'Urology Consulting 5',
      fee: 9500.0,
      days: [1, 2, 4],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Halima Sani',
      email: 'dr.halima.sani@medisched.ng',
      phone: '+234 803 101 2013',
      clinicIndex: 8, // Kaduna State Specialist Hospital
      specialtyCode: 'PSYCH',
      isGeneral: 0,
      license: 'MDCN-KAD-2015-9912',
      qualifications: 'MBBS (ABU), FWACP (Psychiatry)',
      exp: 10,
      bio: 'Consultant Psychiatrist and Behavioral Health specialist focusing on stress management, anxiety, depressive disorders, and cognitive health.',
      room: 'Mental Health Suite A',
      fee: 8000.0,
      days: [1, 3, 5],
      start: '10:00',
      end: '14:00'
    },
    {
      name: 'Dr. Bashir Mohammed',
      email: 'dr.bashir.mohammed@medisched.ng',
      phone: '+234 803 101 2014',
      clinicIndex: 4, // ABUTH Zaria
      specialtyCode: 'CARD',
      isGeneral: 0,
      license: 'MDCN-ZAR-2011-3318',
      qualifications: 'MBBS (ABU), FWACP (Cardiology)',
      exp: 15,
      bio: 'Cardiologist with extensive clinical practice in cardiac pacing, heart failure management, arrhythmia evaluation, and lipid optimization.',
      room: 'Cardiology Clinic 3',
      fee: 9000.0,
      days: [1, 2, 4],
      start: '09:00',
      end: '13:00'
    },
    {
      name: 'Dr. Rukayya Bello',
      email: 'dr.rukayya.bello@medisched.ng',
      phone: '+234 803 101 2015',
      clinicIndex: 11, // Harmony Hospital Barnawa
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2018-1093',
      qualifications: 'MBBS (UNN), PG Dip Family Health',
      exp: 7,
      bio: 'Dedicated General Practitioner delivering personalized primary care, preventive physicals, malaria/typhoid treatments, and family health guidance.',
      room: 'Consulting Room 1',
      fee: 3500.0,
      days: [1, 2, 3, 4, 5],
      start: '08:30',
      end: '13:50'
    },
    {
      name: 'Dr. Almustapha Ibrahim',
      email: 'dr.almustapha.ibrahim@medisched.ng',
      phone: '+234 803 101 2016',
      clinicIndex: 8, // Kaduna State Specialist Hospital
      specialtyCode: 'NEURO',
      isGeneral: 0,
      license: 'MDCN-KAD-2012-7822',
      qualifications: 'MBBS (UDUS), FMCP (Neurology)',
      exp: 13,
      bio: 'Consultant Neurologist focusing on neurovascular health, vertigo/dizziness management, Parkinson disease care, and neurodiagnostic tests.',
      room: 'Neurosciences Clinic 4',
      fee: 11000.0,
      days: [2, 4, 5],
      start: '09:00',
      end: '13:00'
    },
    // PRIMARY HEALTHCARE CENTRE DOCTORS / MEDICAL OFFICERS
    {
      name: 'Dr. Aisha Garba',
      email: 'dr.aisha.garba@medisched.ng',
      phone: '+234 803 101 2017',
      clinicIndex: 12, // PHC Badiko
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2019-3341',
      qualifications: 'MBBS (Bayero), Primary Care & Maternal Child Health Cert',
      exp: 6,
      bio: 'Primary Healthcare Medical Officer at PHC Badiko focused on antenatal triage, malaria diagnosis, hypertension screening, and community child health.',
      room: 'PHC Doctor Consulting 1',
      fee: 2000.0,
      days: [1, 2, 3, 4, 5],
      start: '08:00',
      end: '13:20'
    },
    {
      name: 'Dr. Usman Farouk',
      email: 'dr.usman.farouk@medisched.ng',
      phone: '+234 803 101 2018',
      clinicIndex: 13, // PHC Kawo
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2018-9921',
      qualifications: 'MBBS (ABU), Community Health & Disease Surveillance',
      exp: 7,
      bio: 'Lead Medical Officer at PHC Kawo managing outpatient consultations, acute infections, preventive wellness, and routine pediatric follow-ups.',
      room: 'PHC Clinic Room 2',
      fee: 2000.0,
      days: [1, 2, 3, 4, 5],
      start: '08:30',
      end: '12:30'
    },
    {
      name: 'Dr. Victor Nnamdi',
      email: 'dr.victor.nnamdi@medisched.ng',
      phone: '+234 803 101 2019',
      clinicIndex: 15, // PHC Sabon Tasha
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2017-8819',
      qualifications: 'MBBS (UNN), Primary Care & Family Medicine',
      exp: 8,
      bio: 'Family Medicine and Primary Care practitioner serving Sabon Tasha community with comprehensive outpatient triage, wound care, and diabetic screening.',
      room: 'Outpatient Room 1',
      fee: 2500.0,
      days: [1, 2, 3, 4, 5],
      start: '08:00',
      end: '13:20'
    },
    {
      name: 'Dr. Fatima Aliyu',
      email: 'dr.fatima.aliyu@medisched.ng',
      phone: '+234 803 101 2020',
      clinicIndex: 14, // PHC Ungwan Rimi
      specialtyCode: 'GEN',
      isGeneral: 1,
      license: 'MDCN-KAD-2020-4102',
      qualifications: 'MBBS (UDUS), Primary Healthcare & Community Health',
      exp: 5,
      bio: 'Resident Primary Healthcare Physician at PHC Ungwan Rimi dedicated to maternal and infant wellness, routine health screening, and community disease prevention.',
      room: 'Primary Care Suite A',
      fee: 2000.0,
      days: [1, 2, 3, 4, 5],
      start: '08:30',
      end: '12:30'
    }
  ];

  const insertDoctor = db.prepare(`
    INSERT INTO doctors (
      user_id, clinic_id, specialty_id, is_general_doctor, license_number, qualifications,
      experience_years, bio, room_number, consultation_fee, consultation_duration, buffer_duration, is_active, is_seed_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
  `);

  const insertSchedule = db.prepare(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const doctorIds = [];
  for (const doc of doctorSeeds) {
    const userRes = insertUser.run(doc.email, passwordHash, doc.name, doc.phone, 'doctor', null, 'Male', '1985-06-15');
    const clinicId = clinicIds[doc.clinicIndex];
    const specId = specMap[doc.specialtyCode];

    const docRes = insertDoctor.run(
      userRes.lastInsertRowid,
      clinicId,
      specId,
      doc.isGeneral,
      doc.license,
      doc.qualifications,
      doc.exp,
      doc.bio,
      doc.room,
      doc.fee,
      doc.consultation_duration || 30,
      doc.buffer_duration || 10
    );

    const docId = docRes.lastInsertRowid;
    doctorIds.push(docId);

    // Insert schedules
    for (const day of doc.days) {
      insertSchedule.run(docId, day, doc.start, doc.end);
    }
  }

  // 4. Seed sample appointments (using 40-minute cycle rules)
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Next week dates
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + ((3 + 7 - today.getDay()) % 7 || 7));

  const insertApt = db.prepare(`
    INSERT INTO appointments (
      appointment_code, patient_id, doctor_id, clinic_id, appointment_date,
      start_time, end_time, interval_end_time, status, reason, symptoms, consultation_notes, prescription
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Patient 2 (Amaka Okonkwo) upcoming appointment with Dr. Amina Yusuf
  insertApt.run(
    'APT-2026-000001',
    2, // Amaka
    doctorIds[0], // Dr. Amina
    clinicIds[0], // BDTH
    formatDate(nextMonday),
    '09:00',
    '09:30',
    '09:40',
    'Confirmed',
    'Routine cardiovascular evaluation and BP monitoring',
    'Mild afternoon palpitations and elevated home BP readings (145/90)',
    null,
    null
  );

  // Patient 2 upcoming appointment with Dr. Ibrahim Sule
  insertApt.run(
    'APT-2026-000002',
    2, // Amaka
    doctorIds[1], // Dr. Ibrahim Sule
    clinicIds[0], // BDTH
    formatDate(nextWednesday),
    '08:40',
    '09:10',
    '09:20',
    'Confirmed',
    'General wellness and routine blood glucose checkup',
    'Occasional morning fatigue',
    null,
    null
  );

  // Past completed consultation for Amaka
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 14);
  insertApt.run(
    'APT-2026-000003',
    2, // Amaka
    doctorIds[1], // Dr. Ibrahim Sule
    clinicIds[0], // BDTH
    formatDate(pastDate),
    '09:20',
    '09:50',
    '10:00',
    'Completed',
    'Annual physical examination and dietary consultation',
    'General checkup',
    'Patient in good clinical standing. Blood pressure optimal at 122/80 mmHg. Advised continued moderate exercise and low-sodium diet.',
    'Tab Multivitamin 1 daily x 30 days. Tab Omega-3 1000mg daily.'
  );

  console.log('[DB] Database seeded successfully with 18 Kaduna healthcare facilities (including 6 PHCs) and 20 medical doctors.');
}
