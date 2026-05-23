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

  // Add insurance columns to patients if missing
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_provider TEXT"); } catch {}
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_number TEXT"); } catch {}
  try { db.run("ALTER TABLE patients ADD COLUMN insurance_type TEXT"); } catch {}

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
    [patient_id, doctor_id || req.user.id, visit_id, test_name, notes]);
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
    [patient_id, vaccine_name, dose_number || 1, administered_at || new Date().toISOString(), next_dose_date, req.user.id, batch_number, notes]);
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
    [patient_id, referring_doctor_id || req.user.id, referred_to_doctor_id, reason, priority || 'normal', notes]);
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
    [category, description, amount, date, receipt_ref, req.user.id]);
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
  let where = [], params = [];
  if (employeeId) { where.push('l.employee_id = ?'); params.push(employeeId); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = getAll(`SELECT l.*, u.name as employee_name, a.name as approved_by_name FROM leaves l JOIN users u ON l.employee_id = u.id LEFT JOIN users a ON l.approved_by = a.id ${w} ORDER BY l.start_date DESC`, params);
  res.json(rows);
});

app.post('/api/leaves', authenticate, (req, res) => {
  const { employee_id, type, start_date, end_date, reason } = req.body;
  const id = runSql('INSERT INTO leaves (employee_id, type, start_date, end_date, reason) VALUES (?,?,?,?,?)',
    [employee_id || req.user.id, type || 'annual', start_date, end_date, reason]);
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
