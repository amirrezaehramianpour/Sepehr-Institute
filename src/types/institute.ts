export type WeekDay = 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنجشنبه';

export type StudentStatus = 'active' | 'graduated' | 'inactive';
export type ClassStatus = 'scheduled' | 'ongoing' | 'completed';
export type DiscountType = 'none' | 'percent' | 'amount';
export type PaymentMethod = 'کارتخوان' | 'کارت به کارت' | 'نقدی' | 'چک / اقساط' | 'درگاه آنلاین';
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';
export type ExpenseCategory = 'حق‌التدریس اساتید' | 'اجاره و شارژ' | 'تجهیزات و پشتیبانی' | 'تبلیغات' | 'سایر';
export type CommunicationChannel = 'پیامک' | 'اطلاعیه داخلی' | 'تماس تلفنی';

export interface InstituteSettings {
  name: string;
  subtitle: string;
  managerName: string;
  phone: string;
  address: string;
  currentTerm: string;
  passingGrade: number;
  logoUrl?: string;
  gradeWeights: {
    midterm: number;
    finalExam: number;
    practical: number;
    classActivity: number;
  };
}

export interface Student {
  id: string;
  code: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  emergencyPhone: string;
  education: string;
  address: string;
  notes: string;
  registeredAt: string;
  status: StudentStatus;
}

export interface Instructor {
  id: string;
  fullName: string;
  specialty: string;
  phone: string;
  email: string;
  commissionPercent: number;
  hourlyRate: number;
  joinedAt: string;
  status: 'active' | 'inactive';
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  equipment: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  category: string;
  totalHours: number;
  sessionsCount: number;
  baseTuition: number;
  description: string;
}

export interface ClassSection {
  id: string;
  courseId: string;
  instructorId: string;
  roomId: string;
  title: string;
  term: string;
  days: WeekDay[];
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  startDate: string; // Jalali YYYY/MM/DD
  maxCapacity: number;
  status: ClassStatus;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  enrolledAt: string; // Jalali YYYY/MM/DD
  baseTuition: number;
  discountType: DiscountType;
  discountValue: number;
  discountReason: string;
  finalTuition: number;
  status: 'active' | 'completed' | 'dropped';
}

export interface Payment {
  id: string;
  enrollmentId: string;
  studentId: string;
  amount: number;
  date: string; // Jalali YYYY/MM/DD
  method: PaymentMethod;
  referenceCode: string;
  note: string;
  type: 'payment' | 'refund';
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // Jalali YYYY/MM/DD
  note: string;
}

export interface GradeRecord {
  id: string;
  enrollmentId: string;
  studentId: string;
  classId: string;
  midterm: number;
  finalExam: number;
  practical: number;
  classActivity: number;
  totalScore: number;
  teacherComment: string;
  updatedAt: string;
  published: boolean;
}

export interface AttendanceItem {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string; // Jalali YYYY/MM/DD
  topic: string;
  records: AttendanceItem[];
}

export interface CommunicationLog {
  id: string;
  recipientType: 'student' | 'class' | 'debtors';
  recipientLabel: string;
  channel: CommunicationChannel;
  subject: string;
  message: string;
  sentAt: string;
  count: number;
}

export interface InstituteState {
  settings: InstituteSettings;
  students: Student[];
  instructors: Instructor[];
  rooms: Room[];
  courses: Course[];
  classes: ClassSection[];
  enrollments: Enrollment[];
  payments: Payment[];
  expenses: Expense[];
  grades: GradeRecord[];
  attendance: AttendanceSession[];
  communications: CommunicationLog[];
}

export type NavSection =
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'instructors'
  | 'schedule'
  | 'attendance'
  | 'finance'
  | 'grades'
  | 'analytics'
  | 'communications'
  | 'settings';

export type UserRole = 'مدیر کل' | 'مسئول ثبت‌نام' | 'حسابدار';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface DbInfo {
  dbPath: string;
  dbSizeBytes: number;
  lastBackupAt: string | null;
  requireLogin: boolean;
  userCount: number;
  isDesktop: boolean;
}

