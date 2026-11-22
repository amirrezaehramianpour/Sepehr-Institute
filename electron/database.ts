import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SEED_DATA } from '../src/data/seedData';
import type {
  AttendanceSession,
  ClassSection,
  CommunicationLog,
  Course,
  DbInfo,
  Enrollment,
  Expense,
  GradeRecord,
  InstituteSettings,
  InstituteState,
  Instructor,
  Payment,
  Room,
  Student,
  SystemUser,
  UserRole,
} from '../src/types/institute';

export interface DatabaseOptions {
  dbPath: string;
  legacyJsonPaths?: string[];
  isDesktop?: boolean;
}

function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

function verifyPasswordHash(password: string, expectedHash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidate, expectedBuf);
}

function isValidRole(role: string): role is UserRole {
  return role === 'مدیر کل' || role === 'مسئول ثبت‌نام' || role === 'حسابدار';
}

export class InstituteDatabase {
  private db: Database.Database;
  private readonly dbPath: string;
  private readonly legacyJsonPaths: string[];
  private readonly isDesktop: boolean;

  constructor(options: DatabaseOptions) {
    this.dbPath = path.resolve(options.dbPath);
    this.legacyJsonPaths = options.legacyJsonPaths ?? [];
    this.isDesktop = Boolean(options.isDesktop);

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = this.openDatabase(this.dbPath);
    this.initSchema();
    this.runInitialMigration();
  }

