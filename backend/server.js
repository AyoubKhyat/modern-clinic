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
  const { patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes } = req.body;
  const id = runSql('INSERT INTO appointments (patient_id, doctor_id, scheduled_at, duration_minutes, status, type, reason, notes) VALUES (?,?,?,?,?,?,?,?)',
    [patient_id, doctor_id, scheduled_at, duration_minutes || 30, status || 'scheduled', type || 'consultation', reason, notes]);
  const appt = getOne('SELECT * FROM appointments WHERE id = ?', [id]);
  const patient = getOne('SELECT first_name, last_name FROM patients WHERE id = ?', [patient_id]);
  if (patient) notifyAll('New Appointment', `${patient.first_name} ${patient.last_name} — ${type || 'consultation'}`, 'appointment');
  audit(req, 'create', 'appointment', id, `${patient ? patient.first_name + ' ' + patient.last_name : ''} — ${type || 'consultation'}`);
  res.status(201).json(formatAppointment(appt));
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
