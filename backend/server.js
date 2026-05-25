require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'clinic-dev-secret-key';
const DB_PATH = path.resolve(process.env.DB_PATH || './data/clinic.db');

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

let db;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function autoSave() {
  try { saveDb(); } catch {}
}

async function initDatabase() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'doctor',
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      specialty TEXT,
      phone TEXT,
      license_number TEXT,
      hire_date TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER DEFAULT 1,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      blood_type TEXT,
      allergies TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      scheduled_at TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'scheduled',
      type TEXT DEFAULT 'consultation',
      reason TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      appointment_id INTEGER,
      status TEXT DEFAULT 'waiting',
      chief_complaint TEXT,
      diagnosis TEXT,
      notes TEXT,
      temperature REAL,
      blood_pressure TEXT,
      heart_rate INTEGER,
      weight REAL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      visit_id INTEGER,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (visit_id) REFERENCES visits(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prescription_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER NOT NULL,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      visit_id INTEGER,
      appointment_id INTEGER,
      amount REAL NOT NULL,
      payment_type TEXT DEFAULT 'consultation',
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'pending',
      description TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      file_data TEXT,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visit_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      chief_complaint TEXT,
      diagnosis TEXT,
      notes TEXT,
      vitals_defaults TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'medication',
      sku TEXT,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 10,
      unit TEXT DEFAULT 'units',
      unit_price REAL DEFAULT 0,
      supplier TEXT,
      expiry_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES inventory(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      base_salary REAL NOT NULL,
      bonus REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      paid_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lab_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      visit_id INTEGER,
      test_name TEXT NOT NULL,
      status TEXT DEFAULT 'ordered',
      result TEXT,
      result_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      vaccine_name TEXT NOT NULL,
      dose_number INTEGER DEFAULT 1,
      administered_at TEXT,
      next_dose_date TEXT,
      administered_by INTEGER,
      batch_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (administered_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      referring_doctor_id INTEGER,
      referred_to_doctor_id INTEGER,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      outcome TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (referring_doctor_id) REFERENCES users(id),
      FOREIGN KEY (referred_to_doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      receipt_ref TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT DEFAULT 'annual',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      approved_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      visit_id INTEGER,
      type TEXT NOT NULL DEFAULT 'medical',
      diagnosis TEXT,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS treatment_plan_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      completed_at TEXT,
      order_num INTEGER DEFAULT 0,
      FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      rating INTEGER NOT NULL,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (visit_id) REFERENCES visits(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // Add insurance columns to patients if missing
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_provider TEXT"); } catch {}
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_number TEXT"); } catch {}
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_type TEXT"); } catch {}

  // ── New tables for features #52-#63 ──

  db.run(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      file_type TEXT,
      file_size INTEGER,
      file_data TEXT,
      category TEXT DEFAULT 'general',
      uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      day_of_week INTEGER,
      day_of_month INTEGER,
      time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      type TEXT DEFAULT 'consultation',
      reason TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS patient_allergies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      allergen TEXT NOT NULL,
      severity TEXT DEFAULT 'moderate',
      reaction TEXT,
      noted_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'consultation',
      floor TEXT,
      capacity INTEGER DEFAULT 1,
      equipment TEXT,
      status TEXT DEFAULT 'available',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS room_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      appointment_id INTEGER,
      booked_by INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (booked_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expense_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      month TEXT NOT NULL,
      budget_amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      assigned_to INTEGER,
      created_by INTEGER,
      due_date TEXT,
      completed_at TEXT,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      review_period TEXT NOT NULL,
      overall_rating INTEGER NOT NULL,
      clinical_skills INTEGER,
      communication INTEGER,
      punctuality INTEGER,
      teamwork INTEGER,
      strengths TEXT,
      improvements TEXT,
      goals TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      visit_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      template_type TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (visit_id) REFERENCES visits(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      logo TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try { db.run("ALTER TABLE users ADD COLUMN clinic_id INTEGER DEFAULT 1"); } catch {}
  try { db.run("ALTER TABLE appointments ADD COLUMN clinic_id INTEGER DEFAULT 1"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN clinic_id INTEGER DEFAULT 1"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      widget_key TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      width TEXT DEFAULT 'half',
      is_visible INTEGER DEFAULT 1,
      config TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS consent_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      is_template INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS patient_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      form_id INTEGER NOT NULL,
      signed_at TEXT DEFAULT (datetime('now')),
      signature_data TEXT,
      witness_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (form_id) REFERENCES consent_forms(id)
    )
  `);

  // Seed rooms if empty
  const roomCount = db.exec("SELECT COUNT(*) as c FROM rooms")[0]?.values[0][0] || 0;
  if (roomCount === 0) {
    const roomsData = [
      ['Consultation Room 1', 'consultation', 'Ground', 2, 'Examination table, BP monitor, Stethoscope'],
      ['Consultation Room 2', 'consultation', 'Ground', 2, 'Examination table, BP monitor, Otoscope'],
      ['Procedure Room', 'procedure', 'Ground', 3, 'Surgical table, Surgical lights, Sterilizer'],
      ['Emergency Room', 'emergency', 'Ground', 4, 'Crash cart, Defibrillator, Oxygen supply'],
      ['Lab Room', 'lab', '1st Floor', 2, 'Microscope, Centrifuge, Blood analyzer'],
    ];
    for (const r of roomsData) {
      db.run('INSERT INTO rooms (name, type, floor, capacity, equipment) VALUES (?,?,?,?,?)', r);
    }
  }

  // Seed clinics if empty
  const clinicCount = db.exec("SELECT COUNT(*) as c FROM clinics")[0]?.values[0][0] || 0;
  if (clinicCount === 0) {
    db.run("INSERT INTO clinics (name, address, phone, email) VALUES (?,?,?,?)", ['Modern Clinic - Main', '12 Boulevard Mohammed V, Marrakech', '+212524123456', 'contact@modern-clinic.ma']);
    db.run("INSERT INTO clinics (name, address, phone, email) VALUES (?,?,?,?)", ['Modern Clinic - Branch', '45 Avenue Hassan II, Casablanca', '+212522789012', 'casa@modern-clinic.ma']);
  }

  // Seed consent form templates
  const consentCount = db.exec("SELECT COUNT(*) as c FROM consent_forms")[0]?.values[0][0] || 0;
  if (consentCount === 0) {
    db.run("INSERT INTO consent_forms (title, content, category, is_template) VALUES (?,?,?,1)", ['General Treatment Consent', 'I, the undersigned patient, hereby consent to the medical treatment and procedures recommended by my treating physician. I understand the nature, risks, benefits, and alternatives of the proposed treatment. I have been given the opportunity to ask questions and have received satisfactory answers.\n\nI understand that:\n1. No guarantees have been made regarding the outcome of the treatment.\n2. I may withdraw my consent at any time.\n3. My medical information will be kept confidential.\n\nI voluntarily consent to the proposed treatment.', 'general']);
    db.run("INSERT INTO consent_forms (title, content, category, is_template) VALUES (?,?,?,1)", ['Surgical Procedure Consent', 'I hereby authorize the physician and medical team to perform the following surgical procedure. I have been informed of the nature, purpose, risks, benefits, and alternatives. I understand post-operative care instructions and agree to follow medical advice.\n\nProcedure: _______________\nAnesthesia type: _______________\n\nI have read and understood the above information.', 'surgical']);
    db.run("INSERT INTO consent_forms (title, content, category, is_template) VALUES (?,?,?,1)", ['Data Privacy Consent', 'I consent to the collection, processing, and storage of my personal and medical data by the clinic for the purposes of medical treatment, appointment scheduling, billing, and compliance with legal obligations.\n\nI understand that my data will be handled in accordance with applicable data protection regulations.', 'privacy']);
  }

  // ── New tables for features #64-#70 ──

  db.run(`
    CREATE TABLE IF NOT EXISTS insurance_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      appointment_id INTEGER,
      claim_number TEXT,
      insurance_provider TEXT NOT NULL,
      policy_number TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'submitted',
      submitted_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT,
      decision_at TEXT,
      paid_amount REAL,
      rejection_reason TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS communication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'call',
      direction TEXT DEFAULT 'outgoing',
      subject TEXT,
      content TEXT,
      duration_minutes INTEGER,
      logged_by INTEGER,
      contacted_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (logged_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'scheduled',
      swap_requested_by INTEGER,
      swap_status TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES users(id),
      FOREIGN KEY (swap_requested_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      category TEXT DEFAULT 'general',
      payment_terms TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      order_number TEXT,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      ordered_at TEXT DEFAULT (datetime('now')),
      expected_delivery TEXT,
      delivered_at TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tv_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'info',
      is_active INTEGER DEFAULT 1,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      price REAL DEFAULT 0,
      duration_minutes INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointment_waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      preferred_date TEXT,
      preferred_time TEXT,
      service_id INTEGER,
      status TEXT DEFAULT 'waiting',
      priority INTEGER DEFAULT 0,
      notes TEXT,
      notified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS education_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT,
      author_id INTEGER,
      is_published INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Seed services if empty
  const serviceCount = db.exec("SELECT COUNT(*) as c FROM services")[0]?.values[0][0] || 0;
  if (serviceCount === 0) {
    const services = [
      ['General Consultation', 'consultation', 'Standard doctor consultation', 300, 30],
      ['Specialist Consultation', 'consultation', 'Specialist doctor visit', 500, 45],
      ['Follow-up Visit', 'consultation', 'Follow-up appointment', 200, 20],
      ['Blood Test - CBC', 'laboratory', 'Complete blood count', 150, 15],
      ['Blood Test - Full Panel', 'laboratory', 'Comprehensive metabolic panel', 400, 20],
      ['X-Ray', 'imaging', 'Standard X-ray examination', 350, 30],
      ['Ultrasound', 'imaging', 'Ultrasound examination', 500, 45],
      ['ECG', 'cardiology', 'Electrocardiogram', 250, 20],
      ['Vaccination', 'preventive', 'Standard vaccination', 200, 15],
      ['Minor Surgery', 'surgery', 'Minor outpatient procedure', 1500, 60],
      ['Physical Therapy Session', 'therapy', 'PT session', 350, 45],
      ['Dental Cleaning', 'dental', 'Professional dental cleaning', 400, 30],
    ];
    for (const s of services) {
      db.run("INSERT INTO services (name, category, description, price, duration_minutes) VALUES (?,?,?,?,?)", s);
    }
  }

  // Seed education articles if empty
  const articleCount = db.exec("SELECT COUNT(*) as c FROM education_articles")[0]?.values[0][0] || 0;
  if (articleCount === 0) {
    const articles = [
      ['Understanding Blood Pressure', 'Learn what blood pressure numbers mean and how to maintain healthy levels.', 'cardiology', 'blood pressure,heart,prevention', 1],
      ['Diabetes Management Tips', 'Daily habits and dietary advice for managing diabetes effectively.', 'endocrinology', 'diabetes,diet,lifestyle', 1],
      ['Importance of Vaccinations', 'Why vaccines matter and the recommended schedule for all ages.', 'preventive', 'vaccination,immunity,children', 1],
      ['Post-Surgery Care Guide', 'Essential steps to follow after any surgical procedure.', 'surgery', 'surgery,recovery,care', 1],
      ['Healthy Eating Basics', 'A simple guide to balanced nutrition for the whole family.', 'nutrition', 'diet,nutrition,health', 1],
    ];
    for (const a of articles) {
      db.run("INSERT INTO education_articles (title, content, category, tags, is_published) VALUES (?,?,?,?,?)", a);
    }
  }

  // Seed suppliers if empty
  const supplierCount = db.exec("SELECT COUNT(*) as c FROM suppliers")[0]?.values[0][0] || 0;
  if (supplierCount === 0) {
    db.run("INSERT INTO suppliers (name, contact_person, email, phone, category, payment_terms) VALUES (?,?,?,?,?,?)", ['PharmaMed', 'Hassan El Alami', 'orders@pharmamed.ma', '+212522111222', 'medication', 'Net 30']);
    db.run("INSERT INTO suppliers (name, contact_person, email, phone, category, payment_terms) VALUES (?,?,?,?,?,?)", ['MedSupply Co', 'Karim Tazi', 'sales@medsupply.ma', '+212522333444', 'supplies', 'Net 15']);
    db.run("INSERT INTO suppliers (name, contact_person, email, phone, category, payment_terms) VALUES (?,?,?,?,?,?)", ['MedTech Equipment', 'Fatima Benali', 'info@medtech.ma', '+212522555666', 'equipment', 'Net 60']);
  }

  // Seed if empty
  const userCount = db.exec("SELECT COUNT(*) as c FROM users")[0]?.values[0][0] || 0;
  if (userCount === 0) seedData();

  saveDb();
  setInterval(autoSave, 30000);
}

function seedData() {
  const hash = bcrypt.hashSync('password', 10);

  const users = [
    ['Dr. Admin', 'admin@clinic.test', hash, 'admin', 'General Practice', '+212600000001', 'LIC-001', '2024-01-01'],
    ['Dr. Sarah Chen', 'doctor@clinic.test', hash, 'doctor', 'Cardiology', '+212600000002', 'LIC-002', '2024-03-15'],
    ['Fatima Zahra', 'reception@clinic.test', hash, 'receptionist', null, '+212600000003', null, '2024-06-01'],
    ['Karim Bennani', 'accountant@clinic.test', hash, 'accountant', null, '+212600000004', null, '2024-06-01'],
  ];
  for (const u of users) {
    db.run('INSERT INTO users (name, email, password, role, specialty, phone, license_number, hire_date) VALUES (?,?,?,?,?,?,?,?)', u);
  }

  const patients = [
    ['Ahmed', 'El Mansouri', '1985-03-15', 'male', '+212661234567', 'ahmed@email.com', '12 Rue Mohammed V, Marrakech', 'A+', null, 'Fatima El Mansouri', '+212662345678'],
    ['Yasmine', 'Benali', '1992-07-22', 'female', '+212662345678', 'yasmine@email.com', '45 Avenue Hassan II, Casablanca', 'O-', 'Penicillin', 'Omar Benali', '+212663456789'],
    ['Omar', 'Tazi', '1978-11-08', 'male', '+212663456789', null, '8 Rue Ibn Sina, Rabat', 'B+', null, null, null],
    ['Khadija', 'Amrani', '2000-01-30', 'female', '+212664567890', 'khadija@email.com', '33 Boulevard Zerktouni, Fes', 'AB+', 'Aspirin', 'Hassan Amrani', '+212665678901'],
    ['Hassan', 'Idrissi', '1965-09-12', 'male', '+212665678901', null, '17 Rue Moulay Ismail, Meknes', 'O+', 'Sulfa drugs', null, null],
  ];
  for (const p of patients) {
    db.run('INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?)', p);
  }

  const today = new Date().toISOString().split('T')[0];
  const appts = [
    [1, 2, `${today}T09:00:00`, 30, 'scheduled', 'consultation', 'Regular checkup'],
    [2, 2, `${today}T10:00:00`, 45, 'confirmed', 'follow_up', 'Post-surgery follow up'],
    [3, 2, `${today}T11:00:00`, 30, 'arrived', 'consultation', 'Chest pain'],
    [4, 2, `${today}T14:00:00`, 30, 'scheduled', 'consultation', 'Annual physical'],
    [5, 2, `${today}T15:30:00`, 60, 'scheduled', 'consultation', 'Diabetes management'],
  ];
  for (const a of appts) {
    db.run('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason) VALUES (?,?,?,?,?,?,?)', a);
  }

  db.run("INSERT INTO visits (patient_id, doctor_id, appointment_id, status, chief_complaint, diagnosis, temperature, blood_pressure, heart_rate, weight, started_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))",
    [3, 2, 3, 'in_progress', 'Chest pain radiating to left arm', 'Angina pectoris - stable', 37.2, '140/90', 88, 82.5]);

  db.run('INSERT INTO prescriptions (patient_id, doctor_id, visit_id, notes, is_active) VALUES (?,?,?,?,?)',
    [3, 2, 1, 'Take with food. Follow up in 2 weeks.', 1]);
  db.run('INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES (?,?,?,?,?,?)',
    [1, 'Aspirin', '100mg', 'Once daily', '30 days', 'Take in the morning with breakfast']);
  db.run('INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES (?,?,?,?,?,?)',
    [1, 'Atorvastatin', '20mg', 'Once daily', '30 days', 'Take at bedtime']);

  db.run('INSERT INTO payments (patient_id, visit_id, appointment_id, amount, payment_type, payment_method, status, description) VALUES (?,?,?,?,?,?,?,?)',
    [3, 1, 3, 350, 'consultation', 'cash', 'pending', 'Consultation + ECG']);
  db.run("INSERT INTO payments (patient_id, appointment_id, amount, payment_type, payment_method, status, description, paid_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
    [2, 2, 200, 'follow_up', 'card', 'paid', 'Follow-up consultation']);

  // Seed inventory
  const inventoryItems = [
    ['Paracetamol 500mg', 'medication', 'MED-001', 200, 50, 'tablets', 2.5, 'PharmaMed', '2027-06-30'],
    ['Amoxicillin 250mg', 'medication', 'MED-002', 150, 30, 'capsules', 5.0, 'PharmaMed', '2026-12-15'],
    ['Ibuprofen 400mg', 'medication', 'MED-003', 100, 25, 'tablets', 3.0, 'BioHealth', '2027-03-20'],
    ['Surgical Gloves (M)', 'supplies', 'SUP-001', 500, 100, 'pairs', 1.2, 'MedSupply Co', null],
    ['Syringes 5ml', 'supplies', 'SUP-002', 300, 50, 'units', 0.8, 'MedSupply Co', null],
    ['Bandages', 'supplies', 'SUP-003', 80, 30, 'rolls', 4.0, 'MedSupply Co', null],
    ['Omeprazole 20mg', 'medication', 'MED-004', 8, 20, 'capsules', 6.0, 'PharmaMed', '2027-01-10'],
    ['Digital Thermometer', 'equipment', 'EQP-001', 5, 2, 'units', 45.0, 'MedTech', null],
  ];
  for (const item of inventoryItems) {
    db.run('INSERT INTO inventory (name, category, sku, quantity, min_quantity, unit, unit_price, supplier, expiry_date) VALUES (?,?,?,?,?,?,?,?,?)', item);
  }

  // Seed payroll
  const currentMonth = new Date().toISOString().slice(0, 7);
  const payrollData = [
    [1, currentMonth, 15000, 2000, 1500, 15500, 'paid'],
    [2, currentMonth, 25000, 3000, 2000, 26000, 'paid'],
    [3, currentMonth, 8000, 500, 800, 7700, 'pending'],
    [4, currentMonth, 10000, 1000, 1000, 10000, 'pending'],
  ];
  for (const p of payrollData) {
    db.run("INSERT INTO payroll (employee_id, month, base_salary, bonus, deductions, net_salary, status) VALUES (?,?,?,?,?,?,?)", p);
  }

  // Seed schedules
  const scheduleData = [
    [2, 1, '09:00', '17:00', 1], [2, 2, '09:00', '17:00', 1], [2, 3, '09:00', '13:00', 1],
    [2, 4, '09:00', '17:00', 1], [2, 5, '09:00', '15:00', 1],
    [3, 1, '10:00', '18:00', 1], [3, 2, '10:00', '18:00', 1], [3, 3, '14:00', '18:00', 1],
    [3, 4, '10:00', '18:00', 1], [3, 5, '10:00', '16:00', 1],
  ];
  for (const s of scheduleData) {
    db.run('INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, is_available) VALUES (?,?,?,?,?)', s);
  }

  // Seed visit templates
  const templates = [
    ['General Consultation', 'general', 'Patient presents for general consultation', '', 'Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:', null],
    ['Follow-up Visit', 'follow_up', 'Follow-up visit for previously diagnosed condition', '', 'Progress since last visit:\n\nCurrent symptoms:\n\nPlan adjustments:', null],
    ['Annual Physical', 'preventive', 'Annual physical examination', 'Routine physical exam — no acute concerns', 'Complete physical exam performed.\nVitals within normal limits.\nScreening labs ordered.\nVaccinations up to date.', '{"temperature":37,"blood_pressure":"120/80","heart_rate":72,"weight":70}'],
    ['Urgent Care', 'urgent', 'Patient presents with acute symptoms', '', 'Onset:\nDuration:\nSeverity:\nAssociated symptoms:\n\nTreatment plan:', null],
  ];
  for (const t of templates) {
    db.run('INSERT INTO visit_templates (name, category, chief_complaint, diagnosis, notes, vitals_defaults) VALUES (?,?,?,?,?,?)', t);
  }

  console.log('Database seeded with demo data.');
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
  }
  stmt.free();
  return row;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  const id = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
  autoSave();
  return id;
}

function countSql(sql, params = []) {
  const r = db.exec(sql, params);
  return r[0]?.values[0][0] || 0;
}

// ── Auth Middleware ──────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.user = getOne('SELECT id, name, email, role, avatar, is_active, specialty, phone, license_number, hire_date FROM users WHERE id = ?', [decoded.id]);
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// ── Formatters ──────────────────────────────────────────────────────────────

function formatUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, is_active: !!u.is_active,
    employee: { id: u.id, user_id: u.id, clinic_id: 1, specialty: u.specialty, phone: u.phone, license_number: u.license_number, status: 'active', hire_date: u.hire_date },
  };
}

function formatPatient(p) {
  const ac = countSql('SELECT COUNT(*) FROM appointments WHERE patient_id = ?', [p.id]);
  const vc = countSql('SELECT COUNT(*) FROM visits WHERE patient_id = ?', [p.id]);
  return { ...p, full_name: `${p.first_name} ${p.last_name}`, appointments_count: ac, visits_count: vc };
}

function formatAppointment(a) {
  const patient = a.patient_id ? getOne('SELECT * FROM patients WHERE id = ?', [a.patient_id]) : null;
  const doctor = a.doctor_id ? getOne('SELECT id, name FROM users WHERE id = ?', [a.doctor_id]) : null;
  return { id: a.id, patient: patient ? formatPatient(patient) : null, doctor, scheduled_at: a.scheduled_at, duration_minutes: a.duration_minutes, status: a.status, type: a.type, reason: a.reason, notes: a.notes, created_at: a.created_at };
}

function formatVisit(v) {
  const patient = v.patient_id ? getOne('SELECT * FROM patients WHERE id = ?', [v.patient_id]) : null;
  const doctor = v.doctor_id ? getOne('SELECT id, name FROM users WHERE id = ?', [v.doctor_id]) : null;
  const appointment = v.appointment_id ? getOne('SELECT * FROM appointments WHERE id = ?', [v.appointment_id]) : null;
  const prescriptions = getAll('SELECT * FROM prescriptions WHERE visit_id = ?', [v.id]).map(formatPrescription);
  return {
    id: v.id, patient: patient ? formatPatient(patient) : null, doctor, appointment: appointment ? formatAppointment(appointment) : null,
    status: v.status, chief_complaint: v.chief_complaint, diagnosis: v.diagnosis, notes: v.notes,
    vitals: { temperature: v.temperature, blood_pressure: v.blood_pressure, heart_rate: v.heart_rate, weight: v.weight },
    started_at: v.started_at, completed_at: v.completed_at, prescriptions, created_at: v.created_at,
  };
}

function formatPrescription(p) {
  const patient = p.patient_id ? getOne('SELECT * FROM patients WHERE id = ?', [p.patient_id]) : null;
  const doctor = p.doctor_id ? getOne('SELECT id, name FROM users WHERE id = ?', [p.doctor_id]) : null;
  const items = getAll('SELECT * FROM prescription_items WHERE prescription_id = ?', [p.id]);
  return { id: p.id, patient: patient ? formatPatient(patient) : null, doctor, visit_id: p.visit_id, notes: p.notes, is_active: !!p.is_active, items, created_at: p.created_at };
}

function formatPayment(p) {
  const patient = p.patient_id ? getOne('SELECT * FROM patients WHERE id = ?', [p.patient_id]) : null;
  return { id: p.id, patient: patient ? formatPatient(patient) : null, visit_id: p.visit_id, appointment_id: p.appointment_id, amount: p.amount, payment_type: p.payment_type, payment_method: p.payment_method, status: p.status, description: p.description, paid_at: p.paid_at, created_at: p.created_at };
}

function audit(req, action, entity, entityId, detail) {
  runSql('INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)',
    [req.user?.id, req.user?.name, action, entity, entityId, detail]);
}

function notify(userId, title, message, type = 'info') {
  runSql('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)', [userId, title, message, type]);
}

function notifyAll(title, message, type = 'info') {
  const users = getAll('SELECT id FROM users WHERE is_active = 1');
  for (const u of users) notify(u.id, title, message, type);
}

function paginate(query, countQuery, params, req, formatter) {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.per_page) || 15;
  const offset = (page - 1) * perPage;
  const total = countSql(countQuery, params);
  const rows = getAll(query + ' LIMIT ? OFFSET ?', [...params, perPage, offset]);
  return { data: rows.map(formatter), meta: { current_page: page, last_page: Math.ceil(total / perPage) || 1, per_page: perPage, total } };
}

// ── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials. Please try again.' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  runSql('INSERT INTO audit_log (user_id, user_name, action, entity, detail) VALUES (?,?,?,?,?)',
    [user.id, user.name, 'login', 'auth', `Login from ${req.ip}`]);
  res.json({ token, user: formatUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json(formatUser(req.user)));
app.post('/api/auth/logout', authenticate, (req, res) => res.json({ message: 'Logged out' }));

// ── Patients ────────────────────────────────────────────────────────────────

app.get('/api/patients', authenticate, (req, res) => {
  const search = req.query.search || '';
  let where = '', params = [];
  if (search) { where = "WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?"; params = [`%${search}%`, `%${search}%`, `%${search}%`]; }
  res.json(paginate(`SELECT * FROM patients ${where} ORDER BY created_at DESC`, `SELECT COUNT(*) FROM patients ${where}`, params, req, formatPatient));
});

app.get('/api/patients/search', authenticate, (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json([]);
  const rows = getAll("SELECT * FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? ORDER BY first_name LIMIT 10", [`%${q}%`, `%${q}%`, `%${q}%`]);
  res.json(rows.map(formatPatient));
});

app.get('/api/patients/:id', authenticate, (req, res) => {
  const p = getOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  res.json(formatPatient(p));
});

app.post('/api/patients', authenticate, (req, res) => {
  const { first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, notes } = req.body;
  const id = runSql('INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, notes]);
  audit(req, 'create', 'patient', id, `${first_name} ${last_name}`);
  res.status(201).json(formatPatient(getOne('SELECT * FROM patients WHERE id = ?', [id])));
});

app.put('/api/patients/:id', authenticate, (req, res) => {
  const { first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, notes } = req.body;
  runSql("UPDATE patients SET first_name=?, last_name=?, date_of_birth=?, gender=?, phone=?, email=?, address=?, blood_type=?, allergies=?, emergency_contact_name=?, emergency_contact_phone=?, notes=?, updated_at=datetime('now') WHERE id=?",
    [first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, notes, req.params.id]);
  const p = getOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  res.json(formatPatient(p));
});

app.delete('/api/patients/:id', authenticate, (req, res) => {
  const p = getOne('SELECT first_name, last_name FROM patients WHERE id = ?', [req.params.id]);
  runSql('DELETE FROM patients WHERE id = ?', [req.params.id]);
  audit(req, 'delete', 'patient', Number(req.params.id), p ? `${p.first_name} ${p.last_name}` : '');
  res.json({ message: 'Deleted' });
});

// ── Appointments ────────────────────────────────────────────────────────────

app.get('/api/appointments', authenticate, (req, res) => {
  let where = [], params = [];
  if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }
  if (req.query.date) { where.push("date(scheduled_at) = ?"); params.push(req.query.date); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  res.json(paginate(`SELECT * FROM appointments ${w} ORDER BY scheduled_at DESC`, `SELECT COUNT(*) FROM appointments ${w}`, params, req, formatAppointment));
});

app.get('/api/appointments/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json(getAll("SELECT * FROM appointments WHERE date(scheduled_at) = ? ORDER BY scheduled_at ASC", [today]).map(formatAppointment));
});

app.get('/api/appointments/:id', authenticate, (req, res) => {
  const a = getOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json(formatAppointment(a));
});

app.post('/api/appointments', authenticate, (req, res) => {
  const { patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes, recurrence, recurrence_count } = req.body;
  const ids = [];
  const count = recurrence && recurrence !== 'none' ? Math.min(recurrence_count || 4, 12) : 1;
  const baseDate = new Date(scheduled_at);

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    if (recurrence === 'daily') d.setDate(d.getDate() + i);
    else if (recurrence === 'weekly') d.setDate(d.getDate() + i * 7);
    else if (recurrence === 'biweekly') d.setDate(d.getDate() + i * 14);
    else if (recurrence === 'monthly') d.setMonth(d.getMonth() + i);
    const dateStr = d.toISOString().replace('Z', '').slice(0, 16);
    const id = runSql('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes) VALUES (?,?,?,?,?,?,?,?)',
      [patient_id, doctor_id, dateStr, duration_minutes || 30, status || 'scheduled', type || 'consultation', reason, notes]);
    ids.push(id);
  }
  const appt = getOne('SELECT * FROM appointments WHERE id = ?', [ids[0]]);
  const patient = getOne('SELECT first_name, last_name FROM patients WHERE id = ?', [patient_id]);
  if (patient) notifyAll('New Appointment', `${patient.first_name} ${patient.last_name} — ${type || 'consultation'}${count > 1 ? ` (${count} recurring)` : ''}`, 'appointment');
  audit(req, 'create', 'appointment', ids[0], `${patient ? patient.first_name + ' ' + patient.last_name : ''} — ${type || 'consultation'}${count > 1 ? ` (${count} recurring)` : ''}`);
  res.status(201).json(count > 1 ? { created: ids.length, first: formatAppointment(appt) } : formatAppointment(appt));
});

app.put('/api/appointments/:id', authenticate, (req, res) => {
  const { patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes } = req.body;
  runSql('UPDATE appointments SET patient_id=?, doctor_id=?, scheduled_at=?, duration_minutes=?, status=?, type=?, reason=?, notes=? WHERE id=?',
    [patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes, req.params.id]);
  const a = getOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json(formatAppointment(a));
});

app.patch('/api/appointments/:id/status', authenticate, (req, res) => {
  runSql('UPDATE appointments SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  const a = getOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ message: 'Appointment not found' });
  res.json(formatAppointment(a));
});

// ── Visits ──────────────────────────────────────────────────────────────────

app.get('/api/visits', authenticate, (req, res) => {
  let where = [], params = [];
  if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  res.json(paginate(`SELECT * FROM visits ${w} ORDER BY created_at DESC`, `SELECT COUNT(*) FROM visits ${w}`, params, req, formatVisit));
});

app.get('/api/visits/:id', authenticate, (req, res) => {
  const v = getOne('SELECT * FROM visits WHERE id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ message: 'Visit not found' });
  res.json(formatVisit(v));
});

app.post('/api/visits', authenticate, (req, res) => {
  const { patient_id, doctor_id, appointment_id, chief_complaint, diagnosis, notes, vitals } = req.body;
  const id = runSql('INSERT INTO visits (patient_id, doctor_id, appointment_id, chief_complaint, diagnosis, notes, temperature, blood_pressure, heart_rate, weight) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [patient_id, doctor_id || req.user.id, appointment_id, chief_complaint, diagnosis, notes, vitals?.temperature, vitals?.blood_pressure, vitals?.heart_rate, vitals?.weight]);
  res.status(201).json(formatVisit(getOne('SELECT * FROM visits WHERE id = ?', [id])));
});

app.put('/api/visits/:id', authenticate, (req, res) => {
  const { chief_complaint, diagnosis, notes, vitals } = req.body;
  runSql('UPDATE visits SET chief_complaint=?, diagnosis=?, notes=?, temperature=?, blood_pressure=?, heart_rate=?, weight=? WHERE id=?',
    [chief_complaint, diagnosis, notes, vitals?.temperature, vitals?.blood_pressure, vitals?.heart_rate, vitals?.weight, req.params.id]);
  const v = getOne('SELECT * FROM visits WHERE id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ message: 'Visit not found' });
  res.json(formatVisit(v));
});

app.patch('/api/visits/:id/start', authenticate, (req, res) => {
  runSql("UPDATE visits SET status = 'in_progress', started_at = datetime('now') WHERE id = ?", [req.params.id]);
  const v = getOne('SELECT * FROM visits WHERE id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ message: 'Visit not found' });
  res.json(formatVisit(v));
});

app.patch('/api/visits/:id/complete', authenticate, (req, res) => {
  runSql("UPDATE visits SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [req.params.id]);
  const v = getOne('SELECT * FROM visits WHERE id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ message: 'Visit not found' });
  res.json(formatVisit(v));
});

// ── Prescriptions ───────────────────────────────────────────────────────────

app.get('/api/prescriptions', authenticate, (req, res) => {
  res.json(paginate('SELECT * FROM prescriptions ORDER BY created_at DESC', 'SELECT COUNT(*) FROM prescriptions', [], req, formatPrescription));
});

app.get('/api/prescriptions/:id', authenticate, (req, res) => {
  const p = getOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Prescription not found' });
  res.json(formatPrescription(p));
});

app.post('/api/prescriptions', authenticate, (req, res) => {
  const { patient_id, visit_id, notes, items } = req.body;
  const id = runSql('INSERT INTO prescriptions (patient_id, doctor_id, visit_id, notes) VALUES (?,?,?,?)',
    [patient_id, req.user.id, visit_id, notes]);
  if (items && items.length) {
    for (const item of items) {
      runSql('INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES (?,?,?,?,?,?)',
        [id, item.medication_name, item.dosage, item.frequency, item.duration, item.instructions]);
    }
  }
  res.status(201).json(formatPrescription(getOne('SELECT * FROM prescriptions WHERE id = ?', [id])));
});

app.put('/api/prescriptions/:id', authenticate, (req, res) => {
  const { notes, is_active, items } = req.body;
  runSql('UPDATE prescriptions SET notes=?, is_active=? WHERE id=?', [notes, is_active ? 1 : 0, req.params.id]);
  if (items) {
    db.run('DELETE FROM prescription_items WHERE prescription_id = ?', [req.params.id]);
    for (const item of items) {
      runSql('INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES (?,?,?,?,?,?)',
        [req.params.id, item.medication_name, item.dosage, item.frequency, item.duration, item.instructions]);
    }
  }
  const p = getOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Prescription not found' });
  res.json(formatPrescription(p));
});

// ── Payments ────────────────────────────────────────────────────────────────

app.get('/api/payments', authenticate, (req, res) => {
  let where = [], params = [];
  if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  res.json(paginate(`SELECT * FROM payments ${w} ORDER BY created_at DESC`, `SELECT COUNT(*) FROM payments ${w}`, params, req, formatPayment));
});

app.get('/api/payments/:id', authenticate, (req, res) => {
  const p = getOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Payment not found' });
  res.json(formatPayment(p));
});

app.post('/api/payments', authenticate, (req, res) => {
  const { patient_id, visit_id, appointment_id, amount, payment_type, payment_method, status, description } = req.body;
  const id = runSql('INSERT INTO payments (patient_id, visit_id, appointment_id, amount, payment_type, payment_method, status, description) VALUES (?,?,?,?,?,?,?,?)',
    [patient_id, visit_id, appointment_id, amount, payment_type || 'consultation', payment_method || 'cash', status || 'pending', description]);
  const patient = getOne('SELECT first_name, last_name FROM patients WHERE id = ?', [patient_id]);
  if (patient) notifyAll('New Payment', `${patient.first_name} ${patient.last_name} — ${amount} MAD (${status || 'pending'})`, 'payment');
  audit(req, 'create', 'payment', id, `${patient ? patient.first_name + ' ' + patient.last_name : ''} — ${amount} MAD`);
  res.status(201).json(formatPayment(getOne('SELECT * FROM payments WHERE id = ?', [id])));
});

app.put('/api/payments/:id', authenticate, (req, res) => {
  const { amount, payment_type, payment_method, status, description } = req.body;
  runSql('UPDATE payments SET amount=?, payment_type=?, payment_method=?, status=?, description=? WHERE id=?',
    [amount, payment_type, payment_method, status, description, req.params.id]);
  const p = getOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Payment not found' });
  res.json(formatPayment(p));
});

app.patch('/api/payments/:id/pay', authenticate, (req, res) => {
  runSql("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?", [req.params.id]);
  const p = getOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ message: 'Payment not found' });
  res.json(formatPayment(p));
});

// ── Notifications ───────────────────────────────────────────────────────────

app.get('/api/notifications', authenticate, (req, res) => {
  const rows = getAll('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 20', [req.user.id]);
  res.json(rows.map(n => ({ ...n, read: !!n.read })));
});

app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
  runSql('UPDATE notifications SET read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read' });
});

app.post('/api/notifications/read-all', authenticate, (req, res) => {
  runSql('UPDATE notifications SET read = 1 WHERE user_id = ? OR user_id IS NULL', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

// ── Dashboard ───────────────────────────────────────────────────────────────

app.get('/api/dashboard/admin', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayPatients = countSql("SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE date(scheduled_at) = ?", [today]);
  const monthRevenue = countSql("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
  const activeEmployees = countSql("SELECT COUNT(*) FROM users WHERE is_active = 1");
  const recentAppointments = getAll("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5").map(formatAppointment);
  const recentPayments = getAll("SELECT * FROM payments ORDER BY created_at DESC LIMIT 5").map(formatPayment);
  const statuses = ['scheduled', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'];
  const appointmentStats = {};
  for (const s of statuses) appointmentStats[s] = countSql("SELECT COUNT(*) FROM appointments WHERE status = ? AND date(scheduled_at) = ?", [s, today]);
  res.json({ today_patients: todayPatients, month_revenue: monthRevenue, active_employees: activeEmployees, recent_appointments: recentAppointments, recent_payments: recentPayments, appointment_stats: appointmentStats });
});

app.get('/api/dashboard/doctor', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = getAll("SELECT * FROM appointments WHERE doctor_id = ? AND date(scheduled_at) = ? ORDER BY scheduled_at ASC", [req.user.id, today]).map(formatAppointment);
  const currentVisit = getOne("SELECT * FROM visits WHERE doctor_id = ? AND status = 'in_progress' LIMIT 1", [req.user.id]);
  const nextPatient = getOne("SELECT * FROM appointments WHERE doctor_id = ? AND date(scheduled_at) = ? AND status IN ('scheduled', 'confirmed', 'arrived') ORDER BY scheduled_at ASC LIMIT 1", [req.user.id, today]);
  const recentPrescriptions = getAll("SELECT * FROM prescriptions WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 5", [req.user.id]).map(formatPrescription);
  const patientsSeenToday = countSql("SELECT COUNT(*) FROM visits WHERE doctor_id = ? AND date(created_at) = ?", [req.user.id, today]);
  res.json({ today_appointments: todayAppointments, current_visit: currentVisit ? formatVisit(currentVisit) : null, next_patient: nextPatient ? formatAppointment(nextPatient) : null, recent_prescriptions: recentPrescriptions, patients_seen_today: patientsSeenToday });
});

app.get('/api/dashboard/reception', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = getAll("SELECT * FROM appointments WHERE date(scheduled_at) = ? ORDER BY scheduled_at ASC", [today]).map(formatAppointment);
  const waitingPatients = countSql("SELECT COUNT(*) FROM appointments WHERE date(scheduled_at) = ? AND status = 'arrived'", [today]);
  const cancelledCount = countSql("SELECT COUNT(*) FROM appointments WHERE date(scheduled_at) = ? AND status = 'cancelled'", [today]);
  const noShowCount = countSql("SELECT COUNT(*) FROM appointments WHERE date(scheduled_at) = ? AND status = 'no_show'", [today]);
  const pendingPayments = getAll("SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10").map(formatPayment);
  res.json({ today_appointments: todayAppointments, waiting_patients: waitingPatients, cancelled_count: cancelledCount, no_show_count: noShowCount, pending_payments: pendingPayments });
});

// ── AI Assistant ─────────────────────────────────────────────────────────────

app.post('/api/ai/chat', authenticate, (req, res) => {
  const { message, context } = req.body;
  const msg = (message || '').toLowerCase();

  if (context?.visitId) {
    const visit = getOne('SELECT * FROM visits WHERE id = ?', [context.visitId]);
    if (visit) {
      const patient = getOne('SELECT * FROM patients WHERE id = ?', [visit.patient_id]);
      const prescriptions = getAll('SELECT * FROM prescriptions WHERE visit_id = ?', [visit.id]);
      const items = prescriptions.flatMap(p => getAll('SELECT * FROM prescription_items WHERE prescription_id = ?', [p.id]));

      if (msg.includes('summarize') || msg.includes('summary')) {
        return res.json({ response: `**Visit Summary**\n\n**Patient:** ${patient?.first_name} ${patient?.last_name}\n**Status:** ${visit.status}\n**Chief Complaint:** ${visit.chief_complaint || 'Not recorded'}\n**Diagnosis:** ${visit.diagnosis || 'Pending'}\n\n**Vitals:**\n- Temperature: ${visit.temperature || 'N/A'}°C\n- Blood Pressure: ${visit.blood_pressure || 'N/A'}\n- Heart Rate: ${visit.heart_rate || 'N/A'} bpm\n- Weight: ${visit.weight || 'N/A'} kg\n\n**Medications:** ${items.length ? items.map(i => `${i.medication_name} ${i.dosage}`).join(', ') : 'None prescribed'}\n\n**Notes:** ${visit.notes || 'None'}` });
      }
      if (msg.includes('soap')) {
        return res.json({ response: `**SOAP Note**\n\n**S (Subjective):**\nPatient ${patient?.first_name} ${patient?.last_name} presents with: ${visit.chief_complaint || 'No chief complaint recorded'}.\n\n**O (Objective):**\n- Temp: ${visit.temperature || 'N/A'}°C\n- BP: ${visit.blood_pressure || 'N/A'}\n- HR: ${visit.heart_rate || 'N/A'} bpm\n- Weight: ${visit.weight || 'N/A'} kg\n\n**A (Assessment):**\n${visit.diagnosis || 'Assessment pending'}\n\n**P (Plan):**\n${items.length ? items.map(i => `- ${i.medication_name} ${i.dosage} — ${i.frequency} for ${i.duration}`).join('\n') : 'No medications prescribed'}\n${visit.notes ? `\nAdditional notes: ${visit.notes}` : ''}` });
      }
      if (msg.includes('next step') || msg.includes('recommend')) {
        const steps = [];
        if (!visit.diagnosis) steps.push('Complete the diagnosis assessment');
        if (!visit.temperature && !visit.blood_pressure) steps.push('Record vital signs');
        if (items.length === 0) steps.push('Consider prescribing medications if needed');
        if (visit.status === 'in_progress') steps.push('Complete the visit when finished');
        steps.push('Schedule a follow-up appointment if necessary');
        steps.push('Review patient allergies before prescribing: ' + (patient?.allergies || 'None recorded'));
        return res.json({ response: `**Recommended Next Steps**\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` });
      }
    }
  }

  if (context?.patientId) {
    const patient = getOne('SELECT * FROM patients WHERE id = ?', [context.patientId]);
    if (patient) {
      const visits = getAll('SELECT * FROM visits WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5', [patient.id]);
      const appointments = getAll('SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC LIMIT 5', [patient.id]);
      return res.json({ response: `**Patient Recap: ${patient.first_name} ${patient.last_name}**\n\n**Demographics:**\n- DOB: ${patient.date_of_birth || 'N/A'}\n- Gender: ${patient.gender || 'N/A'}\n- Blood Type: ${patient.blood_type || 'N/A'}\n- Allergies: ${patient.allergies || 'None recorded'}\n\n**Recent Activity:**\n- Total Visits: ${visits.length}\n- Last Visit: ${visits[0]?.created_at || 'None'}\n- Last Diagnosis: ${visits[0]?.diagnosis || 'N/A'}\n\n**Upcoming Appointments:** ${appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length}\n\n**Emergency Contact:** ${patient.emergency_contact_name || 'Not provided'} ${patient.emergency_contact_phone || ''}` });
    }
  }

  const totalPatients = countSql('SELECT COUNT(*) FROM patients');
  const todayAppts = countSql("SELECT COUNT(*) FROM appointments WHERE date(scheduled_at) = date('now')");
  const pendingPayments = countSql("SELECT COUNT(*) FROM payments WHERE status = 'pending'");

  res.json({ response: `I'm your clinic AI assistant. Here's a quick overview:\n\n- **${totalPatients}** registered patients\n- **${todayAppts}** appointments today\n- **${pendingPayments}** pending payments\n\nYou can ask me to:\n- Summarize a visit\n- Generate a SOAP note\n- Get a patient recap\n- Suggest next steps\n\nSelect a visit or patient context for detailed analysis.` });
});

// ── Analytics ──────────────────────────────────────────────────────────────

app.get('/api/analytics/revenue-trend', authenticate, (req, res) => {
  const rows = getAll(`
    SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as revenue
    FROM payments WHERE status = 'paid'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);
  res.json(rows.reverse());
});

app.get('/api/analytics/patient-growth', authenticate, (req, res) => {
  const rows = getAll(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM patients GROUP BY month ORDER BY month DESC LIMIT 12
  `);
  res.json(rows.reverse());
});

app.get('/api/analytics/appointment-trend', authenticate, (req, res) => {
  const rows = getAll(`
    SELECT strftime('%Y-%m', scheduled_at) as month, COUNT(*) as count
    FROM appointments GROUP BY month ORDER BY month DESC LIMIT 12
  `);
  res.json(rows.reverse());
});

app.get('/api/appointments/range', authenticate, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ message: 'start and end required' });
  const rows = getAll(
    "SELECT * FROM appointments WHERE date(scheduled_at) >= ? AND date(scheduled_at) <= ? ORDER BY scheduled_at ASC",
    [start, end]
  );
  res.json(rows.map(formatAppointment));
});

// ── Audit Log ──────────────────────────────────────────────────────────────

app.get('/api/audit-log', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  res.json(paginate(
    'SELECT * FROM audit_log ORDER BY created_at DESC',
    'SELECT COUNT(*) FROM audit_log',
    [], req, (row) => ({ ...row, user_name: row.user_name || 'System' })
  ));
});

// ── Backup / Restore ───────────────────────────────────────────────────────

app.get('/api/backup', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  saveDb();
  const data = db.export();
  const buffer = Buffer.from(data);
  runSql("INSERT INTO audit_log (user_id, user_name, action, entity, detail) VALUES (?,?,?,?,?)",
    [req.user.id, req.user.name, 'backup', 'database', 'Database backup downloaded']);
  res.setHeader('Content-Disposition', `attachment; filename=clinic-backup-${new Date().toISOString().slice(0,10)}.db`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

app.post('/api/restore', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const SQL = await initSqlJs();
      const newDb = new SQL.Database(buffer);
      newDb.exec("SELECT COUNT(*) FROM users");
      db = newDb;
      saveDb();
      res.json({ message: 'Database restored successfully' });
    });
  } catch (err) {
    res.status(400).json({ message: 'Invalid database file' });
  }
});

// ── Export CSV ──────────────────────────────────────────────────────────────

app.get('/api/export/:entity', authenticate, (req, res) => {
  const { entity } = req.params;
  let rows, headers;
  switch (entity) {
    case 'patients':
      rows = getAll('SELECT id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, created_at FROM patients ORDER BY id');
      headers = ['ID', 'First Name', 'Last Name', 'Date of Birth', 'Gender', 'Phone', 'Email', 'Address', 'Blood Type', 'Allergies', 'Created At'];
      break;
    case 'appointments':
      rows = getAll(`SELECT a.id, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name, a.scheduled_at, a.duration_minutes, a.status, a.type, a.reason FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id LEFT JOIN users u ON a.doctor_id = u.id ORDER BY a.id`);
      headers = ['ID', 'Patient', 'Doctor', 'Scheduled At', 'Duration (min)', 'Status', 'Type', 'Reason'];
      break;
    case 'payments':
      rows = getAll(`SELECT pay.id, p.first_name || ' ' || p.last_name as patient_name, pay.amount, pay.payment_type, pay.payment_method, pay.status, pay.description, pay.paid_at, pay.created_at FROM payments pay LEFT JOIN patients p ON pay.patient_id = p.id ORDER BY pay.id`);
      headers = ['ID', 'Patient', 'Amount', 'Type', 'Method', 'Status', 'Description', 'Paid At', 'Created At'];
      break;
    default:
      return res.status(400).json({ message: 'Invalid entity' });
  }

  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [headers.join(','), ...rows.map(r => Object.values(r).map(escape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${entity}-${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
});

// ── Password Change ───────────────────────────────────────────────────────

app.post('/api/auth/change-password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ message: 'Current and new password required' });
  if (new_password.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(current_password, user.password)) return res.status(400).json({ message: 'Current password is incorrect' });
  const hash = bcrypt.hashSync(new_password, 10);
  runSql('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
  audit(req, 'update', 'user', req.user.id, 'Password changed');
  res.json({ message: 'Password changed successfully' });
});

// ── Staff Schedules ──────────────────────────────────────────────────────

app.get('/api/schedules', authenticate, (req, res) => {
  const doctorId = req.query.doctor_id;
  let rows;
  if (doctorId) {
    rows = getAll('SELECT s.*, u.name as doctor_name FROM schedules s JOIN users u ON s.doctor_id = u.id WHERE s.doctor_id = ? ORDER BY s.day_of_week, s.start_time', [doctorId]);
  } else {
    rows = getAll('SELECT s.*, u.name as doctor_name FROM schedules s JOIN users u ON s.doctor_id = u.id ORDER BY s.doctor_id, s.day_of_week, s.start_time');
  }
  res.json(rows.map(r => ({ ...r, is_available: !!r.is_available })));
});

app.post('/api/schedules', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { doctor_id, day_of_week, start_time, end_time, is_available } = req.body;
  const id = runSql('INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, is_available) VALUES (?,?,?,?,?)',
    [doctor_id, day_of_week, start_time, end_time, is_available !== false ? 1 : 0]);
  res.status(201).json({ id, ...req.body });
});

app.put('/api/schedules/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { doctor_id, day_of_week, start_time, end_time, is_available } = req.body;
  runSql('UPDATE schedules SET doctor_id=?, day_of_week=?, start_time=?, end_time=?, is_available=? WHERE id=?',
    [doctor_id, day_of_week, start_time, end_time, is_available ? 1 : 0, req.params.id]);
  res.json({ id: Number(req.params.id), ...req.body });
});

app.delete('/api/schedules/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  runSql('DELETE FROM schedules WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Documents (File Attachments) ─────────────────────────────────────────

app.get('/api/patients/:id/documents', authenticate, (req, res) => {
  const rows = getAll('SELECT id, patient_id, name, file_type, file_size, uploaded_by, created_at FROM documents WHERE patient_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json(rows);
});

app.post('/api/patients/:id/documents', authenticate, (req, res) => {
  const { name, file_type, file_size, file_data } = req.body;
  if (!name || !file_data) return res.status(400).json({ message: 'Name and file data required' });
  const id = runSql('INSERT INTO documents (patient_id, name, file_type, file_size, file_data, uploaded_by) VALUES (?,?,?,?,?,?)',
    [req.params.id, name, file_type, file_size, file_data, req.user.id]);
  audit(req, 'create', 'document', id, `Uploaded ${name} for patient #${req.params.id}`);
  res.status(201).json({ id, patient_id: Number(req.params.id), name, file_type, file_size, created_at: new Date().toISOString() });
});

app.get('/api/documents/:id', authenticate, (req, res) => {
  const doc = getOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  res.json(doc);
});

app.delete('/api/documents/:id', authenticate, (req, res) => {
  const doc = getOne('SELECT name, patient_id FROM documents WHERE id = ?', [req.params.id]);
  runSql('DELETE FROM documents WHERE id = ?', [req.params.id]);
  audit(req, 'delete', 'document', Number(req.params.id), doc ? `Deleted ${doc.name}` : '');
  res.json({ message: 'Deleted' });
});

// ── Medication Autocomplete ──────────────────────────────────────────────

const MEDICATIONS = [
  'Acetaminophen','Amoxicillin','Aspirin','Atorvastatin','Azithromycin',
  'Cetirizine','Ciprofloxacin','Clopidogrel','Diclofenac','Doxycycline',
  'Enalapril','Fluoxetine','Furosemide','Ibuprofen','Insulin',
  'Lisinopril','Losartan','Metformin','Metoprolol','Metronidazole',
  'Naproxen','Omeprazole','Pantoprazole','Paracetamol','Prednisolone',
  'Ranitidine','Salbutamol','Sertraline','Simvastatin','Tramadol',
  'Amlodipin','Hydrochlorothiazide','Levothyroxine','Warfarin','Cephalexin',
  'Clindamycin','Gabapentin','Loratadine','Montelukast','Rosuvastatin',
];

app.get('/api/medications', authenticate, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json(MEDICATIONS.slice(0, 20));
  const filtered = MEDICATIONS.filter(m => m.toLowerCase().includes(q));
  res.json(filtered);
});

// ── Visit Templates ──────────────────────────────────────────────────────

app.get('/api/visit-templates', authenticate, (req, res) => {
  const rows = getAll('SELECT * FROM visit_templates ORDER BY name');
  res.json(rows.map(t => ({ ...t, vitals_defaults: t.vitals_defaults ? JSON.parse(t.vitals_defaults) : null })));
});

app.post('/api/visit-templates', authenticate, (req, res) => {
  const { name, category, chief_complaint, diagnosis, notes, vitals_defaults } = req.body;
  const id = runSql('INSERT INTO visit_templates (name, category, chief_complaint, diagnosis, notes, vitals_defaults) VALUES (?,?,?,?,?,?)',
    [name, category, chief_complaint, diagnosis, notes, vitals_defaults ? JSON.stringify(vitals_defaults) : null]);
  res.status(201).json({ id, ...req.body });
});

app.delete('/api/visit-templates/:id', authenticate, (req, res) => {
  runSql('DELETE FROM visit_templates WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Patient Statistics ───────────────────────────────────────────────────

app.get('/api/patients/:id/stats', authenticate, (req, res) => {
  const pid = req.params.id;
  const totalSpend = countSql("SELECT COALESCE(SUM(amount),0) FROM payments WHERE patient_id = ? AND status = 'paid'", [pid]);
  const visitCount = countSql('SELECT COUNT(*) FROM visits WHERE patient_id = ?', [pid]);
  const appointmentCount = countSql('SELECT COUNT(*) FROM appointments WHERE patient_id = ?', [pid]);
  const lastVisit = getOne('SELECT created_at FROM visits WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1', [pid]);
  const lastAppointment = getOne('SELECT scheduled_at FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC LIMIT 1', [pid]);
  const pendingPayments = countSql("SELECT COALESCE(SUM(amount),0) FROM payments WHERE patient_id = ? AND status = 'pending'", [pid]);
  res.json({
    total_spend: totalSpend,
    pending_payments: pendingPayments,
    visit_count: visitCount,
    appointment_count: appointmentCount,
    last_visit: lastVisit?.created_at || null,
    last_appointment: lastAppointment?.scheduled_at || null,
  });
});

// ── Advanced Reports ─────────────────────────────────────────────────────

app.get('/api/reports/financial', authenticate, (req, res) => {
  const { start, end } = req.query;
  const where = start && end ? "WHERE date(created_at) >= ? AND date(created_at) <= ?" : '';
  const params = start && end ? [start, end] : [];
  const totalRevenue = countSql(`SELECT COALESCE(SUM(amount),0) FROM payments ${where.replace('created_at', 'created_at')} AND status = 'paid'`.replace('AND', where ? 'AND' : 'WHERE'), params);
  const totalPending = countSql(`SELECT COALESCE(SUM(amount),0) FROM payments ${where ? where + " AND status = 'pending'" : "WHERE status = 'pending'"}`, params);
  const byType = getAll(`SELECT payment_type, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payments ${where} GROUP BY payment_type`, params);
  const byMethod = getAll(`SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payments ${where} GROUP BY payment_method`, params);
  const daily = getAll(`SELECT date(created_at) as day, COALESCE(SUM(amount),0) as revenue, COUNT(*) as count FROM payments ${where ? where + " AND status = 'paid'" : "WHERE status = 'paid'"} GROUP BY day ORDER BY day`, params);
  res.json({ total_revenue: totalRevenue, total_pending: totalPending, by_type: byType, by_method: byMethod, daily });
});

app.get('/api/reports/clinical', authenticate, (req, res) => {
  const { start, end } = req.query;
  const where = start && end ? "WHERE date(created_at) >= ? AND date(created_at) <= ?" : '';
  const params = start && end ? [start, end] : [];
  const totalVisits = countSql(`SELECT COUNT(*) FROM visits ${where}`, params);
  const byStatus = getAll(`SELECT status, COUNT(*) as count FROM visits ${where} GROUP BY status`, params);
  const totalAppointments = countSql(`SELECT COUNT(*) FROM appointments ${where.replace('created_at', 'scheduled_at')}`, params);
  const apptByStatus = getAll(`SELECT status, COUNT(*) as count FROM appointments ${where.replace('created_at', 'scheduled_at')} GROUP BY status`, params);
  const topDiagnoses = getAll(`SELECT diagnosis, COUNT(*) as count FROM visits ${where ? where + ' AND' : 'WHERE'} diagnosis IS NOT NULL AND diagnosis != '' GROUP BY diagnosis ORDER BY count DESC LIMIT 10`, params);
  res.json({ total_visits: totalVisits, visits_by_status: byStatus, total_appointments: totalAppointments, appointments_by_status: apptByStatus, top_diagnoses: topDiagnoses });
});

// ── Appointment Conflict Detection ───────────────────────────────────────

app.get('/api/appointments/check-conflict', authenticate, (req, res) => {
  const { doctor_id, scheduled_at, duration_minutes, exclude_id } = req.query;
  if (!doctor_id || !scheduled_at) return res.json({ conflict: false });
  const dur = parseInt(duration_minutes) || 30;
  const startTime = new Date(scheduled_at);
  const endTime = new Date(startTime.getTime() + dur * 60000);
  let conflicts = getAll(
    "SELECT * FROM appointments WHERE doctor_id = ? AND status NOT IN ('cancelled','no_show') AND scheduled_at IS NOT NULL",
    [doctor_id]
  );
  if (exclude_id) conflicts = conflicts.filter(a => a.id !== Number(exclude_id));
  const found = conflicts.filter(a => {
    const aStart = new Date(a.scheduled_at);
    const aEnd = new Date(aStart.getTime() + (a.duration_minutes || 30) * 60000);
    return startTime < aEnd && endTime > aStart;
  });
  res.json({ conflict: found.length > 0, conflicts: found.map(formatAppointment) });
});

// ── Email Appointment Reminder (Mock) ────────────────────────────────────

app.post('/api/appointments/:id/remind', authenticate, (req, res) => {
  const apt = getOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!apt) return res.status(404).json({ message: 'Appointment not found' });
  const patient = getOne('SELECT * FROM patients WHERE id = ?', [apt.patient_id]);
  const doctor = apt.doctor_id ? getOne('SELECT name FROM users WHERE id = ?', [apt.doctor_id]) : null;
  const email = patient?.email;
  audit(req, 'create', 'reminder', apt.id, `Reminder sent to ${patient?.first_name} ${patient?.last_name} (${email || 'no email'})`);
  if (patient) notify(req.user.id, 'Reminder Sent', `Appointment reminder sent to ${patient.first_name} ${patient.last_name}`, 'info');
  res.json({
    sent: true,
    mock: true,
    to: email || 'no-email@example.com',
    subject: `Appointment Reminder — ${apt.type}`,
    body: `Dear ${patient?.first_name || 'Patient'},\n\nThis is a reminder for your upcoming appointment:\n\nDate: ${apt.scheduled_at}\nDoctor: Dr. ${doctor?.name || 'N/A'}\nType: ${apt.type}\nDuration: ${apt.duration_minutes} minutes\n\nPlease arrive 10 minutes early.\n\nBest regards,\nModern Clinic`,
  });
});

// ── Data Seeding Tool ────────────────────────────────────────────────────

app.post('/api/seed', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const count = Math.min(parseInt(req.body.count) || 20, 100);
  const firstNames = ['Mohammed','Fatima','Youssef','Amina','Omar','Khadija','Hassan','Layla','Karim','Sara','Ali','Nour','Rachid','Salma','Amine','Houda','Mehdi','Zineb','Hamza','Meryem'];
  const lastNames = ['Alaoui','Benali','Tazi','El Idrissi','Amrani','Benjelloun','Fassi','Lahlou','Berrada','Chaoui','Ziani','Kabbaj','Sqalli','Sebti','Filali'];
  const genders = ['male', 'female'];
  const bloodTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const types = ['consultation','follow_up','checkup','emergency'];
  const reasons = ['Routine checkup','Follow-up visit','Chest pain','Headache','Back pain','Skin rash','Fever','Cough','Joint pain','Fatigue'];

  let patientsCreated = 0, appointmentsCreated = 0, paymentsCreated = 0;

  for (let i = 0; i < count; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const dob = `${1960 + Math.floor(Math.random() * 50)}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}-${String(1+Math.floor(Math.random()*28)).padStart(2,'0')}`;
    const phone = `+2126${String(Math.floor(Math.random()*100000000)).padStart(8,'0')}`;
    const bt = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
    const pid = runSql('INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, blood_type) VALUES (?,?,?,?,?,?)', [fn, ln, dob, gender, phone, bt]);
    patientsCreated++;

    const apptCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < apptCount; j++) {
      const daysOffset = -Math.floor(Math.random() * 60);
      const hour = 8 + Math.floor(Math.random() * 10);
      const d = new Date(); d.setDate(d.getDate() + daysOffset); d.setHours(hour, 0, 0, 0);
      const docId = Math.random() > 0.5 ? 2 : 3;
      const t = types[Math.floor(Math.random() * types.length)];
      const r = reasons[Math.floor(Math.random() * reasons.length)];
      const st = daysOffset < -7 ? 'completed' : 'scheduled';
      runSql('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason) VALUES (?,?,?,?,?,?,?)',
        [pid, docId, d.toISOString().slice(0,16), 30, st, t, r]);
      appointmentsCreated++;
    }

    if (Math.random() > 0.3) {
      const amount = Math.round((100 + Math.random() * 900) * 100) / 100;
      const pst = Math.random() > 0.4 ? 'paid' : 'pending';
      runSql("INSERT INTO payments (patient_id, amount, payment_type, payment_method, status, description) VALUES (?,?,?,?,?,?)",
        [pid, amount, 'consultation', Math.random() > 0.5 ? 'cash' : 'card', pst, 'Auto-generated']);
      paymentsCreated++;
    }
  }
  audit(req, 'create', 'seed', null, `Seeded ${patientsCreated} patients, ${appointmentsCreated} appointments, ${paymentsCreated} payments`);
  res.json({ message: `Seeded ${patientsCreated} patients, ${appointmentsCreated} appointments, ${paymentsCreated} payments` });
});

// ── Inventory ─────────────────────────────────────────────────────────────

app.get('/api/inventory', authenticate, (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  const lowStock = req.query.low_stock === '1';
  let where = [], params = [];
  if (search) { where.push("(name LIKE ? OR sku LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (category) { where.push("category = ?"); params.push(category); }
  if (lowStock) { where.push("quantity <= min_quantity"); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  res.json(paginate(`SELECT * FROM inventory ${w} ORDER BY name`, `SELECT COUNT(*) FROM inventory ${w}`, params, req, (r) => ({ ...r, is_low_stock: r.quantity <= r.min_quantity })));
});

app.get('/api/inventory/:id', authenticate, (req, res) => {
  const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  const transactions = getAll('SELECT t.*, u.name as user_name FROM inventory_transactions t LEFT JOIN users u ON t.created_by = u.id WHERE t.item_id = ? ORDER BY t.created_at DESC LIMIT 20', [req.params.id]);
  res.json({ ...item, is_low_stock: item.quantity <= item.min_quantity, transactions });
});

app.post('/api/inventory', authenticate, (req, res) => {
  const { name, category, sku, quantity, min_quantity, unit, unit_price, supplier, expiry_date, notes } = req.body;
  const id = runSql('INSERT INTO inventory (name, category, sku, quantity, min_quantity, unit, unit_price, supplier, expiry_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [name, category || 'medication', sku, quantity || 0, min_quantity || 10, unit || 'units', unit_price || 0, supplier, expiry_date, notes]);
  if (quantity > 0) runSql('INSERT INTO inventory_transactions (item_id, type, quantity, reason, created_by) VALUES (?,?,?,?,?)', [id, 'in', quantity, 'Initial stock', req.user.id]);
  audit(req, 'create', 'inventory', id, name);
  res.status(201).json(getOne('SELECT * FROM inventory WHERE id = ?', [id]));
});

app.put('/api/inventory/:id', authenticate, (req, res) => {
  const { name, category, sku, min_quantity, unit, unit_price, supplier, expiry_date, notes } = req.body;
  runSql("UPDATE inventory SET name=?, category=?, sku=?, min_quantity=?, unit=?, unit_price=?, supplier=?, expiry_date=?, notes=?, updated_at=datetime('now') WHERE id=?",
    [name, category, sku, min_quantity, unit, unit_price, supplier, expiry_date, notes, req.params.id]);
  const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
});

app.post('/api/inventory/:id/adjust', authenticate, (req, res) => {
  const { type, quantity, reason } = req.body;
  const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  const newQty = type === 'in' ? item.quantity + quantity : item.quantity - quantity;
  if (newQty < 0) return res.status(400).json({ message: 'Insufficient stock' });
  runSql("UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ?", [newQty, req.params.id]);
  runSql('INSERT INTO inventory_transactions (item_id, type, quantity, reason, created_by) VALUES (?,?,?,?,?)', [req.params.id, type, quantity, reason, req.user.id]);
  audit(req, type === 'in' ? 'create' : 'update', 'inventory', Number(req.params.id), `${type === 'in' ? 'Added' : 'Removed'} ${quantity} ${item.unit} of ${item.name}`);
  res.json({ ...item, quantity: newQty });
});

app.delete('/api/inventory/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const item = getOne('SELECT name FROM inventory WHERE id = ?', [req.params.id]);
  runSql('DELETE FROM inventory_transactions WHERE item_id = ?', [req.params.id]);
  runSql('DELETE FROM inventory WHERE id = ?', [req.params.id]);
  audit(req, 'delete', 'inventory', Number(req.params.id), item?.name || '');
  res.json({ message: 'Deleted' });
});

app.get('/api/inventory/alerts/low-stock', authenticate, (req, res) => {
  const items = getAll('SELECT * FROM inventory WHERE quantity <= min_quantity ORDER BY quantity ASC');
  res.json(items);
});

// ── Payroll ───────────────────────────────────────────────────────────────

app.get('/api/payroll', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const month = req.query.month || '';
  let where = [], params = [];
  if (month) { where.push('p.month = ?'); params.push(month); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT p.*, u.name as employee_name, u.role as employee_role FROM payroll p JOIN users u ON p.employee_id = u.id ${w} ORDER BY p.month DESC, u.name`, params);
  res.json(rows);
});

app.post('/api/payroll', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const { employee_id, month, base_salary, bonus, deductions, notes } = req.body;
  const net = (base_salary || 0) + (bonus || 0) - (deductions || 0);
  const id = runSql('INSERT INTO payroll (employee_id, month, base_salary, bonus, deductions, net_salary, notes) VALUES (?,?,?,?,?,?,?)',
    [employee_id, month, base_salary, bonus || 0, deductions || 0, net, notes]);
  audit(req, 'create', 'payroll', id, `Payroll for employee #${employee_id} — ${month}`);
  res.status(201).json({ id, employee_id, month, base_salary, bonus, deductions, net_salary: net, status: 'pending' });
});

app.put('/api/payroll/:id', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const { base_salary, bonus, deductions, notes } = req.body;
  const net = (base_salary || 0) + (bonus || 0) - (deductions || 0);
  runSql('UPDATE payroll SET base_salary=?, bonus=?, deductions=?, net_salary=?, notes=? WHERE id=?',
    [base_salary, bonus || 0, deductions || 0, net, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

app.patch('/api/payroll/:id/pay', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  runSql("UPDATE payroll SET status = 'paid', paid_at = datetime('now') WHERE id = ?", [req.params.id]);
  audit(req, 'update', 'payroll', Number(req.params.id), 'Marked as paid');
  res.json({ message: 'Marked as paid' });
});

// ── Lab Orders ────────────────────────────────────────────────────────────

app.get('/api/lab-orders', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  let where = [], params = [];
  if (patientId) { where.push('l.patient_id = ?'); params.push(patientId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT l.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM lab_orders l LEFT JOIN patients p ON l.patient_id = p.id LEFT JOIN users u ON l.doctor_id = u.id ${w} ORDER BY l.created_at DESC`, params);
  res.json(rows);
});

app.post('/api/lab-orders', authenticate, (req, res) => {
  const { patient_id, doctor_id, visit_id, test_name, notes } = req.body;
  const id = runSql('INSERT INTO lab_orders (patient_id, doctor_id, visit_id, test_name, notes) VALUES (?,?,?,?,?)',
    [patient_id, doctor_id || req.user.id, visit_id || null, test_name, notes || null]);
  audit(req, 'create', 'lab_order', id, test_name);
  res.status(201).json({ id, patient_id, test_name, status: 'ordered', created_at: new Date().toISOString() });
});

app.patch('/api/lab-orders/:id', authenticate, (req, res) => {
  const { status, result, result_date } = req.body;
  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (result !== undefined) { updates.push('result = ?'); params.push(result); }
  if (result_date) { updates.push('result_date = ?'); params.push(result_date); }
  if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  params.push(req.params.id);
  runSql(`UPDATE lab_orders SET ${updates.join(', ')} WHERE id = ?`, params);
  const order = getOne('SELECT * FROM lab_orders WHERE id = ?', [req.params.id]);
  res.json(order);
});

// ── Vaccinations ──────────────────────────────────────────────────────────

app.get('/api/vaccinations', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  if (!patientId) return res.json([]);
  const rows = getAll('SELECT v.*, u.name as administered_by_name FROM vaccinations v LEFT JOIN users u ON v.administered_by = u.id WHERE v.patient_id = ? ORDER BY v.administered_at DESC', [patientId]);
  res.json(rows);
});

app.post('/api/vaccinations', authenticate, (req, res) => {
  const { patient_id, vaccine_name, dose_number, administered_at, next_dose_date, batch_number, notes } = req.body;
  const id = runSql('INSERT INTO vaccinations (patient_id, vaccine_name, dose_number, administered_at, next_dose_date, administered_by, batch_number, notes) VALUES (?,?,?,?,?,?,?,?)',
    [patient_id, vaccine_name, dose_number || 1, administered_at || new Date().toISOString(), next_dose_date || null, req.user.id, batch_number || null, notes || null]);
  audit(req, 'create', 'vaccination', id, `${vaccine_name} for patient #${patient_id}`);
  res.status(201).json({ id, patient_id, vaccine_name, dose_number, status: 'administered' });
});

app.delete('/api/vaccinations/:id', authenticate, (req, res) => {
  runSql('DELETE FROM vaccinations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Referrals ─────────────────────────────────────────────────────────────

app.get('/api/referrals', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  let where = [], params = [];
  if (patientId) { where.push('r.patient_id = ?'); params.push(patientId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT r.*, p.first_name || ' ' || p.last_name as patient_name, u1.name as referring_doctor_name, u2.name as referred_to_name FROM referrals r LEFT JOIN patients p ON r.patient_id = p.id LEFT JOIN users u1 ON r.referring_doctor_id = u1.id LEFT JOIN users u2 ON r.referred_to_doctor_id = u2.id ${w} ORDER BY r.created_at DESC`, params);
  res.json(rows);
});

app.post('/api/referrals', authenticate, (req, res) => {
  const { patient_id, referring_doctor_id, referred_to_doctor_id, reason, priority, notes } = req.body;
  const id = runSql('INSERT INTO referrals (patient_id, referring_doctor_id, referred_to_doctor_id, reason, priority, notes) VALUES (?,?,?,?,?,?)',
    [patient_id, referring_doctor_id || req.user.id, referred_to_doctor_id || null, reason, priority || 'normal', notes || null]);
  audit(req, 'create', 'referral', id, `Referral for patient #${patient_id}`);
  res.status(201).json({ id, patient_id, reason, status: 'pending', priority });
});

app.patch('/api/referrals/:id', authenticate, (req, res) => {
  const { status, outcome, notes } = req.body;
  const updates = [], params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (outcome !== undefined) { updates.push('outcome = ?'); params.push(outcome); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  params.push(req.params.id);
  runSql(`UPDATE referrals SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Updated' });
});

// ── Expenses ──────────────────────────────────────────────────────────────

app.get('/api/expenses', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const { start, end, category } = req.query;
  let where = [], params = [];
  if (start && end) { where.push('date >= ? AND date <= ?'); params.push(start, end); }
  if (category) { where.push('category = ?'); params.push(category); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT e.*, u.name as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ${w} ORDER BY e.date DESC`, params);
  const total = countSql(`SELECT COALESCE(SUM(amount), 0) FROM expenses ${w}`, params);
  res.json({ expenses: rows, total });
});

app.post('/api/expenses', authenticate, (req, res) => {
  if (!['admin', 'accountant'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const { category, description, amount, date, receipt_ref } = req.body;
  const id = runSql('INSERT INTO expenses (category, description, amount, date, receipt_ref, created_by) VALUES (?,?,?,?,?,?)',
    [category, description, amount, date, receipt_ref || null, req.user.id]);
  audit(req, 'create', 'expense', id, `${category}: ${amount} MAD`);
  res.status(201).json({ id, category, description, amount, date });
});

app.delete('/api/expenses/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  runSql('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Leaves ─────────────────────────────────────────────────────────────────

app.get('/api/leaves', authenticate, (req, res) => {
  const employeeId = req.query.employee_id;
  const leaveType = req.query.leave_type;
  const status = req.query.status;
  let where = [], params = [];
  if (employeeId) { where.push('l.employee_id = ?'); params.push(employeeId); }
  if (leaveType) { where.push('l.type = ?'); params.push(leaveType); }
  if (status) { where.push('l.status = ?'); params.push(status); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT l.*, l.type as leave_type, u.name as employee_name, a.name as approved_by_name FROM leaves l JOIN users u ON l.employee_id = u.id LEFT JOIN users a ON l.approved_by = a.id ${w} ORDER BY l.start_date DESC`, params);
  res.json(rows);
});

app.post('/api/leaves', authenticate, (req, res) => {
  const { employee_id, type, leave_type, start_date, end_date, reason } = req.body;
  const id = runSql('INSERT INTO leaves (employee_id, type, start_date, end_date, reason) VALUES (?,?,?,?,?)',
    [employee_id || req.user.id, type || leave_type || 'annual', start_date, end_date, reason || null]);
  res.status(201).json({ id, employee_id, type, start_date, end_date, status: 'pending' });
});

app.patch('/api/leaves/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { status } = req.body;
  runSql('UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?', [status, req.user.id, req.params.id]);
  audit(req, 'update', 'leave', Number(req.params.id), `Leave ${status}`);
  res.json({ message: 'Updated' });
});

// ── Bulk Notifications ────────────────────────────────────────────────────

app.post('/api/notifications/bulk', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { title, message, patient_ids, type } = req.body;
  const patients = patient_ids && patient_ids.length > 0
    ? getAll(`SELECT * FROM patients WHERE id IN (${patient_ids.map(() => '?').join(',')})`, patient_ids)
    : getAll('SELECT * FROM patients');
  let sent = 0;
  for (const p of patients) {
    sent++;
  }
  audit(req, 'create', 'bulk_notification', null, `Sent "${title}" to ${sent} patients`);
  notifyAll(title || 'Clinic Announcement', message, type || 'info');
  res.json({ sent, message: `Notification sent to ${sent} patients (mock)`, mock_emails: patients.slice(0, 5).map(p => ({ to: p.email || `${p.first_name.toLowerCase()}@example.com`, name: `${p.first_name} ${p.last_name}` })) });
});

// ── Patient Portal (check-in + patient-facing data) ──────────────────────

app.post('/api/checkin/:token', (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET);
    if (decoded.type !== 'checkin') return res.status(400).json({ message: 'Invalid token' });
    const apt = getOne('SELECT * FROM appointments WHERE id = ?', [decoded.appointment_id]);
    if (!apt) return res.status(404).json({ message: 'Appointment not found' });
    runSql("UPDATE appointments SET status = 'arrived' WHERE id = ?", [apt.id]);
    const patient = getOne('SELECT first_name, last_name FROM patients WHERE id = ?', [apt.patient_id]);
    notifyAll('Patient Checked In', `${patient?.first_name} ${patient?.last_name} has checked in`, 'appointment');
    res.json({ message: 'Checked in successfully', patient_name: `${patient?.first_name} ${patient?.last_name}` });
  } catch {
    res.status(400).json({ message: 'Invalid or expired QR code' });
  }
});

app.get('/api/appointments/:id/qr-token', authenticate, (req, res) => {
  const apt = getOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!apt) return res.status(404).json({ message: 'Appointment not found' });
  const token = jwt.sign({ type: 'checkin', appointment_id: apt.id, patient_id: apt.patient_id }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, url: `/checkin?token=${token}` });
});

app.get('/api/portal/patient', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'patient') return res.status(403).json({ message: 'Not a patient token' });
    const patient = getOne('SELECT * FROM patients WHERE id = ?', [decoded.patient_id]);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const appointments = getAll("SELECT a.*, u.name as doctor_name FROM appointments a LEFT JOIN users u ON a.doctor_id = u.id WHERE a.patient_id = ? ORDER BY a.scheduled_at DESC LIMIT 20", [patient.id]);
    const prescriptions = getAll("SELECT p.*, u.name as doctor_name FROM prescriptions p LEFT JOIN users u ON p.doctor_id = u.id WHERE p.patient_id = ? ORDER BY p.created_at DESC LIMIT 10", [patient.id]).map(p => {
      p.items = getAll('SELECT * FROM prescription_items WHERE prescription_id = ?', [p.id]);
      return p;
    });
    const payments = getAll("SELECT * FROM payments WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20", [patient.id]);
    res.json({ patient: formatPatient(patient), appointments, prescriptions, payments });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

app.post('/api/portal/login', (req, res) => {
  const { phone } = req.body;
  const patient = getOne('SELECT * FROM patients WHERE phone = ?', [phone]);
  if (!patient) return res.status(404).json({ message: 'No patient found with this phone number' });
  const token = jwt.sign({ type: 'patient', patient_id: patient.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, patient: formatPatient(patient) });
});

// ── Waiting Room ──────────────────────────────────────────────────────────

app.get('/api/waiting-room', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const queue = getAll(
    "SELECT a.*, p.first_name, p.last_name, u.name as doctor_name FROM appointments a JOIN patients p ON a.patient_id = p.id LEFT JOIN users u ON a.doctor_id = u.id WHERE date(a.scheduled_at) = ? AND a.status IN ('arrived', 'confirmed', 'scheduled') ORDER BY CASE a.status WHEN 'arrived' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END, a.scheduled_at ASC",
    [today]
  );
  const inProgress = getAll(
    "SELECT v.*, p.first_name, p.last_name, u.name as doctor_name FROM visits v JOIN patients p ON v.patient_id = p.id LEFT JOIN users u ON v.doctor_id = u.id WHERE v.status = 'in_progress' AND date(v.created_at) = ?",
    [today]
  );
  res.json({ queue: queue.map(a => ({ ...a, patient_name: `${a.first_name} ${a.last_name}`, estimated_wait: null })), in_progress: inProgress.map(v => ({ ...v, patient_name: `${v.first_name} ${v.last_name}` })) });
});

// ── Doctor Performance ────────────────────────────────────────────────────

app.get('/api/analytics/doctor-performance', authenticate, (req, res) => {
  const doctors = getAll("SELECT id, name, specialty FROM users WHERE role = 'doctor' AND is_active = 1");
  const result = doctors.map(doc => {
    const totalAppointments = countSql('SELECT COUNT(*) FROM appointments WHERE doctor_id = ?', [doc.id]);
    const completedVisits = countSql("SELECT COUNT(*) FROM visits WHERE doctor_id = ? AND status = 'completed'", [doc.id]);
    const revenue = countSql("SELECT COALESCE(SUM(pay.amount),0) FROM payments pay JOIN appointments a ON pay.appointment_id = a.id WHERE a.doctor_id = ? AND pay.status = 'paid'", [doc.id]);
    const avgDuration = getOne("SELECT AVG(CAST((julianday(completed_at) - julianday(started_at)) * 1440 AS INTEGER)) as avg_min FROM visits WHERE doctor_id = ? AND completed_at IS NOT NULL", [doc.id]);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthAppointments = countSql("SELECT COUNT(*) FROM appointments WHERE doctor_id = ? AND strftime('%Y-%m', scheduled_at) = ?", [doc.id, thisMonth]);
    const patientsSeen = countSql('SELECT COUNT(DISTINCT patient_id) FROM visits WHERE doctor_id = ?', [doc.id]);
    return {
      ...doc,
      total_appointments: totalAppointments,
      completed_visits: completedVisits,
      revenue,
      avg_visit_duration: Math.round(avgDuration?.avg_min || 0),
      month_appointments: monthAppointments,
      patients_seen: patientsSeen,
    };
  });
  res.json(result);
});

// ── User/Staff Management ────────────────────────────────────────────────────

app.get('/api/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const role = req.query.role;
  const status = req.query.status;
  let where = [], params = [];
  if (role) { where.push('role = ?'); params.push(role); }
  if (status === 'active') { where.push('is_active = 1'); }
  if (status === 'inactive') { where.push('is_active = 0'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT id, name, email, role, avatar, is_active, specialty, phone, license_number, hire_date FROM users ${w} ORDER BY name`, params);
  res.json(rows);
});

app.post('/api/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, email, password, role, specialty, phone, license_number, hire_date } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
  const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ message: 'Email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const id = runSql('INSERT INTO users (name, email, password, role, specialty, phone, license_number, hire_date) VALUES (?,?,?,?,?,?,?,?)',
    [name, email, hash, role || 'doctor', specialty || null, phone || null, license_number || null, hire_date || null]);
  audit(req, 'create', 'user', id, `${name} (${role || 'doctor'})`);
  res.status(201).json({ id, name, email, role: role || 'doctor' });
});

app.put('/api/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, email, role, specialty, phone, license_number, hire_date, is_active } = req.body;
  const updates = [], params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (specialty !== undefined) { updates.push('specialty = ?'); params.push(specialty); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (license_number !== undefined) { updates.push('license_number = ?'); params.push(license_number); }
  if (hire_date !== undefined) { updates.push('hire_date = ?'); params.push(hire_date); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  params.push(req.params.id);
  runSql(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const user = getOne('SELECT id, name, email, role, is_active, specialty, phone, license_number, hire_date FROM users WHERE id = ?', [req.params.id]);
  audit(req, 'update', 'user', Number(req.params.id), `Updated ${user?.name}`);
  res.json(user);
});

app.patch('/api/users/:id/reset-password', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });
  const hash = bcrypt.hashSync(password, 10);
  runSql('UPDATE users SET password = ? WHERE id = ?', [hash, req.params.id]);
  audit(req, 'reset_password', 'user', Number(req.params.id), 'Password reset by admin');
  res.json({ message: 'Password reset successfully' });
});

// ── Medical History Timeline ─────────────────────────────────────────────────

app.get('/api/patients/:id/timeline', authenticate, (req, res) => {
  const pid = req.params.id;
  const events = [];

  const visits = getAll('SELECT v.id, v.chief_complaint, v.diagnosis, v.status, v.created_at, u.name as doctor_name FROM visits v LEFT JOIN users u ON v.doctor_id = u.id WHERE v.patient_id = ? ORDER BY v.created_at DESC', [pid]);
  visits.forEach(v => events.push({ type: 'visit', id: v.id, title: v.chief_complaint || 'Visit', detail: v.diagnosis, status: v.status, doctor: v.doctor_name, date: v.created_at }));

  const appointments = getAll('SELECT a.id, a.type, a.reason, a.status, a.scheduled_at, u.name as doctor_name FROM appointments a LEFT JOIN users u ON a.doctor_id = u.id WHERE a.patient_id = ? ORDER BY a.scheduled_at DESC', [pid]);
  appointments.forEach(a => events.push({ type: 'appointment', id: a.id, title: a.reason || a.type, detail: a.type, status: a.status, doctor: a.doctor_name, date: a.scheduled_at }));

  const prescriptions = getAll('SELECT p.id, p.notes, p.is_active, p.created_at, u.name as doctor_name FROM prescriptions p LEFT JOIN users u ON p.doctor_id = u.id WHERE p.patient_id = ? ORDER BY p.created_at DESC', [pid]);
  prescriptions.forEach(p => events.push({ type: 'prescription', id: p.id, title: 'Prescription', detail: p.notes, status: p.is_active ? 'active' : 'inactive', doctor: p.doctor_name, date: p.created_at }));

  const labs = getAll('SELECT l.id, l.test_name, l.status, l.result, l.created_at, u.name as doctor_name FROM lab_orders l LEFT JOIN users u ON l.doctor_id = u.id WHERE l.patient_id = ? ORDER BY l.created_at DESC', [pid]);
  labs.forEach(l => events.push({ type: 'lab', id: l.id, title: l.test_name, detail: l.result, status: l.status, doctor: l.doctor_name, date: l.created_at }));

  const vaccinations = getAll('SELECT v.id, v.vaccine_name, v.dose_number, v.administered_at, u.name as administered_by_name FROM vaccinations v LEFT JOIN users u ON v.administered_by = u.id WHERE v.patient_id = ? ORDER BY v.administered_at DESC', [pid]);
  vaccinations.forEach(v => events.push({ type: 'vaccination', id: v.id, title: `${v.vaccine_name} (Dose ${v.dose_number})`, detail: null, status: 'administered', doctor: v.administered_by_name, date: v.administered_at }));

  const referrals = getAll('SELECT r.id, r.reason, r.status, r.priority, r.created_at, u.name as doctor_name FROM referrals r LEFT JOIN users u ON r.referring_doctor_id = u.id WHERE r.patient_id = ? ORDER BY r.created_at DESC', [pid]);
  referrals.forEach(r => events.push({ type: 'referral', id: r.id, title: r.reason, detail: `Priority: ${r.priority}`, status: r.status, doctor: r.doctor_name, date: r.created_at }));

  const payments = getAll('SELECT id, amount, payment_type, status, paid_at, created_at FROM payments WHERE patient_id = ? ORDER BY created_at DESC', [pid]);
  payments.forEach(p => events.push({ type: 'payment', id: p.id, title: `${p.amount} MAD - ${p.payment_type}`, detail: null, status: p.status, doctor: null, date: p.paid_at || p.created_at }));

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(events);
});

// ── Medical Certificates ─────────────────────────────────────────────────────

app.get('/api/certificates', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  let where = [], params = [];
  if (patientId) { where.push('c.patient_id = ?'); params.push(patientId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT c.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM certificates c LEFT JOIN patients p ON c.patient_id = p.id LEFT JOIN users u ON c.doctor_id = u.id ${w} ORDER BY c.created_at DESC`, params);
  res.json(rows);
});

app.get('/api/certificates/:id', authenticate, (req, res) => {
  const cert = getOne("SELECT c.*, p.first_name || ' ' || p.last_name as patient_name, p.date_of_birth, p.phone, u.name as doctor_name, u.specialty as doctor_specialty, u.license_number FROM certificates c LEFT JOIN patients p ON c.patient_id = p.id LEFT JOIN users u ON c.doctor_id = u.id WHERE c.id = ?", [req.params.id]);
  if (!cert) return res.status(404).json({ message: 'Not found' });
  res.json(cert);
});

app.post('/api/certificates', authenticate, (req, res) => {
  const { patient_id, visit_id, type, diagnosis, start_date, end_date, notes } = req.body;
  const id = runSql('INSERT INTO certificates (patient_id, doctor_id, visit_id, type, diagnosis, start_date, end_date, notes) VALUES (?,?,?,?,?,?,?,?)',
    [patient_id, req.user.id, visit_id || null, type || 'medical', diagnosis || null, start_date || null, end_date || null, notes || null]);
  audit(req, 'create', 'certificate', id, `${type} for patient #${patient_id}`);
  res.status(201).json({ id, patient_id, type, created_at: new Date().toISOString() });
});

app.delete('/api/certificates/:id', authenticate, (req, res) => {
  runSql('DELETE FROM certificates WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Treatment Plans ──────────────────────────────────────────────────────────

app.get('/api/treatment-plans', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  let where = [], params = [];
  if (patientId) { where.push('t.patient_id = ?'); params.push(patientId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT t.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM treatment_plans t LEFT JOIN patients p ON t.patient_id = p.id LEFT JOIN users u ON t.doctor_id = u.id ${w} ORDER BY t.created_at DESC`, params);
  rows.forEach(plan => {
    plan.steps = getAll('SELECT * FROM treatment_plan_steps WHERE plan_id = ? ORDER BY order_num', [plan.id]);
  });
  res.json(rows);
});

app.get('/api/treatment-plans/:id', authenticate, (req, res) => {
  const plan = getOne("SELECT t.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM treatment_plans t LEFT JOIN patients p ON t.patient_id = p.id LEFT JOIN users u ON t.doctor_id = u.id WHERE t.id = ?", [req.params.id]);
  if (!plan) return res.status(404).json({ message: 'Not found' });
  plan.steps = getAll('SELECT * FROM treatment_plan_steps WHERE plan_id = ? ORDER BY order_num', [plan.id]);
  res.json(plan);
});

app.post('/api/treatment-plans', authenticate, (req, res) => {
  const { patient_id, title, description, start_date, end_date, steps } = req.body;
  const id = runSql('INSERT INTO treatment_plans (patient_id, doctor_id, title, description, start_date, end_date) VALUES (?,?,?,?,?,?)',
    [patient_id, req.user.id, title, description || null, start_date || null, end_date || null]);
  if (steps && Array.isArray(steps)) {
    steps.forEach((step, i) => {
      runSql('INSERT INTO treatment_plan_steps (plan_id, title, description, due_date, order_num) VALUES (?,?,?,?,?)',
        [id, step.title, step.description || null, step.due_date || null, i]);
    });
  }
  audit(req, 'create', 'treatment_plan', id, title);
  const plan = getOne('SELECT * FROM treatment_plans WHERE id = ?', [id]);
  plan.steps = getAll('SELECT * FROM treatment_plan_steps WHERE plan_id = ? ORDER BY order_num', [id]);
  res.status(201).json(plan);
});

app.put('/api/treatment-plans/:id', authenticate, (req, res) => {
  const { title, description, status, start_date, end_date } = req.body;
  const updates = [], params = [];
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
  if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
  if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  params.push(req.params.id);
  runSql(`UPDATE treatment_plans SET ${updates.join(', ')} WHERE id = ?`, params);
  const plan = getOne('SELECT * FROM treatment_plans WHERE id = ?', [req.params.id]);
  plan.steps = getAll('SELECT * FROM treatment_plan_steps WHERE plan_id = ? ORDER BY order_num', [plan.id]);
  res.json(plan);
});

app.post('/api/treatment-plans/:id/steps', authenticate, (req, res) => {
  const { title, description, due_date } = req.body;
  const maxOrder = getOne('SELECT MAX(order_num) as m FROM treatment_plan_steps WHERE plan_id = ?', [req.params.id]);
  const order = (maxOrder?.m ?? -1) + 1;
  const id = runSql('INSERT INTO treatment_plan_steps (plan_id, title, description, due_date, order_num) VALUES (?,?,?,?,?)',
    [req.params.id, title, description || null, due_date || null, order]);
  res.status(201).json({ id, plan_id: Number(req.params.id), title, status: 'pending', order_num: order });
});

app.patch('/api/treatment-plan-steps/:id', authenticate, (req, res) => {
  const { status, title, description, due_date } = req.body;
  const updates = [], params = [];
  if (status !== undefined) {
    updates.push('status = ?'); params.push(status);
    if (status === 'completed') { updates.push("completed_at = datetime('now')"); }
  }
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
  params.push(req.params.id);
  runSql(`UPDATE treatment_plan_steps SET ${updates.join(', ')} WHERE id = ?`, params);
  const step = getOne('SELECT * FROM treatment_plan_steps WHERE id = ?', [req.params.id]);
  res.json(step);
});

app.delete('/api/treatment-plan-steps/:id', authenticate, (req, res) => {
  runSql('DELETE FROM treatment_plan_steps WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── Internal Staff Chat ──────────────────────────────────────────────────────

app.get('/api/messages/conversations', authenticate, (req, res) => {
  const userId = req.user.id;
  const convos = getAll(`
    SELECT u.id, u.name, u.role, u.avatar,
      (SELECT content FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
    FROM users u WHERE u.id != ? AND u.is_active = 1
    ORDER BY last_message_at DESC NULLS LAST, u.name
  `, [userId, userId, userId, userId, userId, userId]);
  res.json(convos);
});

app.get('/api/messages/:userId', authenticate, (req, res) => {
  const myId = req.user.id;
  const otherId = req.params.userId;
  const messages = getAll('SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC', [myId, otherId, otherId, myId]);
  runSql('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0', [otherId, myId]);
  res.json(messages);
});

app.post('/api/messages', authenticate, (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content) return res.status(400).json({ message: 'Receiver and content required' });
  const id = runSql('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?,?,?)',
    [req.user.id, receiver_id, content]);
  const msg = getOne('SELECT * FROM messages WHERE id = ?', [id]);
  res.status(201).json(msg);
});

app.get('/api/messages/unread/count', authenticate, (req, res) => {
  const row = getOne('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0', [req.user.id]);
  res.json({ count: row?.count || 0 });
});

// ── Patient Satisfaction Surveys ─────────────────────────────────────────────

app.get('/api/surveys', authenticate, (req, res) => {
  const patientId = req.query.patient_id;
  const doctorId = req.query.doctor_id;
  let where = [], params = [];
  if (patientId) { where.push('s.patient_id = ?'); params.push(patientId); }
  if (doctorId) { where.push('s.doctor_id = ?'); params.push(doctorId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT s.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM surveys s LEFT JOIN patients p ON s.patient_id = p.id LEFT JOIN users u ON s.doctor_id = u.id ${w} ORDER BY s.created_at DESC`, params);
  res.json(rows);
});

app.post('/api/surveys', authenticate, (req, res) => {
  const { visit_id, patient_id, doctor_id, rating, feedback } = req.body;
  if (!patient_id || !rating) return res.status(400).json({ message: 'Patient and rating required' });
  const id = runSql('INSERT INTO surveys (visit_id, patient_id, doctor_id, rating, feedback) VALUES (?,?,?,?,?)',
    [visit_id || null, patient_id, doctor_id || null, rating, feedback || null]);
  res.status(201).json({ id, patient_id, rating, created_at: new Date().toISOString() });
});

app.get('/api/surveys/analytics', authenticate, (req, res) => {
  const total = getOne('SELECT COUNT(*) as count FROM surveys', []);
  const avg = getOne('SELECT AVG(rating) as avg_rating FROM surveys', []);
  const distribution = getAll('SELECT rating, COUNT(*) as count FROM surveys GROUP BY rating ORDER BY rating', []);
  const byDoctor = getAll("SELECT u.name as doctor_name, AVG(s.rating) as avg_rating, COUNT(*) as count FROM surveys s JOIN users u ON s.doctor_id = u.id GROUP BY s.doctor_id ORDER BY avg_rating DESC", []);
  const recent = getAll("SELECT s.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM surveys s LEFT JOIN patients p ON s.patient_id = p.id LEFT JOIN users u ON s.doctor_id = u.id ORDER BY s.created_at DESC LIMIT 10", []);
  res.json({
    total: total?.count || 0,
    avg_rating: avg?.avg_rating ? Math.round(avg.avg_rating * 10) / 10 : 0,
    distribution,
    by_doctor: byDoctor,
    recent,
  });
});

// ── Advanced Global Search ───────────────────────────────────────────────────

app.get('/api/search', authenticate, (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.json({ patients: [], appointments: [], visits: [], payments: [] });
  const like = `%${q}%`;

  const patients = getAll("SELECT id, first_name, last_name, phone, email FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ? LIMIT 10", [like, like, like, like]);
  const appointments = getAll("SELECT a.id, a.scheduled_at, a.status, a.type, a.reason, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id LEFT JOIN users u ON a.doctor_id = u.id WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR a.reason LIKE ? LIMIT 10", [like, like, like]);
  const visits = getAll("SELECT v.id, v.chief_complaint, v.diagnosis, v.status, v.created_at, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name FROM visits v LEFT JOIN patients p ON v.patient_id = p.id LEFT JOIN users u ON v.doctor_id = u.id WHERE v.chief_complaint LIKE ? OR v.diagnosis LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? LIMIT 10", [like, like, like, like]);
  const payments = getAll("SELECT pay.id, pay.amount, pay.status, pay.payment_type, pay.created_at, p.first_name || ' ' || p.last_name as patient_name FROM payments pay LEFT JOIN patients p ON pay.patient_id = p.id WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR pay.description LIKE ? LIMIT 10", [like, like, like]);

  res.json({ patients, appointments, visits, payments });
});

// ── CSV Data Import ──────────────────────────────────────────────────────────

app.post('/api/import/patients', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ message: 'rows array required' });
  let imported = 0, skipped = 0;
  for (const row of rows) {
    try {
      if (!row.first_name || !row.last_name || !row.phone) { skipped++; continue; }
      runSql('INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [row.first_name, row.last_name, row.date_of_birth || null, row.gender || null, row.phone, row.email || null, row.address || null, row.blood_type || null, row.allergies || null, row.notes || null]);
      imported++;
    } catch { skipped++; }
  }
  audit(req, 'import', 'patients', null, `Imported ${imported}, skipped ${skipped}`);
  autoSave();
  res.json({ imported, skipped, total: rows.length });
});

app.post('/api/import/appointments', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ message: 'rows array required' });
  let imported = 0, skipped = 0;
  for (const row of rows) {
    try {
      if (!row.patient_id || !row.scheduled_at) { skipped++; continue; }
      runSql('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, type, reason, status) VALUES (?,?,?,?,?,?,?)',
        [row.patient_id, row.doctor_id || null, row.scheduled_at, row.duration_minutes || 30, row.type || 'consultation', row.reason || null, row.status || 'scheduled']);
      imported++;
    } catch { skipped++; }
  }
  audit(req, 'import', 'appointments', null, `Imported ${imported}, skipped ${skipped}`);
  autoSave();
  res.json({ imported, skipped, total: rows.length });
});

// ── Patient Documents ────────────────────────────────────────────────────────

app.get('/api/patients/:patientId/docs', authenticate, (req, res) => {
  const rows = getAll('SELECT id, patient_id, name, description, file_type, file_size, category, uploaded_by, created_at FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC', [req.params.patientId]);
  res.json({ data: rows });
});

app.post('/api/patients/:patientId/docs', authenticate, (req, res) => {
  const { name, description, file_type, file_size, file_data, category } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const id = runSql('INSERT INTO patient_documents (patient_id, name, description, file_type, file_size, file_data, category, uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
    [req.params.patientId, name, description || null, file_type || null, file_size || null, file_data || null, category || 'general', req.user.id]);
  audit(req, 'create', 'patient_documents', id, `Uploaded ${name}`);
  const doc = getOne('SELECT id, patient_id, name, description, file_type, file_size, category, uploaded_by, created_at FROM patient_documents WHERE id = ?', [id]);
  res.status(201).json({ data: doc });
});

app.get('/api/docs/:id', authenticate, (req, res) => {
  const doc = getOne('SELECT * FROM patient_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ data: doc });
});

app.delete('/api/docs/:id', authenticate, (req, res) => {
  const doc = getOne('SELECT id, name FROM patient_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  db.run('DELETE FROM patient_documents WHERE id = ?', [req.params.id]);
  audit(req, 'delete', 'patient_documents', doc.id, `Deleted ${doc.name}`);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Recurring Appointments ──────────────────────────────────────────────────

app.get('/api/recurring-appointments', authenticate, (req, res) => {
  const { patient_id } = req.query;
  let sql = `SELECT ra.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name
    FROM recurring_appointments ra
    LEFT JOIN patients p ON ra.patient_id = p.id
    LEFT JOIN users u ON ra.doctor_id = u.id`;
  const params = [];
  if (patient_id) { sql += ' WHERE ra.patient_id = ?'; params.push(patient_id); }
  sql += ' ORDER BY ra.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/recurring-appointments', authenticate, (req, res) => {
  const { patient_id, doctor_id, frequency, day_of_week, day_of_month, time, duration_minutes, type, reason, start_date, end_date } = req.body;
  if (!patient_id || !time || !start_date) return res.status(400).json({ message: 'patient_id, time, start_date required' });
  const id = runSql('INSERT INTO recurring_appointments (patient_id, doctor_id, frequency, day_of_week, day_of_month, time, duration_minutes, type, reason, start_date, end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [patient_id, doctor_id || null, frequency || 'weekly', day_of_week || null, day_of_month || null, time, duration_minutes || 30, type || 'consultation', reason || null, start_date, end_date || null]);
  audit(req, 'create', 'recurring_appointments', id, `Created recurring for patient ${patient_id}`);
  const row = getOne('SELECT * FROM recurring_appointments WHERE id = ?', [id]);
  res.status(201).json({ data: row });
});

app.put('/api/recurring-appointments/:id', authenticate, (req, res) => {
  const { frequency, day_of_week, day_of_month, time, duration_minutes, type, reason, end_date, is_active } = req.body;
  db.run('UPDATE recurring_appointments SET frequency=?, day_of_week=?, day_of_month=?, time=?, duration_minutes=?, type=?, reason=?, end_date=?, is_active=? WHERE id=?',
    [frequency || 'weekly', day_of_week || null, day_of_month || null, time, duration_minutes || 30, type || 'consultation', reason || null, end_date || null, is_active ?? 1, req.params.id]);
  autoSave();
  const row = getOne('SELECT * FROM recurring_appointments WHERE id = ?', [req.params.id]);
  res.json({ data: row });
});

app.delete('/api/recurring-appointments/:id', authenticate, (req, res) => {
  db.run('DELETE FROM recurring_appointments WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.post('/api/recurring-appointments/:id/generate', authenticate, (req, res) => {
  const ra = getOne('SELECT * FROM recurring_appointments WHERE id = ?', [req.params.id]);
  if (!ra) return res.status(404).json({ message: 'Not found' });
  const { until } = req.body;
  const endDate = until ? new Date(until) : new Date(Date.now() + 30 * 86400000);
  let current = new Date(ra.start_date);
  if (current < new Date()) current = new Date();
  let generated = 0;
  while (current <= endDate && generated < 52) {
    let shouldCreate = false;
    if (ra.frequency === 'daily') shouldCreate = true;
    else if (ra.frequency === 'weekly' && (ra.day_of_week === null || current.getDay() === ra.day_of_week)) shouldCreate = true;
    else if (ra.frequency === 'monthly' && (ra.day_of_month === null || current.getDate() === ra.day_of_month)) shouldCreate = true;
    if (shouldCreate) {
      const scheduled = current.toISOString().split('T')[0] + 'T' + ra.time + ':00';
      const exists = getOne('SELECT id FROM appointments WHERE patient_id=? AND scheduled_at=?', [ra.patient_id, scheduled]);
      if (!exists) {
        runSql('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, type, reason, status) VALUES (?,?,?,?,?,?,?)',
          [ra.patient_id, ra.doctor_id || null, scheduled, ra.duration_minutes, ra.type, ra.reason || null, 'scheduled']);
        generated++;
      }
    }
    if (ra.frequency === 'daily') current.setDate(current.getDate() + 1);
    else if (ra.frequency === 'weekly') current.setDate(current.getDate() + 1);
    else if (ra.frequency === 'monthly') current.setDate(current.getDate() + 1);
    else current.setDate(current.getDate() + 1);
  }
  audit(req, 'generate', 'recurring_appointments', ra.id, `Generated ${generated} appointments`);
  res.json({ generated });
});

// ── Patient Allergies ───────────────────────────────────────────────────────

app.get('/api/patients/:patientId/allergies', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM patient_allergies WHERE patient_id = ? ORDER BY created_at DESC', [req.params.patientId]) });
});

app.post('/api/patients/:patientId/allergies', authenticate, (req, res) => {
  const { allergen, severity, reaction, noted_date, notes } = req.body;
  if (!allergen) return res.status(400).json({ message: 'allergen required' });
  const id = runSql('INSERT INTO patient_allergies (patient_id, allergen, severity, reaction, noted_date, notes) VALUES (?,?,?,?,?,?)',
    [req.params.patientId, allergen, severity || 'moderate', reaction || null, noted_date || null, notes || null]);
  audit(req, 'create', 'patient_allergies', id, `Added allergy: ${allergen}`);
  res.status(201).json({ data: getOne('SELECT * FROM patient_allergies WHERE id = ?', [id]) });
});

app.delete('/api/allergies/:id', authenticate, (req, res) => {
  db.run('DELETE FROM patient_allergies WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Rooms & Resource Management ─────────────────────────────────────────────

app.get('/api/rooms', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM rooms ORDER BY name') });
});

app.post('/api/rooms', authenticate, (req, res) => {
  const { name, type, floor, capacity, equipment, status, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const id = runSql('INSERT INTO rooms (name, type, floor, capacity, equipment, status, notes) VALUES (?,?,?,?,?,?,?)',
    [name, type || 'consultation', floor || null, capacity || 1, equipment || null, status || 'available', notes || null]);
  audit(req, 'create', 'rooms', id, `Created room: ${name}`);
  res.status(201).json({ data: getOne('SELECT * FROM rooms WHERE id = ?', [id]) });
});

app.put('/api/rooms/:id', authenticate, (req, res) => {
  const { name, type, floor, capacity, equipment, status, notes } = req.body;
  db.run('UPDATE rooms SET name=?, type=?, floor=?, capacity=?, equipment=?, status=?, notes=? WHERE id=?',
    [name, type || 'consultation', floor || null, capacity || 1, equipment || null, status || 'available', notes || null, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM rooms WHERE id = ?', [req.params.id]) });
});

app.delete('/api/rooms/:id', authenticate, (req, res) => {
  db.run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/room-bookings', authenticate, (req, res) => {
  const { room_id, date } = req.query;
  let sql = `SELECT rb.*, r.name as room_name, u.name as booked_by_name
    FROM room_bookings rb
    LEFT JOIN rooms r ON rb.room_id = r.id
    LEFT JOIN users u ON rb.booked_by = u.id`;
  const params = [];
  const conditions = [];
  if (room_id) { conditions.push('rb.room_id = ?'); params.push(room_id); }
  if (date) { conditions.push("rb.start_time LIKE ?"); params.push(date + '%'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY rb.start_time';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/room-bookings', authenticate, (req, res) => {
  const { room_id, appointment_id, start_time, end_time, purpose } = req.body;
  if (!room_id || !start_time || !end_time) return res.status(400).json({ message: 'room_id, start_time, end_time required' });
  const conflict = getOne('SELECT id FROM room_bookings WHERE room_id = ? AND start_time < ? AND end_time > ?', [room_id, end_time, start_time]);
  if (conflict) return res.status(409).json({ message: 'Room is already booked for this time slot' });
  const id = runSql('INSERT INTO room_bookings (room_id, appointment_id, booked_by, start_time, end_time, purpose) VALUES (?,?,?,?,?,?)',
    [room_id, appointment_id || null, req.user.id, start_time, end_time, purpose || null]);
  res.status(201).json({ data: getOne('SELECT * FROM room_bookings WHERE id = ?', [id]) });
});

app.delete('/api/room-bookings/:id', authenticate, (req, res) => {
  db.run('DELETE FROM room_bookings WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Expense Budgets ─────────────────────────────────────────────────────────

app.get('/api/expense-budgets', authenticate, (req, res) => {
  const { month } = req.query;
  let sql = 'SELECT * FROM expense_budgets';
  const params = [];
  if (month) { sql += ' WHERE month = ?'; params.push(month); }
  sql += ' ORDER BY month DESC, category';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/expense-budgets', authenticate, (req, res) => {
  const { category, month, budget_amount, notes } = req.body;
  if (!category || !month || !budget_amount) return res.status(400).json({ message: 'category, month, budget_amount required' });
  const existing = getOne('SELECT id FROM expense_budgets WHERE category = ? AND month = ?', [category, month]);
  if (existing) {
    db.run('UPDATE expense_budgets SET budget_amount = ?, notes = ? WHERE id = ?', [budget_amount, notes || null, existing.id]);
    autoSave();
    return res.json({ data: getOne('SELECT * FROM expense_budgets WHERE id = ?', [existing.id]) });
  }
  const id = runSql('INSERT INTO expense_budgets (category, month, budget_amount, notes) VALUES (?,?,?,?)',
    [category, month, budget_amount, notes || null]);
  res.status(201).json({ data: getOne('SELECT * FROM expense_budgets WHERE id = ?', [id]) });
});

app.delete('/api/expense-budgets/:id', authenticate, (req, res) => {
  db.run('DELETE FROM expense_budgets WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/expense-budgets/summary', authenticate, (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: 'month required (YYYY-MM)' });
  const budgets = getAll('SELECT * FROM expense_budgets WHERE month = ?', [month]);
  const expenses = getAll("SELECT category, SUM(amount) as spent FROM expenses WHERE strftime('%Y-%m', date) = ? GROUP BY category", [month]);
  const expenseMap = {};
  expenses.forEach(e => expenseMap[e.category] = e.spent);
  const summary = budgets.map(b => ({
    ...b,
    spent: expenseMap[b.category] || 0,
    remaining: b.budget_amount - (expenseMap[b.category] || 0),
    percentage: Math.round(((expenseMap[b.category] || 0) / b.budget_amount) * 100)
  }));
  res.json({ data: summary });
});

// ── Task Board ──────────────────────────────────────────────────────────────

app.get('/api/tasks', authenticate, (req, res) => {
  const { status, assigned_to, category } = req.query;
  let sql = `SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id`;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (assigned_to) { conditions.push('t.assigned_to = ?'); params.push(assigned_to); }
  if (category) { conditions.push('t.category = ?'); params.push(category); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY CASE t.priority WHEN "urgent" THEN 0 WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, t.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { title, description, status, priority, assigned_to, due_date, category } = req.body;
  if (!title) return res.status(400).json({ message: 'title required' });
  const id = runSql('INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date, category) VALUES (?,?,?,?,?,?,?,?)',
    [title, description || null, status || 'todo', priority || 'medium', assigned_to || null, req.user.id, due_date || null, category || 'general']);
  audit(req, 'create', 'tasks', id, `Created task: ${title}`);
  const task = getOne(`SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?`, [id]);
  res.status(201).json({ data: task });
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const { title, description, status, priority, assigned_to, due_date, category } = req.body;
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  db.run('UPDATE tasks SET title=?, description=?, status=?, priority=?, assigned_to=?, due_date=?, category=?, completed_at=? WHERE id=?',
    [title, description || null, status || 'todo', priority || 'medium', assigned_to || null, due_date || null, category || 'general', completed_at, req.params.id]);
  autoSave();
  const task = getOne(`SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?`, [req.params.id]);
  res.json({ data: task });
});

app.patch('/api/tasks/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  db.run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', [status, completed_at, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]) });
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Referral Tracking Dashboard ─────────────────────────────────────────────

app.get('/api/referrals/dashboard', authenticate, (req, res) => {
  const total = countSql('SELECT COUNT(*) FROM referrals');
  const pending = countSql("SELECT COUNT(*) FROM referrals WHERE status = 'pending'");
  const accepted = countSql("SELECT COUNT(*) FROM referrals WHERE status = 'accepted'");
  const completed = countSql("SELECT COUNT(*) FROM referrals WHERE status = 'completed'");
  const rejected = countSql("SELECT COUNT(*) FROM referrals WHERE status = 'rejected'");
  const byPriority = getAll("SELECT priority, COUNT(*) as count FROM referrals GROUP BY priority");
  const recent = getAll(`SELECT r.*, p.first_name || ' ' || p.last_name as patient_name,
    u1.name as referring_doctor_name, u2.name as referred_to_name
    FROM referrals r
    LEFT JOIN patients p ON r.patient_id = p.id
    LEFT JOIN users u1 ON r.referring_doctor_id = u1.id
    LEFT JOIN users u2 ON r.referred_to_doctor_id = u2.id
    ORDER BY r.created_at DESC LIMIT 20`);
  res.json({ data: { total, pending, accepted, completed, rejected, byPriority, recent } });
});

// ── Staff Reviews ───────────────────────────────────────────────────────────

app.get('/api/staff-reviews', authenticate, (req, res) => {
  const { employee_id } = req.query;
  let sql = `SELECT sr.*, u1.name as employee_name, u1.role as employee_role, u2.name as reviewer_name
    FROM staff_reviews sr
    LEFT JOIN users u1 ON sr.employee_id = u1.id
    LEFT JOIN users u2 ON sr.reviewer_id = u2.id`;
  const params = [];
  if (employee_id) { sql += ' WHERE sr.employee_id = ?'; params.push(employee_id); }
  sql += ' ORDER BY sr.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/staff-reviews', authenticate, (req, res) => {
  const { employee_id, review_period, overall_rating, clinical_skills, communication, punctuality, teamwork, strengths, improvements, goals, notes } = req.body;
  if (!employee_id || !review_period || !overall_rating) return res.status(400).json({ message: 'employee_id, review_period, overall_rating required' });
  const id = runSql('INSERT INTO staff_reviews (employee_id, reviewer_id, review_period, overall_rating, clinical_skills, communication, punctuality, teamwork, strengths, improvements, goals, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [employee_id, req.user.id, review_period, overall_rating, clinical_skills || null, communication || null, punctuality || null, teamwork || null, strengths || null, improvements || null, goals || null, notes || null]);
  audit(req, 'create', 'staff_reviews', id, `Review for employee ${employee_id}`);
  const review = getOne(`SELECT sr.*, u1.name as employee_name, u2.name as reviewer_name FROM staff_reviews sr LEFT JOIN users u1 ON sr.employee_id = u1.id LEFT JOIN users u2 ON sr.reviewer_id = u2.id WHERE sr.id = ?`, [id]);
  res.status(201).json({ data: review });
});

app.delete('/api/staff-reviews/:id', authenticate, (req, res) => {
  db.run('DELETE FROM staff_reviews WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Clinical Notes ──────────────────────────────────────────────────────────

app.get('/api/patients/:patientId/clinical-notes', authenticate, (req, res) => {
  const rows = getAll(`SELECT cn.*, u.name as doctor_name FROM clinical_notes cn LEFT JOIN users u ON cn.doctor_id = u.id WHERE cn.patient_id = ? ORDER BY cn.is_pinned DESC, cn.created_at DESC`, [req.params.patientId]);
  res.json({ data: rows });
});

app.post('/api/patients/:patientId/clinical-notes', authenticate, (req, res) => {
  const { title, content, visit_id, template_type, is_pinned } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'title and content required' });
  const id = runSql('INSERT INTO clinical_notes (patient_id, doctor_id, visit_id, title, content, template_type, is_pinned) VALUES (?,?,?,?,?,?,?)',
    [req.params.patientId, req.user.id, visit_id || null, title, content, template_type || null, is_pinned || 0]);
  audit(req, 'create', 'clinical_notes', id, `Note: ${title}`);
  const note = getOne('SELECT cn.*, u.name as doctor_name FROM clinical_notes cn LEFT JOIN users u ON cn.doctor_id = u.id WHERE cn.id = ?', [id]);
  res.status(201).json({ data: note });
});

app.put('/api/clinical-notes/:id', authenticate, (req, res) => {
  const { title, content, template_type, is_pinned } = req.body;
  db.run("UPDATE clinical_notes SET title=?, content=?, template_type=?, is_pinned=?, updated_at=datetime('now') WHERE id=?",
    [title, content, template_type || null, is_pinned || 0, req.params.id]);
  autoSave();
  const note = getOne('SELECT cn.*, u.name as doctor_name FROM clinical_notes cn LEFT JOIN users u ON cn.doctor_id = u.id WHERE cn.id = ?', [req.params.id]);
  res.json({ data: note });
});

app.delete('/api/clinical-notes/:id', authenticate, (req, res) => {
  db.run('DELETE FROM clinical_notes WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Multi-branch (Clinics) ──────────────────────────────────────────────────

app.get('/api/clinics', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM clinics ORDER BY name') });
});

app.post('/api/clinics', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, address, phone, email } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const id = runSql('INSERT INTO clinics (name, address, phone, email) VALUES (?,?,?,?)',
    [name, address || null, phone || null, email || null]);
  audit(req, 'create', 'clinics', id, `Created clinic: ${name}`);
  res.status(201).json({ data: getOne('SELECT * FROM clinics WHERE id = ?', [id]) });
});

app.put('/api/clinics/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, address, phone, email, is_active } = req.body;
  db.run('UPDATE clinics SET name=?, address=?, phone=?, email=?, is_active=? WHERE id=?',
    [name, address || null, phone || null, email || null, is_active ?? 1, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM clinics WHERE id = ?', [req.params.id]) });
});

app.delete('/api/clinics/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  db.run('DELETE FROM clinics WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Dashboard Widgets ───────────────────────────────────────────────────────

app.get('/api/dashboard-widgets', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position', [req.user.id]) });
});

app.post('/api/dashboard-widgets', authenticate, (req, res) => {
  const { widgets } = req.body;
  if (!widgets || !Array.isArray(widgets)) return res.status(400).json({ message: 'widgets array required' });
  db.run('DELETE FROM dashboard_widgets WHERE user_id = ?', [req.user.id]);
  for (const w of widgets) {
    runSql('INSERT INTO dashboard_widgets (user_id, widget_key, position, width, is_visible, config) VALUES (?,?,?,?,?,?)',
      [req.user.id, w.widget_key, w.position ?? 0, w.width || 'half', w.is_visible ?? 1, w.config ? JSON.stringify(w.config) : null]);
  }
  autoSave();
  res.json({ data: getAll('SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position', [req.user.id]) });
});

// ── Consent Forms ───────────────────────────────────────────────────────────

app.get('/api/consent-forms', authenticate, (req, res) => {
  const { is_template } = req.query;
  let sql = 'SELECT * FROM consent_forms';
  const params = [];
  if (is_template !== undefined) { sql += ' WHERE is_template = ?'; params.push(is_template); }
  sql += ' ORDER BY created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/consent-forms', authenticate, (req, res) => {
  const { title, content, category, is_template } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'title and content required' });
  const id = runSql('INSERT INTO consent_forms (title, content, category, is_template) VALUES (?,?,?,?)',
    [title, content, category || 'general', is_template || 0]);
  audit(req, 'create', 'consent_forms', id, `Created form: ${title}`);
  res.status(201).json({ data: getOne('SELECT * FROM consent_forms WHERE id = ?', [id]) });
});

app.put('/api/consent-forms/:id', authenticate, (req, res) => {
  const { title, content, category, is_template } = req.body;
  db.run('UPDATE consent_forms SET title=?, content=?, category=?, is_template=? WHERE id=?',
    [title, content, category || 'general', is_template || 0, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM consent_forms WHERE id = ?', [req.params.id]) });
});

app.delete('/api/consent-forms/:id', authenticate, (req, res) => {
  db.run('DELETE FROM consent_forms WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/patients/:patientId/consents', authenticate, (req, res) => {
  const rows = getAll(`SELECT pc.*, cf.title as form_title, cf.category FROM patient_consents pc
    LEFT JOIN consent_forms cf ON pc.form_id = cf.id
    WHERE pc.patient_id = ? ORDER BY pc.created_at DESC`, [req.params.patientId]);
  res.json({ data: rows });
});

app.post('/api/patients/:patientId/consents', authenticate, (req, res) => {
  const { form_id, signature_data, witness_name, notes } = req.body;
  if (!form_id) return res.status(400).json({ message: 'form_id required' });
  const id = runSql('INSERT INTO patient_consents (patient_id, form_id, signature_data, witness_name, notes) VALUES (?,?,?,?,?)',
    [req.params.patientId, form_id, signature_data || null, witness_name || null, notes || null]);
  audit(req, 'create', 'patient_consents', id, `Patient ${req.params.patientId} signed form ${form_id}`);
  const consent = getOne(`SELECT pc.*, cf.title as form_title FROM patient_consents pc LEFT JOIN consent_forms cf ON pc.form_id = cf.id WHERE pc.id = ?`, [id]);
  res.status(201).json({ data: consent });
});

app.delete('/api/patient-consents/:id', authenticate, (req, res) => {
  db.run('DELETE FROM patient_consents WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Insurance Claims ────────────────────────────────────────────────────────

app.get('/api/insurance-claims', authenticate, (req, res) => {
  const { patient_id, status } = req.query;
  let sql = `SELECT ic.*, p.first_name || ' ' || p.last_name as patient_name, u.name as created_by_name
    FROM insurance_claims ic
    LEFT JOIN patients p ON ic.patient_id = p.id
    LEFT JOIN users u ON ic.created_by = u.id`;
  const params = [], conditions = [];
  if (patient_id) { conditions.push('ic.patient_id = ?'); params.push(patient_id); }
  if (status) { conditions.push('ic.status = ?'); params.push(status); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY ic.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/insurance-claims', authenticate, (req, res) => {
  const { patient_id, appointment_id, claim_number, insurance_provider, policy_number, amount, notes } = req.body;
  if (!patient_id || !insurance_provider || !amount) return res.status(400).json({ message: 'patient_id, insurance_provider, amount required' });
  const id = runSql('INSERT INTO insurance_claims (patient_id, appointment_id, claim_number, insurance_provider, policy_number, amount, notes, created_by) VALUES (?,?,?,?,?,?,?,?)',
    [patient_id, appointment_id || null, claim_number || null, insurance_provider, policy_number || null, amount, notes || null, req.user.id]);
  audit(req, 'create', 'insurance_claims', id, `Claim for patient ${patient_id}: ${amount}`);
  const claim = getOne(`SELECT ic.*, p.first_name || ' ' || p.last_name as patient_name FROM insurance_claims ic LEFT JOIN patients p ON ic.patient_id = p.id WHERE ic.id = ?`, [id]);
  res.status(201).json({ data: claim });
});

app.patch('/api/insurance-claims/:id', authenticate, (req, res) => {
  const { status, paid_amount, rejection_reason, notes } = req.body;
  const now = new Date().toISOString();
  let processed_at = null, decision_at = null;
  if (status === 'processing') processed_at = now;
  if (status === 'approved' || status === 'rejected' || status === 'paid') decision_at = now;
  db.run('UPDATE insurance_claims SET status=?, paid_amount=?, rejection_reason=?, notes=?, processed_at=COALESCE(?,processed_at), decision_at=COALESCE(?,decision_at) WHERE id=?',
    [status, paid_amount || null, rejection_reason || null, notes || null, processed_at, decision_at, req.params.id]);
  autoSave();
  const claim = getOne(`SELECT ic.*, p.first_name || ' ' || p.last_name as patient_name FROM insurance_claims ic LEFT JOIN patients p ON ic.patient_id = p.id WHERE ic.id = ?`, [req.params.id]);
  res.json({ data: claim });
});

app.delete('/api/insurance-claims/:id', authenticate, (req, res) => {
  db.run('DELETE FROM insurance_claims WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/insurance-claims/summary', authenticate, (req, res) => {
  const total = countSql('SELECT COUNT(*) FROM insurance_claims');
  const submitted = countSql("SELECT COUNT(*) FROM insurance_claims WHERE status = 'submitted'");
  const processing = countSql("SELECT COUNT(*) FROM insurance_claims WHERE status = 'processing'");
  const approved = countSql("SELECT COUNT(*) FROM insurance_claims WHERE status = 'approved'");
  const paid = countSql("SELECT COUNT(*) FROM insurance_claims WHERE status = 'paid'");
  const rejected = countSql("SELECT COUNT(*) FROM insurance_claims WHERE status = 'rejected'");
  const totalAmount = getOne("SELECT COALESCE(SUM(amount),0) as total FROM insurance_claims")?.total || 0;
  const paidAmount = getOne("SELECT COALESCE(SUM(paid_amount),0) as total FROM insurance_claims WHERE status = 'paid'")?.total || 0;
  res.json({ data: { total, submitted, processing, approved, paid, rejected, totalAmount, paidAmount } });
});

// ── Communication Logs ──────────────────────────────────────────────────────

app.get('/api/patients/:patientId/communications', authenticate, (req, res) => {
  const rows = getAll(`SELECT cl.*, u.name as logged_by_name FROM communication_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.patient_id = ? ORDER BY cl.contacted_at DESC`, [req.params.patientId]);
  res.json({ data: rows });
});

app.post('/api/patients/:patientId/communications', authenticate, (req, res) => {
  const { type, direction, subject, content, duration_minutes, contacted_at } = req.body;
  if (!type) return res.status(400).json({ message: 'type required' });
  const id = runSql('INSERT INTO communication_logs (patient_id, type, direction, subject, content, duration_minutes, logged_by, contacted_at) VALUES (?,?,?,?,?,?,?,?)',
    [req.params.patientId, type, direction || 'outgoing', subject || null, content || null, duration_minutes || null, req.user.id, contacted_at || new Date().toISOString()]);
  audit(req, 'create', 'communication_logs', id, `${type} with patient ${req.params.patientId}`);
  const log = getOne('SELECT cl.*, u.name as logged_by_name FROM communication_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.id = ?', [id]);
  res.status(201).json({ data: log });
});

app.delete('/api/communications/:id', authenticate, (req, res) => {
  db.run('DELETE FROM communication_logs WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── Shifts ──────────────────────────────────────────────────────────────────

app.get('/api/shifts', authenticate, (req, res) => {
  const { employee_id, date, week_start } = req.query;
  let sql = `SELECT s.*, u.name as employee_name, u.role as employee_role, u2.name as swap_requested_by_name
    FROM shifts s LEFT JOIN users u ON s.employee_id = u.id LEFT JOIN users u2 ON s.swap_requested_by = u2.id`;
  const params = [], conditions = [];
  if (employee_id) { conditions.push('s.employee_id = ?'); params.push(employee_id); }
  if (date) { conditions.push('s.date = ?'); params.push(date); }
  if (week_start) { conditions.push('s.date >= ? AND s.date <= date(?, "+6 days")'); params.push(week_start, week_start); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY s.date, s.start_time';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/shifts', authenticate, (req, res) => {
  const { employee_id, date, start_time, end_time, break_minutes, notes } = req.body;
  if (!employee_id || !date || !start_time || !end_time) return res.status(400).json({ message: 'employee_id, date, start_time, end_time required' });
  const id = runSql('INSERT INTO shifts (employee_id, date, start_time, end_time, break_minutes, notes) VALUES (?,?,?,?,?,?)',
    [employee_id, date, start_time, end_time, break_minutes || 0, notes || null]);
  audit(req, 'create', 'shifts', id, `Shift for employee ${employee_id} on ${date}`);
  const shift = getOne(`SELECT s.*, u.name as employee_name FROM shifts s LEFT JOIN users u ON s.employee_id = u.id WHERE s.id = ?`, [id]);
  res.status(201).json({ data: shift });
});

app.put('/api/shifts/:id', authenticate, (req, res) => {
  const { employee_id, date, start_time, end_time, break_minutes, status, notes } = req.body;
  db.run('UPDATE shifts SET employee_id=?, date=?, start_time=?, end_time=?, break_minutes=?, status=?, notes=? WHERE id=?',
    [employee_id, date, start_time, end_time, break_minutes || 0, status || 'scheduled', notes || null, req.params.id]);
  autoSave();
  const shift = getOne(`SELECT s.*, u.name as employee_name FROM shifts s LEFT JOIN users u ON s.employee_id = u.id WHERE s.id = ?`, [req.params.id]);
  res.json({ data: shift });
});

app.delete('/api/shifts/:id', authenticate, (req, res) => {
  db.run('DELETE FROM shifts WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.post('/api/shifts/:id/swap', authenticate, (req, res) => {
  db.run('UPDATE shifts SET swap_requested_by = ?, swap_status = ? WHERE id = ?', [req.user.id, 'pending', req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM shifts WHERE id = ?', [req.params.id]) });
});

app.patch('/api/shifts/:id/swap', authenticate, (req, res) => {
  const { swap_status } = req.body;
  db.run('UPDATE shifts SET swap_status = ? WHERE id = ?', [swap_status, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM shifts WHERE id = ?', [req.params.id]) });
});

// ── Medical History Summary ─────────────────────────────────────────────────

app.get('/api/patients/:patientId/medical-summary', authenticate, (req, res) => {
  const patient = getOne('SELECT * FROM patients WHERE id = ?', [req.params.patientId]);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const visits = getAll('SELECT v.*, u.name as doctor_name FROM visits v LEFT JOIN users u ON v.doctor_id = u.id WHERE v.patient_id = ? ORDER BY v.created_at DESC', [req.params.patientId]);
  const prescriptions = getAll(`SELECT p.*, u.name as doctor_name, GROUP_CONCAT(pi.medication_name || ' ' || pi.dosage, ', ') as medications FROM prescriptions p LEFT JOIN users u ON p.doctor_id = u.id LEFT JOIN prescription_items pi ON pi.prescription_id = p.id WHERE p.patient_id = ? GROUP BY p.id ORDER BY p.created_at DESC`, [req.params.patientId]);
  const allergies = getAll('SELECT * FROM patient_allergies WHERE patient_id = ?', [req.params.patientId]);
  const labResults = getAll('SELECT * FROM lab_orders WHERE patient_id = ? ORDER BY created_at DESC', [req.params.patientId]);
  const diagnoses = visits.filter(v => v.diagnosis).map(v => ({ diagnosis: v.diagnosis, date: v.created_at, doctor: v.doctor_name }));
  const vitals = visits.filter(v => v.blood_pressure || v.heart_rate || v.temperature || v.weight).map(v => ({
    date: v.created_at, blood_pressure: v.blood_pressure, heart_rate: v.heart_rate, temperature: v.temperature, weight: v.weight
  }));
  res.json({ data: { patient, visits: visits.length, diagnoses, prescriptions, allergies, labResults, vitals, recentVisits: visits.slice(0, 5) } });
});

// ── Suppliers ───────────────────────────────────────────────────────────────

app.get('/api/suppliers', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM suppliers ORDER BY name') });
});

app.post('/api/suppliers', authenticate, (req, res) => {
  const { name, contact_person, email, phone, address, category, payment_terms, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  const id = runSql('INSERT INTO suppliers (name, contact_person, email, phone, address, category, payment_terms, notes) VALUES (?,?,?,?,?,?,?,?)',
    [name, contact_person || null, email || null, phone || null, address || null, category || 'general', payment_terms || null, notes || null]);
  audit(req, 'create', 'suppliers', id, `Created supplier: ${name}`);
  res.status(201).json({ data: getOne('SELECT * FROM suppliers WHERE id = ?', [id]) });
});

app.put('/api/suppliers/:id', authenticate, (req, res) => {
  const { name, contact_person, email, phone, address, category, payment_terms, notes, is_active } = req.body;
  db.run('UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=?, category=?, payment_terms=?, notes=?, is_active=? WHERE id=?',
    [name, contact_person || null, email || null, phone || null, address || null, category || 'general', payment_terms || null, notes || null, is_active ?? 1, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]) });
});

app.delete('/api/suppliers/:id', authenticate, (req, res) => {
  db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/supplier-orders', authenticate, (req, res) => {
  const { supplier_id, status } = req.query;
  let sql = `SELECT so.*, s.name as supplier_name, u.name as created_by_name FROM supplier_orders so LEFT JOIN suppliers s ON so.supplier_id = s.id LEFT JOIN users u ON so.created_by = u.id`;
  const params = [], conditions = [];
  if (supplier_id) { conditions.push('so.supplier_id = ?'); params.push(supplier_id); }
  if (status) { conditions.push('so.status = ?'); params.push(status); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY so.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/supplier-orders', authenticate, (req, res) => {
  const { supplier_id, order_number, items, total_amount, expected_delivery, notes } = req.body;
  if (!supplier_id || !items || !total_amount) return res.status(400).json({ message: 'supplier_id, items, total_amount required' });
  const id = runSql('INSERT INTO supplier_orders (supplier_id, order_number, items, total_amount, expected_delivery, notes, created_by) VALUES (?,?,?,?,?,?,?)',
    [supplier_id, order_number || null, items, total_amount, expected_delivery || null, notes || null, req.user.id]);
  audit(req, 'create', 'supplier_orders', id, `Order from supplier ${supplier_id}: ${total_amount}`);
  const order = getOne('SELECT so.*, s.name as supplier_name FROM supplier_orders so LEFT JOIN suppliers s ON so.supplier_id = s.id WHERE so.id = ?', [id]);
  res.status(201).json({ data: order });
});

app.patch('/api/supplier-orders/:id', authenticate, (req, res) => {
  const { status, delivered_at, notes } = req.body;
  db.run('UPDATE supplier_orders SET status=?, delivered_at=?, notes=? WHERE id=?',
    [status, delivered_at || null, notes || null, req.params.id]);
  autoSave();
  const order = getOne('SELECT so.*, s.name as supplier_name FROM supplier_orders so LEFT JOIN suppliers s ON so.supplier_id = s.id WHERE so.id = ?', [req.params.id]);
  res.json({ data: order });
});

app.delete('/api/supplier-orders/:id', authenticate, (req, res) => {
  db.run('DELETE FROM supplier_orders WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

// ── TV Announcements ────────────────────────────────────────────────────────

app.get('/api/tv/announcements', authenticate, (req, res) => {
  res.json({ data: getAll("SELECT * FROM tv_announcements WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= datetime('now')) AND (ends_at IS NULL OR ends_at >= datetime('now')) ORDER BY created_at DESC") });
});

app.get('/api/tv/announcements/all', authenticate, (req, res) => {
  res.json({ data: getAll('SELECT * FROM tv_announcements ORDER BY created_at DESC') });
});

app.post('/api/tv/announcements', authenticate, (req, res) => {
  const { title, content, type, starts_at, ends_at } = req.body;
  if (!title) return res.status(400).json({ message: 'title required' });
  const id = runSql('INSERT INTO tv_announcements (title, content, type, starts_at, ends_at) VALUES (?,?,?,?,?)',
    [title, content || null, type || 'info', starts_at || null, ends_at || null]);
  res.status(201).json({ data: getOne('SELECT * FROM tv_announcements WHERE id = ?', [id]) });
});

app.put('/api/tv/announcements/:id', authenticate, (req, res) => {
  const { title, content, type, is_active, starts_at, ends_at } = req.body;
  db.run('UPDATE tv_announcements SET title=?, content=?, type=?, is_active=?, starts_at=?, ends_at=? WHERE id=?',
    [title, content || null, type || 'info', is_active ?? 1, starts_at || null, ends_at || null, req.params.id]);
  autoSave();
  res.json({ data: getOne('SELECT * FROM tv_announcements WHERE id = ?', [req.params.id]) });
});

app.delete('/api/tv/announcements/:id', authenticate, (req, res) => {
  db.run('DELETE FROM tv_announcements WHERE id = ?', [req.params.id]);
  autoSave();
  res.json({ message: 'Deleted' });
});

app.get('/api/tv/dashboard', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = countSql("SELECT COUNT(*) FROM appointments WHERE scheduled_at LIKE ?", [today + '%']);
  const waitingCount = countSql("SELECT COUNT(*) FROM appointments WHERE status = 'arrived' AND scheduled_at LIKE ?", [today + '%']);
  const completedToday = countSql("SELECT COUNT(*) FROM appointments WHERE status = 'completed' AND scheduled_at LIKE ?", [today + '%']);
  const activeAnnouncements = getAll("SELECT * FROM tv_announcements WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= datetime('now')) AND (ends_at IS NULL OR ends_at >= datetime('now')) ORDER BY created_at DESC LIMIT 5");
  const upcoming = getAll(`SELECT a.scheduled_at, a.status, a.type, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name
    FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id LEFT JOIN users u ON a.doctor_id = u.id
    WHERE a.scheduled_at LIKE ? AND a.status IN ('scheduled','confirmed','arrived')
    ORDER BY a.scheduled_at LIMIT 10`, [today + '%']);
  res.json({ data: { todayAppointments, waitingCount, completedToday, activeAnnouncements, upcoming, currentTime: new Date().toISOString() } });
});

// ── Printable Prescription ──────────────────────────────────────────────────

app.get('/api/prescriptions/:id/print-data', authenticate, (req, res) => {
  const prescription = getOne('SELECT p.*, u.name as doctor_name, u.specialty as doctor_specialty, u.license_number FROM prescriptions p LEFT JOIN users u ON p.doctor_id = u.id WHERE p.id = ?', [req.params.id]);
  if (!prescription) return res.status(404).json({ message: 'Not found' });
  const patient = getOne('SELECT * FROM patients WHERE id = ?', [prescription.patient_id]);
  const items = getAll('SELECT * FROM prescription_items WHERE prescription_id = ?', [req.params.id]);
  const clinic = getOne('SELECT * FROM clinics WHERE id = 1') || { name: 'Modern Clinic', address: '', phone: '', email: '' };
  res.json({ data: { prescription, patient, items, clinic } });
});

// ── Service Catalog ─────────────────────────────────────────────────────────

app.get('/api/services', authenticate, (req, res) => {
  const { category, active } = req.query;
  let sql = 'SELECT * FROM services WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (active !== undefined) { sql += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  sql += ' ORDER BY category, name';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/services', authenticate, (req, res) => {
  const { name, category, description, price, duration_minutes, is_active } = req.body;
  const r = db.run('INSERT INTO services (name, category, description, price, duration_minutes, is_active) VALUES (?,?,?,?,?,?)',
    [name, category || 'general', description || null, price || 0, duration_minutes || 30, is_active !== undefined ? (is_active ? 1 : 0) : 1]);
  saveDb();
  res.json({ data: { id: r.lastInsertRowid ?? db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] } });
});

app.put('/api/services/:id', authenticate, (req, res) => {
  const { name, category, description, price, duration_minutes, is_active } = req.body;
  db.run('UPDATE services SET name=?, category=?, description=?, price=?, duration_minutes=?, is_active=? WHERE id=?',
    [name, category || 'general', description || null, price || 0, duration_minutes || 30, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id]);
  saveDb();
  res.json({ message: 'Updated' });
});

app.delete('/api/services/:id', authenticate, (req, res) => {
  db.run('DELETE FROM services WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ message: 'Deleted' });
});

app.get('/api/services/categories', authenticate, (_req, res) => {
  const rows = getAll('SELECT DISTINCT category FROM services ORDER BY category');
  res.json({ data: rows.map(r => r.category) });
});

// ── Appointment Waitlist ────────────────────────────────────────────────────

app.get('/api/waitlist', authenticate, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT w.*, p.first_name || ' ' || p.last_name as patient_name, u.name as doctor_name, s.name as service_name
    FROM appointment_waitlist w
    LEFT JOIN patients p ON w.patient_id = p.id
    LEFT JOIN users u ON w.doctor_id = u.id
    LEFT JOIN services s ON w.service_id = s.id
    WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND w.status = ?'; params.push(status); }
  sql += ' ORDER BY w.priority DESC, w.created_at ASC';
  res.json({ data: getAll(sql, params) });
});

app.post('/api/waitlist', authenticate, (req, res) => {
  const { patient_id, doctor_id, preferred_date, preferred_time, service_id, priority, notes } = req.body;
  const r = db.run('INSERT INTO appointment_waitlist (patient_id, doctor_id, preferred_date, preferred_time, service_id, priority, notes) VALUES (?,?,?,?,?,?,?)',
    [patient_id, doctor_id || null, preferred_date || null, preferred_time || null, service_id || null, priority || 0, notes || null]);
  saveDb();
  res.json({ data: { id: r.lastInsertRowid ?? db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] } });
});

app.patch('/api/waitlist/:id', authenticate, (req, res) => {
  const { status, notified_at } = req.body;
  const sets = [];
  const params = [];
  if (status) { sets.push('status = ?'); params.push(status); }
  if (notified_at) { sets.push('notified_at = ?'); params.push(notified_at); }
  if (sets.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  params.push(req.params.id);
  db.run(`UPDATE appointment_waitlist SET ${sets.join(', ')} WHERE id = ?`, params);
  saveDb();
  res.json({ message: 'Updated' });
});

app.delete('/api/waitlist/:id', authenticate, (req, res) => {
  db.run('DELETE FROM appointment_waitlist WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ message: 'Deleted' });
});

app.post('/api/waitlist/:id/convert', authenticate, (req, res) => {
  const entry = getOne('SELECT * FROM appointment_waitlist WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ message: 'Not found' });
  const { scheduled_at } = req.body;
  if (!scheduled_at) return res.status(400).json({ message: 'scheduled_at required' });
  db.run('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES (?,?,?,?,?)',
    [entry.patient_id, entry.doctor_id || null, scheduled_at, 'scheduled', 'consultation']);
  db.run('UPDATE appointment_waitlist SET status = ? WHERE id = ?', ['converted', req.params.id]);
  saveDb();
  res.json({ message: 'Converted to appointment' });
});

// ── Patient Education ───────────────────────────────────────────────────────

app.get('/api/education', authenticate, (req, res) => {
  const { category, published } = req.query;
  let sql = 'SELECT a.*, u.name as author_name FROM education_articles a LEFT JOIN users u ON a.author_id = u.id WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND a.category = ?'; params.push(category); }
  if (published !== undefined) { sql += ' AND a.is_published = ?'; params.push(published === 'true' ? 1 : 0); }
  sql += ' ORDER BY a.created_at DESC';
  res.json({ data: getAll(sql, params) });
});

app.get('/api/education/:id', authenticate, (req, res) => {
  const article = getOne('SELECT a.*, u.name as author_name FROM education_articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = ?', [req.params.id]);
  if (!article) return res.status(404).json({ message: 'Not found' });
  db.run('UPDATE education_articles SET views = views + 1 WHERE id = ?', [req.params.id]);
  res.json({ data: article });
});

app.post('/api/education', authenticate, (req, res) => {
  const { title, content, category, tags, is_published } = req.body;
  const r = db.run('INSERT INTO education_articles (title, content, category, tags, author_id, is_published) VALUES (?,?,?,?,?,?)',
    [title, content || null, category || 'general', tags || null, req.user.id, is_published ? 1 : 0]);
  saveDb();
  res.json({ data: { id: r.lastInsertRowid ?? db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] } });
});

app.put('/api/education/:id', authenticate, (req, res) => {
  const { title, content, category, tags, is_published } = req.body;
  db.run('UPDATE education_articles SET title=?, content=?, category=?, tags=?, is_published=?, updated_at=datetime(\'now\') WHERE id=?',
    [title, content || null, category || 'general', tags || null, is_published ? 1 : 0, req.params.id]);
  saveDb();
  res.json({ message: 'Updated' });
});

app.delete('/api/education/:id', authenticate, (req, res) => {
  db.run('DELETE FROM education_articles WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ message: 'Deleted' });
});

app.get('/api/education/categories/list', authenticate, (_req, res) => {
  const rows = getAll('SELECT DISTINCT category FROM education_articles ORDER BY category');
  res.json({ data: rows.map(r => r.category) });
});

// ── Start ───────────────────────────────────────────────────────────────────

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Modern Clinic API running at http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