  private openDatabase(filePath: string): Database.Database {
    const conn = new Database(filePath);
    conn.pragma('journal_mode = WAL');
    conn.pragma('foreign_keys = ON');
    conn.pragma('synchronous = NORMAL');
    return conn;
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        manager_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        current_term TEXT NOT NULL,
        passing_grade REAL NOT NULL,
        logo_url TEXT,
        grade_weights_json TEXT NOT NULL,
        last_backup_at TEXT,
        require_login INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        phone TEXT NOT NULL,
        emergency_phone TEXT NOT NULL,
        education TEXT NOT NULL,
        address TEXT NOT NULL,
        notes TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS instructors (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        commission_percent REAL NOT NULL,
        hourly_rate REAL NOT NULL,
        joined_at TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        floor TEXT NOT NULL,
        equipment TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        total_hours REAL NOT NULL,
        sessions_count INTEGER NOT NULL,
        base_tuition REAL NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        instructor_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        term TEXT NOT NULL,
        days_json TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        start_date TEXT NOT NULL,
        max_capacity INTEGER NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        enrolled_at TEXT NOT NULL,
        base_tuition REAL NOT NULL,
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        discount_reason TEXT NOT NULL,
        final_tuition REAL NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        enrollment_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        method TEXT NOT NULL,
        reference_code TEXT NOT NULL,
        note TEXT NOT NULL,
        type TEXT NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS grades (
        id TEXT PRIMARY KEY,
        enrollment_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        midterm REAL NOT NULL,
        final_exam REAL NOT NULL,
        practical REAL NOT NULL,
        class_activity REAL NOT NULL,
        total_score REAL NOT NULL,
        teacher_comment TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        topic TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        status TEXT NOT NULL,
        PRIMARY KEY (session_id, student_id),
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS communications (
        id TEXT PRIMARY KEY,
        recipient_type TEXT NOT NULL,
        recipient_label TEXT NOT NULL,
        channel TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        kind TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
      CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);
      CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_sessions(class_id);
    `);
  }

  private isValidStateShape(data: unknown): data is InstituteState {
    if (!data || typeof data !== 'object') return false;
    const candidate = data as InstituteState;
    return (
      Boolean(candidate.settings) &&
      typeof candidate.settings.name === 'string' &&
      Array.isArray(candidate.students) &&
      Array.isArray(candidate.instructors) &&
      Array.isArray(candidate.rooms) &&
      Array.isArray(candidate.courses) &&
      Array.isArray(candidate.classes) &&
      Array.isArray(candidate.enrollments) &&
      Array.isArray(candidate.payments) &&
      Array.isArray(candidate.expenses) &&
      Array.isArray(candidate.grades) &&
      Array.isArray(candidate.attendance) &&
      Array.isArray(candidate.communications)
    );
  }

  private runInitialMigration(): void {
    const applied = this.db
      .prepare('SELECT name FROM migrations WHERE name = ?')
      .get('json_initial_migration_v1') as { name: string } | undefined;

    const existingSettings = this.db
      .prepare('SELECT id FROM settings WHERE id = 1')
      .get() as { id: number } | undefined;

    if (applied && existingSettings) {
      return;
    }

    let initialState: InstituteState = SEED_DATA;

    for (const jsonPath of this.legacyJsonPaths) {
      if (!jsonPath || !fs.existsSync(jsonPath)) continue;
      try {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        if (this.isValidStateShape(parsed) && parsed.students.length > 0) {
          initialState = parsed;
          break;
        }
      } catch {
        // Continue checking fallback paths
      }
    }

    const migrateTx = this.db.transaction(() => {
      if (!existingSettings) {
        this.insertStateNonDestructive(initialState);
      }
      this.db
        .prepare('INSERT OR IGNORE INTO migrations (name, applied_at) VALUES (?, ?)')
        .run('json_initial_migration_v1', new Date().toISOString());
    });

    migrateTx();
  }

  private insertStateNonDestructive(state: InstituteState): void {
    const now = new Date().toISOString();
    const s = state.settings;

    this.db
      .prepare(
        `INSERT OR IGNORE INTO settings (
          id, name, subtitle, manager_name, phone, address, current_term,
          passing_grade, logo_url, grade_weights_json, last_backup_at, require_login, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
      )
      .run(
        s.name,
        s.subtitle,
        s.managerName,
        s.phone,
        s.address,
        s.currentTerm,
        Number(s.passingGrade) || 12,
        s.logoUrl ?? null,
        JSON.stringify(s.gradeWeights),
        now,
      );

    const insertStudent = this.db.prepare(
      `INSERT OR IGNORE INTO students (
        id, code, full_name, national_id, birth_date, phone, emergency_phone,
        education, address, notes, registered_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const stu of state.students) {
      insertStudent.run(
        stu.id,
        stu.code,
        stu.fullName,
        stu.nationalId,
        stu.birthDate,
        stu.phone,
        stu.emergencyPhone,
        stu.education,
        stu.address,
        stu.notes,
        stu.registeredAt,
        stu.status,
      );
    }

    const insertInst = this.db.prepare(
      `INSERT OR IGNORE INTO instructors (
        id, full_name, specialty, phone, email, commission_percent, hourly_rate, joined_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const inst of state.instructors) {
      insertInst.run(
        inst.id,
        inst.fullName,
        inst.specialty,
        inst.phone,
        inst.email,
        Number(inst.commissionPercent) || 0,
        Number(inst.hourlyRate) || 0,
        inst.joinedAt,
        inst.status,
      );
    }

    const insertRoom = this.db.prepare(
      `INSERT OR IGNORE INTO rooms (id, name, capacity, floor, equipment) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const room of state.rooms) {
      insertRoom.run(room.id, room.name, Number(room.capacity) || 1, room.floor, room.equipment);
    }

    const insertCourse = this.db.prepare(
      `INSERT OR IGNORE INTO courses (
        id, code, title, category, total_hours, sessions_count, base_tuition, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const cr of state.courses) {
      insertCourse.run(
        cr.id,
        cr.code,
        cr.title,
        cr.category,
        Number(cr.totalHours) || 0,
        Number(cr.sessionsCount) || 0,
        Number(cr.baseTuition) || 0,
        cr.description,
      );
    }

    const insertClass = this.db.prepare(
      `INSERT OR IGNORE INTO classes (
        id, course_id, instructor_id, room_id, title, term, days_json,
        start_time, end_time, start_date, max_capacity, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const cls of state.classes) {
      insertClass.run(
        cls.id,
        cls.courseId,
        cls.instructorId,
        cls.roomId,
        cls.title,
        cls.term,
        JSON.stringify(cls.days),
        cls.startTime,
        cls.endTime,
        cls.startDate,
        Number(cls.maxCapacity) || 1,
        cls.status,
      );
    }

    const insertEnrollment = this.db.prepare(
      `INSERT OR IGNORE INTO enrollments (
        id, student_id, class_id, enrolled_at, base_tuition, discount_type,
        discount_value, discount_reason, final_tuition, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const en of state.enrollments) {
      insertEnrollment.run(
        en.id,
        en.studentId,
        en.classId,
        en.enrolledAt,
        Number(en.baseTuition) || 0,
        en.discountType,
        Number(en.discountValue) || 0,
        en.discountReason,
        Number(en.finalTuition) || 0,
        en.status,
      );
    }

    const insertPayment = this.db.prepare(
      `INSERT OR IGNORE INTO payments (
        id, enrollment_id, student_id, amount, date, method, reference_code, note, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const pay of state.payments) {
      insertPayment.run(
        pay.id,
        pay.enrollmentId,
        pay.studentId,
        Number(pay.amount) || 0,
        pay.date,
        pay.method,
        pay.referenceCode,
        pay.note,
        pay.type,
      );
    }

    const insertExpense = this.db.prepare(
      `INSERT OR IGNORE INTO expenses (id, title, category, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const ex of state.expenses) {
      insertExpense.run(ex.id, ex.title, ex.category, Number(ex.amount) || 0, ex.date, ex.note);
    }

    const insertGrade = this.db.prepare(
      `INSERT OR IGNORE INTO grades (
        id, enrollment_id, student_id, class_id, midterm, final_exam,
        practical, class_activity, total_score, teacher_comment, updated_at, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const gr of state.grades) {
      insertGrade.run(
        gr.id,
        gr.enrollmentId,
        gr.studentId,
        gr.classId,
        Number(gr.midterm) || 0,
        Number(gr.finalExam) || 0,
        Number(gr.practical) || 0,
        Number(gr.classActivity) || 0,
        Number(gr.totalScore) || 0,
        gr.teacherComment,
        gr.updatedAt,
        gr.published ? 1 : 0,
      );
    }

    const insertAttSession = this.db.prepare(
      `INSERT OR IGNORE INTO attendance_sessions (id, class_id, date, topic) VALUES (?, ?, ?, ?)`,
    );
    const insertAttRecord = this.db.prepare(
      `INSERT OR IGNORE INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)`,
    );
    for (const sess of state.attendance) {
      insertAttSession.run(sess.id, sess.classId, sess.date, sess.topic);
      for (const rec of sess.records) {
        insertAttRecord.run(sess.id, rec.studentId, rec.status);
      }
    }

    const insertComm = this.db.prepare(
      `INSERT OR IGNORE INTO communications (
        id, recipient_type, recipient_label, channel, subject, message, sent_at, count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const comm of state.communications) {
      insertComm.run(
        comm.id,
        comm.recipientType,
        comm.recipientLabel,
        comm.channel,
        comm.subject,
        comm.message,
        comm.sentAt,
        Number(comm.count) || 0,
      );
    }
  }

  public getState(): InstituteState {
    const settingsRow = this.db
      .prepare('SELECT * FROM settings WHERE id = 1')
      .get() as
      | {
          name: string;
          subtitle: string;
          manager_name: string;
          phone: string;
          address: string;
          current_term: string;
          passing_grade: number;
          logo_url: string | null;
          grade_weights_json: string;
        }
      | undefined;

    const settings: InstituteSettings = settingsRow
      ? {
          name: settingsRow.name,
          subtitle: settingsRow.subtitle,
          managerName: settingsRow.manager_name,
          phone: settingsRow.phone,
          address: settingsRow.address,
          currentTerm: settingsRow.current_term,
          passingGrade: settingsRow.passing_grade,
          logoUrl: settingsRow.logo_url ?? undefined,
          gradeWeights: JSON.parse(settingsRow.grade_weights_json),
        }
      : SEED_DATA.settings;

    const students = (
      this.db.prepare('SELECT * FROM students ORDER BY rowid ASC').all() as {
        id: string;
        code: string;
        full_name: string;
        national_id: string;
        birth_date: string;
        phone: string;
        emergency_phone: string;
        education: string;
        address: string;
        notes: string;
        registered_at: string;
        status: Student['status'];
      }[]
    ).map((r) => ({
      id: r.id,
      code: r.code,
      fullName: r.full_name,
      nationalId: r.national_id,
      birthDate: r.birth_date,
      phone: r.phone,
      emergencyPhone: r.emergency_phone,
      education: r.education,
      address: r.address,
      notes: r.notes,
      registeredAt: r.registered_at,
      status: r.status,
    }));

    const instructors = (
      this.db.prepare('SELECT * FROM instructors ORDER BY rowid ASC').all() as {
        id: string;
        full_name: string;
        specialty: string;
        phone: string;
        email: string;
        commission_percent: number;
        hourly_rate: number;
        joined_at: string;
        status: Instructor['status'];
      }[]
    ).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      specialty: r.specialty,
      phone: r.phone,
      email: r.email,
      commissionPercent: r.commission_percent,
      hourlyRate: r.hourly_rate,
      joinedAt: r.joined_at,
      status: r.status,
    }));

    const rooms: Room[] = this.db
      .prepare('SELECT id, name, capacity, floor, equipment FROM rooms ORDER BY rowid ASC')
      .all() as Room[];

    const courses = (
      this.db.prepare('SELECT * FROM courses ORDER BY rowid ASC').all() as {
        id: string;
        code: string;
        title: string;
        category: string;
        total_hours: number;
        sessions_count: number;
        base_tuition: number;
        description: string;
      }[]
    ).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      category: r.category,
      totalHours: r.total_hours,
      sessionsCount: r.sessions_count,
      baseTuition: r.base_tuition,
      description: r.description,
    }));

    const classes: ClassSection[] = (
      this.db.prepare('SELECT * FROM classes ORDER BY rowid ASC').all() as {
        id: string;
        course_id: string;
        instructor_id: string;
        room_id: string;
        title: string;
        term: string;
        days_json: string;
        start_time: string;
        end_time: string;
        start_date: string;
        max_capacity: number;
        status: ClassSection['status'];
      }[]
    ).map((r) => ({
      id: r.id,
      courseId: r.course_id,
      instructorId: r.instructor_id,
      roomId: r.room_id,
      title: r.title,
      term: r.term,
      days: JSON.parse(r.days_json),
      startTime: r.start_time,
      endTime: r.end_time,
      startDate: r.start_date,
      maxCapacity: r.max_capacity,
      status: r.status,
    }));

    const enrollments: Enrollment[] = (
      this.db.prepare('SELECT * FROM enrollments ORDER BY rowid ASC').all() as {
        id: string;
        student_id: string;
        class_id: string;
        enrolled_at: string;
        base_tuition: number;
        discount_type: Enrollment['discountType'];
        discount_value: number;
        discount_reason: string;
        final_tuition: number;
        status: Enrollment['status'];
      }[]
    ).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      classId: r.class_id,
      enrolledAt: r.enrolled_at,
      baseTuition: r.base_tuition,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      discountReason: r.discount_reason,
      finalTuition: r.final_tuition,
      status: r.status,
    }));

    const payments: Payment[] = (
      this.db.prepare('SELECT * FROM payments ORDER BY rowid ASC').all() as {
        id: string;
        enrollment_id: string;
        student_id: string;
        amount: number;
        date: string;
        method: Payment['method'];
        reference_code: string;
        note: string;
        type: Payment['type'];
      }[]
    ).map((r) => ({
      id: r.id,
      enrollmentId: r.enrollment_id,
      studentId: r.student_id,
      amount: r.amount,
      date: r.date,
      method: r.method,
      referenceCode: r.reference_code,
      note: r.note,
      type: r.type,
    }));

    const expenses: Expense[] = this.db
      .prepare('SELECT id, title, category, amount, date, note FROM expenses ORDER BY rowid ASC')
      .all() as Expense[];

    const grades: GradeRecord[] = (
      this.db.prepare('SELECT * FROM grades ORDER BY rowid ASC').all() as {
        id: string;
        enrollment_id: string;
        student_id: string;
        class_id: string;
        midterm: number;
        final_exam: number;
        practical: number;
        class_activity: number;
        total_score: number;
        teacher_comment: string;
        updated_at: string;
        published: number;
      }[]
    ).map((r) => ({
      id: r.id,
      enrollmentId: r.enrollment_id,
      studentId: r.student_id,
      classId: r.class_id,
      midterm: r.midterm,
      finalExam: r.final_exam,
      practical: r.practical,
      classActivity: r.class_activity,
      totalScore: r.total_score,
      teacherComment: r.teacher_comment,
      updatedAt: r.updated_at,
      published: Boolean(r.published),
    }));

    const attSessionsRaw = this.db
      .prepare('SELECT * FROM attendance_sessions ORDER BY rowid ASC')
      .all() as { id: string; class_id: string; date: string; topic: string }[];
    const attRecordsRaw = this.db
      .prepare('SELECT session_id, student_id, status FROM attendance_records ORDER BY rowid ASC')
      .all() as {
      session_id: string;
      student_id: string;
      status: AttendanceSession['records'][number]['status'];
    }[];

    const recordsBySession = new Map<string, AttendanceSession['records']>();
    for (const rec of attRecordsRaw) {
      const list = recordsBySession.get(rec.session_id) ?? [];
      list.push({ studentId: rec.student_id, status: rec.status });
      recordsBySession.set(rec.session_id, list);
    }

    const attendance: AttendanceSession[] = attSessionsRaw.map((sess) => ({
      id: sess.id,
      classId: sess.class_id,
      date: sess.date,
      topic: sess.topic,
      records: recordsBySession.get(sess.id) ?? [],
    }));

    const communications: CommunicationLog[] = (
      this.db.prepare('SELECT * FROM communications ORDER BY rowid ASC').all() as {
        id: string;
        recipient_type: CommunicationLog['recipientType'];
        recipient_label: string;
        channel: CommunicationLog['channel'];
        subject: string;
        message: string;
        sent_at: string;
        count: number;
      }[]
    ).map((r) => ({
      id: r.id,
      recipientType: r.recipient_type,
      recipientLabel: r.recipient_label,
      channel: r.channel,
      subject: r.subject,
      message: r.message,
      sentAt: r.sent_at,
      count: r.count,
    }));

    return {
      settings,
      students,
      instructors,
      rooms,
      courses,
      classes,
      enrollments,
      payments,
      expenses,
      grades,
      attendance,
      communications,
    };
  }

  public saveFullState(next: InstituteState): void {
    if (!this.isValidStateShape(next)) {
      throw new Error('ساختار داده‌های ارسالی معتبر نیست.');
    }

    const tx = this.db.transaction(() => {
      const existingMeta = this.db
        .prepare('SELECT last_backup_at, require_login FROM settings WHERE id = 1')
        .get() as { last_backup_at: string | null; require_login: number } | undefined;

      // Clear operational tables in dependency order and write cleanly inside atomic transaction
      this.db.prepare('DELETE FROM attendance_records').run();
      this.db.prepare('DELETE FROM attendance_sessions').run();
      this.db.prepare('DELETE FROM grades').run();
      this.db.prepare('DELETE FROM payments').run();
      this.db.prepare('DELETE FROM enrollments').run();
      this.db.prepare('DELETE FROM classes').run();
      this.db.prepare('DELETE FROM courses').run();
      this.db.prepare('DELETE FROM rooms').run();
      this.db.prepare('DELETE FROM instructors').run();
      this.db.prepare('DELETE FROM students').run();
      this.db.prepare('DELETE FROM expenses').run();
      this.db.prepare('DELETE FROM communications').run();
      this.db.prepare('DELETE FROM settings WHERE id = 1').run();

      this.insertStateNonDestructive(next);

      if (existingMeta) {
        this.db
          .prepare('UPDATE settings SET last_backup_at = ?, require_login = ? WHERE id = 1')
          .run(existingMeta.last_backup_at, existingMeta.require_login);
      }
    });

    tx();
  }

  public addPaymentTransactional(payment: Payment): InstituteState {
    if (!payment || !payment.id || !payment.enrollmentId || !payment.studentId) {
      throw new Error('اطلاعات تراکنش پرداخت ناقص است.');
    }
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('مبلغ پرداخت باید عددی مثبت و معتبر باشد.');
    }

    const tx = this.db.transaction(() => {
      const enr = this.db
        .prepare('SELECT id, student_id FROM enrollments WHERE id = ?')
        .get(payment.enrollmentId) as { id: string; student_id: string } | undefined;

      if (!enr || enr.student_id !== payment.studentId) {
        throw new Error('ثبت‌نام متناظر با این پرداخت در پایگاه داده یافت نشد.');
      }

      this.db
        .prepare(
          `INSERT INTO payments (
            id, enrollment_id, student_id, amount, date, method, reference_code, note, type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          payment.id,
          payment.enrollmentId,
          payment.studentId,
          amount,
          payment.date,
          payment.method,
          payment.referenceCode,
          payment.note,
          payment.type === 'refund' ? 'refund' : 'payment',
        );
    });

    tx();
    return this.getState();
  }

  public deleteStudentSafely(studentId: string): InstituteState {
    if (!studentId || typeof studentId !== 'string') {
      throw new Error('شناسه هنرجو معتبر نیست.');
    }

    const tx = this.db.transaction(() => {
      const existing = this.db
        .prepare('SELECT id FROM students WHERE id = ?')
        .get(studentId) as { id: string } | undefined;

      if (!existing) {
        throw new Error('پرونده هنرجو در پایگاه داده یافت نشد.');
      }

      this.db.prepare('DELETE FROM attendance_records WHERE student_id = ?').run(studentId);
      this.db.prepare('DELETE FROM grades WHERE student_id = ?').run(studentId);
      this.db.prepare('DELETE FROM payments WHERE student_id = ?').run(studentId);
      this.db.prepare('DELETE FROM enrollments WHERE student_id = ?').run(studentId);
      this.db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    });

    tx();
    return this.getState();
  }

  public resetToSeed(): InstituteState {
    this.saveFullState(SEED_DATA);
    return this.getState();
  }

  public getDbInfo(): DbInfo {
    const row = this.db
      .prepare('SELECT last_backup_at, require_login FROM settings WHERE id = 1')
      .get() as { last_backup_at: string | null; require_login: number } | undefined;

    const userCountRow = this.db
      .prepare('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1')
      .get() as { cnt: number };

    let dbSizeBytes = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        dbSizeBytes = fs.statSync(this.dbPath).size;
      }
    } catch {
      dbSizeBytes = 0;
    }

    return {
      dbPath: this.dbPath,
      dbSizeBytes,
      lastBackupAt: row?.last_backup_at ?? null,
      requireLogin: Boolean(row?.require_login),
      userCount: userCountRow?.cnt ?? 0,
      isDesktop: this.isDesktop,
    };
  }

  // Hot atomic SQLite backup using SQLite Online Backup API (safe while WAL is active)
  public async createBackup(destPath: string): Promise<{
    filePath: string;
    sizeBytes: number;
    createdAt: string;
  }> {
    const resolvedDest = path.resolve(destPath);
    const destDir = path.dirname(resolvedDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Checkpoint WAL before creating standalone snapshot
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    await this.db.backup(resolvedDest);

    const nowIso = new Date().toISOString();
    const sizeBytes = fs.existsSync(resolvedDest) ? fs.statSync(resolvedDest).size : 0;

    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE settings SET last_backup_at = ? WHERE id = 1').run(nowIso);
      this.db
        .prepare('INSERT INTO backup_logs (created_at, file_path, file_size, kind) VALUES (?, ?, ?, ?)')
        .run(nowIso, resolvedDest, sizeBytes, 'sqlite_backup');
    });
    tx();

    return { filePath: resolvedDest, sizeBytes, createdAt: nowIso };
  }

  public restoreFromBackupFile(srcPath: string): InstituteState {
    const resolvedSrc = path.resolve(srcPath);
    if (!fs.existsSync(resolvedSrc)) {
      throw new Error('فایل پشتیبان انتخاب‌شده وجود ندارد.');
    }

    const ext = path.extname(resolvedSrc).toLowerCase();
    if (ext === '.json') {
      const raw = fs.readFileSync(resolvedSrc, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!this.isValidStateShape(parsed)) {
        throw new Error('ساختار فایل JSON پشتیبان معتبر نیست.');
      }
      this.saveFullState(parsed);
      return this.getState();
    }

    // Validate SQLite backup file BEFORE replacing live database
    let probe: Database.Database | null = null;
    try {
      probe = new Database(resolvedSrc, { readonly: true, fileMustExist: true });
      const integrity = probe.pragma('integrity_check', { simple: true }) as string;
      if (integrity !== 'ok') {
        throw new Error('فایل پشتیبان SQLite سالم نیست.');
      }
      const tables = (
        probe
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as { name: string }[]
      ).map((t) => t.name);
      const requiredTables = ['settings', 'students', 'enrollments', 'payments'];
      for (const req of requiredTables) {
        if (!tables.includes(req)) {
          throw new Error('فایل انتخاب‌شده مربوط به پایگاه داده آموزشگاه نیست.');
        }
      }
    } finally {
      if (probe) {
        try {
          probe.close();
        } catch {
          // ignore
        }
      }
    }

    // Preserve safety copy before overwriting active database
    const safetyCopy = `${this.dbPath}.pre-restore-${Date.now()}.bak`;
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.dbPath, safetyCopy);

    this.close();

    try {
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${this.dbPath}${suffix}`;
        if (fs.existsSync(sidecar)) {
          fs.unlinkSync(sidecar);
        }
      }
      fs.copyFileSync(resolvedSrc, this.dbPath);
      this.db = this.openDatabase(this.dbPath);
      this.initSchema();
      return this.getState();
    } catch (err) {
      // Rollback from safety copy if replacement failed
      if (fs.existsSync(safetyCopy)) {
        fs.copyFileSync(safetyCopy, this.dbPath);
      }
      this.db = this.openDatabase(this.dbPath);
      throw err;
    }
  }

  // User & Admin Management (scrypt salted hashes; never returns password hashes)
  public listUsers(): SystemUser[] {
    const rows = this.db
      .prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at ASC')
      .all() as {
      id: string;
      username: string;
      full_name: string;
      role: UserRole;
      is_active: number;
      created_at: string;
    }[];

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      role: r.role,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
    }));
  }

  public createUser(input: {
    username: string;
    fullName: string;
    role: UserRole;
    password: string;
  }): SystemUser {
    const username = input.username.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const password = input.password;

    if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
      throw new Error('نام کاربری باید حداقل ۳ کاراکتر انگلیسی، عدد یا نقطه/خط‌تیره باشد.');
    }
    if (!fullName) {
      throw new Error('نام و نام خانوادگی کاربر الزامی است.');
    }
    if (!isValidRole(input.role)) {
      throw new Error('نقش کاربری معتبر نیست.');
    }
    if (password.length < 6) {
      throw new Error('رمز عبور باید حداقل ۶ کاراکتر باشد.');
    }

    const exists = this.db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username) as { id: string } | undefined;
    if (exists) {
      throw new Error('این نام کاربری قبلاً ثبت شده است.');
    }

    const { hash, salt } = hashPassword(password);
    const id = `usr-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO users (id, username, full_name, role, password_hash, salt, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, username, fullName, input.role, hash, salt, now, now);

    return {
      id,
      username,
      fullName,
      role: input.role,
      isActive: true,
      createdAt: now,
    };
  }

  public verifyLogin(usernameInput: string, password: string): SystemUser | null {
    const username = usernameInput.trim().toLowerCase();
    if (!username || !password) return null;

    const row = this.db
      .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
      .get(username) as
      | {
          id: string;
          username: string;
          full_name: string;
          role: UserRole;
          password_hash: string;
          salt: string;
          is_active: number;
          created_at: string;
        }
      | undefined;

    if (!row) return null;
    if (!verifyPasswordHash(password, row.password_hash, row.salt)) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  }

  public deleteUser(userId: string): void {
    const info = this.getDbInfo();
    const activeCount = this.db
      .prepare('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1')
      .get() as { cnt: number };

    if (info.requireLogin && activeCount.cnt <= 1) {
      throw new Error('هنگامی که ورود با رمز عبور فعال است، حداقل یک کاربر مدیر باید باقی بماند.');
    }

    this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  public setRequireLogin(enabled: boolean): DbInfo {
    if (enabled) {
      const cntRow = this.db
        .prepare('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1')
        .get() as { cnt: number };
      if ((cntRow?.cnt ?? 0) === 0) {
        throw new Error('پیش از فعال‌سازی قفل ورود، حداقل یک کاربر مدیر تعریف کنید.');
      }
    }
    this.db
      .prepare('UPDATE settings SET require_login = ?, updated_at = ? WHERE id = 1')
      .run(enabled ? 1 : 0, new Date().toISOString());
    return this.getDbInfo();
  }
}
