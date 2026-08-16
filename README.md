# MediSched NG
> **Find the Right Specialist. Book the Right Time.**  
> *3MTT Software Development Capstone Project — SD-05: Clinic Appointment System*

---

## 📌 Project Overview

**MediSched NG** is a full-stack, mobile-responsive healthcare appointment discovery and scheduling platform designed specifically for Nigerian clinics, hospitals, and diagnostic centres. It eliminates long waiting room delays by connecting patients, specialists, and clinic administrators through an automated, rule-based scheduling engine.

---

## 👥 Three Core User Roles

### 1. 🏥 Patient
- **Registration & Unique ID Generation:** Auto-generates official Patient Identification codes (e.g. `PAT-2026-000184`).
- **Specialty & General Doctor Discovery:** Search by 13+ medical specialties (Cardiology, Paediatrics, Gynaecology, Dentistry, etc.) or General Doctors.
- **Smart Slot Selection:** Real-time visibility into open 40-minute consultation cycles across doctor shifts.
- **Appointment Lifecycle Management:** View upcoming/past consultations, reschedule to an open slot, or cancel appointments.
- **Digital Consultation Slip:** Instant downloadable/printable appointment confirmation slips with Nigerian clinic details and reference codes.
- **Patient Profile Management:** Update phone, gender, and date of birth for hospital health records.

### 2. 🩺 Doctor (Provisioned by Clinic)
- **Daily 40-Minute Cycle Timeline:** Visual timeline of the doctor's shift broken down into exact 40-minute cycles.
- **Reserved Capacity Awareness:** Clear visual indicator of the mandatory reserved buffer slot.
- **Clinical Workflow Actions:**
  - `Mark Checked In` when patient arrives at the clinic
  - `Start Consultation` (live timer and status update)
  - `Complete Consultation` with clinical assessment findings, treatment plan, and prescription notes
  - `Mark No Show` if patient fails to appear
- **Consultation Registry & Shift Viewer:** Comprehensive record of past patient notes and configured working hours.

### 3. 🛡️ Clinic Management (Admin)
- **Operations Console & Real-time KPIs:** Total appointments, today's visits, active patients, doctor roster, and status distributions.
- **Capacity & Shift Inspector:** Real-time calculator showing the exact mathematical cycle breakdown: `(Shift Minutes ÷ 40) = Total Cycles`, reserving 1 slot for emergency buffer.
- **Doctor Provisioning & Credentials:** Create new doctor accounts, designate General Doctors vs. Specialists, assign clinic rooms, consultation fees (₦), and working shifts.
- **Shift Configuration:** Adjust start/end hours and active working days per doctor.
- **Master Appointment Registry & Patient Directory:** Hospital-wide oversight with full audit trail and status management.

---

## ⚙️ The 40-Minute Scheduling & Capacity Engine

MediSched NG enforces a deterministic appointment cycle calculation engine:

$$\text{Consultation (30 mins)} + \text{Mandatory Interval (10 mins)} = \text{40-minute Cycle}$$

### Mathematical Rules:
1. **Total Shift Minutes:** $\text{Shift End} - \text{Shift Start}$
2. **Possible Cycles:** $\lfloor \frac{\text{Total Shift Minutes}}{40} \rfloor$
3. **Reserved Capacity Protocol:** When $\text{Possible Cycles} \ge 2$, exactly **1 cycle** is protected as *Reserved Capacity* (unbookable by patients) for emergency overflow, sanitation, and record-keeping catch-up.
4. **Bookable Patient Slots:** $\text{Possible Cycles} - 1$

#### Example: 4-Hour Shift (09:00 AM – 01:00 PM = 240 mins)
- $240 \div 40 = 6\text{ Cycles}$
- **Slots Generated:**
  1. `09:00 – 09:30` (Interval to 09:40) — *Patient Bookable*
  2. `09:40 – 10:10` (Interval to 10:20) — *Patient Bookable*
  3. `10:20 – 10:50` (Interval to 11:00) — *Patient Bookable*
  4. `11:00 – 11:30` (Interval to 11:40) — *Patient Bookable*
  5. `11:40 – 12:10` (Interval to 12:20) — *Patient Bookable*
  6. `12:20 – 12:50` (Interval to 13:00) — 🔒 **Reserved Capacity (Unbookable)**

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend:** Node.js, Express.js (REST API)
- **Database:** SQLite (`better-sqlite3` with Write-Ahead Logging & Foreign Keys)
- **Authentication & Security:** JWT (JSON Web Tokens), `bcryptjs` password hashing, parameterized SQL queries
- **Bundler & Build Tool:** Vite (client) + `esbuild` (backend bundling to single `dist/server.cjs`)
- **Deployment Platform:** Railway / Cloud Container ready

---

## 🚀 Railway & Cloud Deployment Readiness

The project is structured with production bundling and zero-configuration startup scripts:

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs"
  }
}
```

### Environment Variables (`.env` or Railway Variables)
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=medisched_super_secure_jwt_secret_capstone_2026
```

---

## 🔑 Demo & Test Credentials

For quick evaluation, use the one-click **"Demo Role Switcher"** in the top navigation bar or log in manually with:

| Role | Email | Password | Details |
|---|---|---|---|
| **Patient** | `amaka.okonkwo@example.com` | `password123` | Amaka Okonkwo (`PAT-2026-000184`) |
| **Doctor** | `dr.adebayo@medisched.ng` | `password123` | Dr. Babatunde Adebayo (Cardiologist) |
| **Doctor** | `dr.chioma@medisched.ng` | `password123` | Dr. Chioma Nwosu (General Doctor) |
| **Admin** | `admin@medisched.ng` | `admin123` | Clinic Management Operations |

---

## 📡 Key REST API Endpoints

- `POST /api/auth/register` — Register a new patient
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/auth/me` — Current session & profile
- `GET /api/doctors` — Search doctors with filters (specialty, clinic, query, general doctor)
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD` — Real-time 40-min cycle calculation with reserved capacity
- `POST /api/appointments` — Book an appointment
- `GET /api/appointments` — Role-filtered appointment registry
- `PATCH /api/appointments/:id/status` — Doctor status transition (`Checked In`, `In Consultation`, `Completed`, `No Show`)
- `POST /api/appointments/:id/reschedule` — Patient slot rescheduling
- `POST /api/appointments/:id/cancel` — Cancel appointment & free slot
- `GET /api/admin/stats` — High-level clinic operations metrics
- `POST /api/admin/doctors` — Provision new doctor with shift schedule
- `PATCH /api/admin/doctors/:id` — Update doctor schedules & fees
