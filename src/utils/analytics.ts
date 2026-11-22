import type { InstituteState } from '../types/institute.ts';
import { formatNumber, formatScore, formatToman, getJalaliMonthKey, getJalaliMonthLabel } from './formatters.ts';

export interface CourseStat {
  courseId: string;
  title: string;
  category: string;
  enrollmentCount: number;
  activeClassesCount: number;
  totalCapacity: number;
  fillRate: number;
  totalTuitionValue: number;
  collectedRevenue: number;
}

export interface InstructorStat {
  instructorId: string;
  fullName: string;
  specialty: string;
  classesCount: number;
  studentsCount: number;
  avgScore: number;
  passRate: number;
  attendanceRate: number;
  fillRate: number;
  efficiencyIndex: number;
  generatedRevenue: number;
}

export interface MonthlyRevenueStat {
  monthKey: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
  net: number;
  enrollmentsCount: number;
}

export interface RoomUtilizationStat {
  roomId: string;
  name: string;
  capacity: number;
  classesCount: number;
  weeklyHours: number;
  utilizationPercent: number;
}

export interface SmartAdvisorInsight {
  id: string;
  category: 'رشد و ثبت‌نام' | 'بازدهی اساتید' | 'مدیریت مالی' | 'بهره‌وری فضا' | 'وضعیت آموزشی';
  priority: 'high' | 'medium' | 'positive';
  title: string;
  summary: string;
  recommendation: string;
}

export interface DebtorSummary {
  studentId: string;
  fullName: string;
  phone: string;
  code: string;
  totalTuition: number;
  totalPaid: number;
  balanceDue: number;
  activeCourses: string[];
}

export interface InstituteAnalytics {
  totalStudents: number;
  activeStudents: number;
  activeClasses: number;
  totalCapacity: number;
  totalActiveEnrollments: number;
  overallFillRate: number;
  totalContractedTuition: number;
  totalDiscountsGiven: number;
  totalCollectedRevenue: number;
  totalReceivables: number;
  totalExpenses: number;
  netProfit: number;
  overallAvgScore: number;
  overallPassRate: number;
  courseStats: CourseStat[];
  instructorStats: InstructorStat[];
  monthlyStats: MonthlyRevenueStat[];
  roomStats: RoomUtilizationStat[];
  debtors: DebtorSummary[];
  peakMonth: MonthlyRevenueStat | null;
  topCourse: CourseStat | null;
  topInstructor: InstructorStat | null;
  advisorInsights: SmartAdvisorInsight[];
}

export function computeInstituteAnalytics(state: InstituteState): InstituteAnalytics {
  const {
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
  } = state;

  const activeStudentsList = students.filter((s) => s.status === 'active');
  const activeClassesList = classes.filter((c) => c.status !== 'completed');
  const validEnrollments = enrollments.filter((e) => e.status !== 'dropped');

  // Enrollment payments map
  const paidByEnrollment = new Map<string, number>();
  for (const p of payments) {
    const signed = p.type === 'refund' ? -p.amount : p.amount;
    paidByEnrollment.set(p.enrollmentId, (paidByEnrollment.get(p.enrollmentId) ?? 0) + signed);
  }

  // Financials
  const totalContractedTuition = validEnrollments.reduce((sum, e) => sum + e.finalTuition, 0);
  const totalBaseTuition = validEnrollments.reduce((sum, e) => sum + e.baseTuition, 0);
  const totalDiscountsGiven = Math.max(0, totalBaseTuition - totalContractedTuition);
  const totalCollectedRevenue = payments.reduce(
    (sum, p) => sum + (p.type === 'refund' ? -p.amount : p.amount),
    0,
  );
  const totalReceivables = validEnrollments.reduce((sum, e) => {
    const paid = paidByEnrollment.get(e.id) ?? 0;
    return sum + Math.max(0, e.finalTuition - paid);
  }, 0);
  const totalExpenses = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const netProfit = totalCollectedRevenue - totalExpenses;

  // Capacity
  const totalCapacity = activeClassesList.reduce((sum, c) => sum + c.maxCapacity, 0);
  const activeClassIds = new Set(activeClassesList.map((c) => c.id));
  const totalActiveEnrollments = validEnrollments.filter((e) => activeClassIds.has(e.classId)).length;
  const overallFillRate = totalCapacity > 0 ? Math.round((totalActiveEnrollments / totalCapacity) * 100) : 0;

  // Overall Grades
  const overallAvgScore =
    grades.length > 0
      ? Number((grades.reduce((s, g) => s + g.totalScore, 0) / grades.length).toFixed(2))
      : 0;
  const passedCount = grades.filter((g) => g.totalScore >= settings.passingGrade).length;
  const overallPassRate = grades.length > 0 ? Math.round((passedCount / grades.length) * 100) : 0;

  // Course stats
  const courseStats: CourseStat[] = courses
    .map((course) => {
      const courseClasses = classes.filter((c) => c.courseId === course.id);
      const classIds = new Set(courseClasses.map((c) => c.id));
      const courseEnrollments = validEnrollments.filter((e) => classIds.has(e.classId));
      const cap = courseClasses.reduce((s, c) => s + c.maxCapacity, 0);
      const tuitionVal = courseEnrollments.reduce((s, e) => s + e.finalTuition, 0);
      const collected = courseEnrollments.reduce(
        (s, e) => s + (paidByEnrollment.get(e.id) ?? 0),
        0,
      );
      return {
        courseId: course.id,
        title: course.title,
        category: course.category,
        enrollmentCount: courseEnrollments.length,
        activeClassesCount: courseClasses.filter((c) => c.status !== 'completed').length,
        totalCapacity: cap,
        fillRate: cap > 0 ? Math.min(100, Math.round((courseEnrollments.length / cap) * 100)) : 0,
        totalTuitionValue: tuitionVal,
        collectedRevenue: collected,
      };
    })
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount || b.collectedRevenue - a.collectedRevenue);

  // Instructor efficiency stats
  const instructorStats: InstructorStat[] = instructors
    .map((inst) => {
      const instClasses = classes.filter((c) => c.instructorId === inst.id);
      const instClassIds = new Set(instClasses.map((c) => c.id));
      const instEnrollments = validEnrollments.filter((e) => instClassIds.has(e.classId));
      const cap = instClasses.reduce((s, c) => s + c.maxCapacity, 0);
      const fillRate = cap > 0 ? Math.min(100, Math.round((instEnrollments.length / cap) * 100)) : 0;

      const instGrades = grades.filter((g) => instClassIds.has(g.classId));
      const avgScore =
        instGrades.length > 0
          ? Number((instGrades.reduce((s, g) => s + g.totalScore, 0) / instGrades.length).toFixed(2))
          : 0;
      const passRate =
        instGrades.length > 0
          ? Math.round(
              (instGrades.filter((g) => g.totalScore >= settings.passingGrade).length /
                instGrades.length) *
                100,
            )
          : 0;

      const instAttendance = attendance.filter((a) => instClassIds.has(a.classId));
      let totalAttRecords = 0;
      let presentAttRecords = 0;
      for (const session of instAttendance) {
        for (const rec of session.records) {
          totalAttRecords += 1;
          if (rec.status === 'present' || rec.status === 'late') {
            presentAttRecords += 1;
          }
        }
      }
      const attendanceRate =
        totalAttRecords > 0 ? Math.round((presentAttRecords / totalAttRecords) * 100) : 90;

      const generatedRevenue = instEnrollments.reduce(
        (s, e) => s + (paidByEnrollment.get(e.id) ?? 0),
        0,
      );

      // Efficiency Index (0-100): 35% passRate + 25% (avgScore/20*100) + 20% fillRate + 20% attendanceRate
      const scorePct = (avgScore / 20) * 100;
      const efficiencyIndex =
        instClasses.length === 0
          ? 0
          : Math.round(
              (instGrades.length > 0 ? passRate * 0.35 + scorePct * 0.25 : 75 * 0.6) +
                fillRate * 0.2 +
                attendanceRate * 0.2,
            );

      return {
        instructorId: inst.id,
        fullName: inst.fullName,
        specialty: inst.specialty,
        classesCount: instClasses.length,
        studentsCount: instEnrollments.length,
        avgScore,
        passRate,
        attendanceRate,
        fillRate,
        efficiencyIndex,
        generatedRevenue,
      };
    })
    .sort((a, b) => b.efficiencyIndex - a.efficiencyIndex || b.studentsCount - a.studentsCount);

  // Monthly revenue & expenses
  const monthMap = new Map<
    string,
    { revenue: number; expenses: number; enrollmentsCount: number }
  >();
  for (const p of payments) {
    const key = getJalaliMonthKey(p.date);
    const cur = monthMap.get(key) ?? { revenue: 0, expenses: 0, enrollmentsCount: 0 };
    cur.revenue += p.type === 'refund' ? -p.amount : p.amount;
    monthMap.set(key, cur);
  }
  for (const ex of expenses) {
    const key = getJalaliMonthKey(ex.date);
    const cur = monthMap.get(key) ?? { revenue: 0, expenses: 0, enrollmentsCount: 0 };
    cur.expenses += ex.amount;
    monthMap.set(key, cur);
  }
  for (const en of validEnrollments) {
    const key = getJalaliMonthKey(en.enrolledAt);
    const cur = monthMap.get(key) ?? { revenue: 0, expenses: 0, enrollmentsCount: 0 };
    cur.enrollmentsCount += 1;
    monthMap.set(key, cur);
  }

  const monthlyStats: MonthlyRevenueStat[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, vals]) => ({
      monthKey,
      monthLabel: getJalaliMonthLabel(`${monthKey}/01`),
      revenue: vals.revenue,
      expenses: vals.expenses,
      net: vals.revenue - vals.expenses,
      enrollmentsCount: vals.enrollmentsCount,
    }));

  // Room utilization
  const roomStats: RoomUtilizationStat[] = rooms.map((room) => {
    const roomClasses = activeClassesList.filter((c) => c.roomId === room.id);
    let weeklyMinutes = 0;
    for (const c of roomClasses) {
      const [sh, sm] = c.startTime.split(':').map(Number);
      const [eh, em] = c.endTime.split(':').map(Number);
      const dur = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      weeklyMinutes += dur * c.days.length;
    }
    const weeklyHours = Number((weeklyMinutes / 60).toFixed(1));
    // Assuming 48 prime operating hours per week (6 days * 8 hrs)
    const utilizationPercent = Math.min(100, Math.round((weeklyHours / 48) * 100));
    return {
      roomId: room.id,
      name: room.name,
      capacity: room.capacity,
      classesCount: roomClasses.length,
      weeklyHours,
      utilizationPercent,
    };
  });

  // Debtors
  const debtorsMap = new Map<string, DebtorSummary>();
  for (const en of validEnrollments) {
    const paid = paidByEnrollment.get(en.id) ?? 0;
    const due = Math.max(0, en.finalTuition - paid);
    const student = students.find((s) => s.id === en.studentId);
    if (!student) continue;
    const cls = classes.find((c) => c.id === en.classId);
    const course = courses.find((cr) => cr.id === cls?.courseId);
    const existing = debtorsMap.get(student.id) ?? {
      studentId: student.id,
      fullName: student.fullName,
      phone: student.phone,
      code: student.code,
      totalTuition: 0,
      totalPaid: 0,
      balanceDue: 0,
      activeCourses: [],
    };
    existing.totalTuition += en.finalTuition;
    existing.totalPaid += paid;
    existing.balanceDue += due;
    if (course && !existing.activeCourses.includes(course.title)) {
      existing.activeCourses.push(course.title);
    }
    debtorsMap.set(student.id, existing);
  }
  const debtors = Array.from(debtorsMap.values())
    .filter((d) => d.balanceDue > 0)
    .sort((a, b) => b.balanceDue - a.balanceDue);

  const peakMonth =
    monthlyStats.length > 0
      ? [...monthlyStats].sort((a, b) => b.revenue - a.revenue)[0]
      : null;
  const topCourse = courseStats[0] ?? null;
  const topInstructor = instructorStats.find((i) => i.classesCount > 0) ?? null;

  // Smart Advisor Insights
  const advisorInsights: SmartAdvisorInsight[] = [];

  if (topCourse && topCourse.enrollmentCount > 0) {
    advisorInsights.push({
      id: 'insight-top-course',
      category: 'رشد و ثبت‌نام',
      priority: 'positive',
      title: `پرتقاضاترین دوره: «${topCourse.title}»`,
      summary: `این دوره با ${formatNumber(topCourse.enrollmentCount)} هنرجو و نرخ تکمیل ظرفیت ${formatNumber(topCourse.fillRate)}٪ بیشترین سهم ثبت‌نام آموزشگاه را دارد.`,
      recommendation:
        topCourse.fillRate >= 80
          ? 'پیشنهاد می‌شود یک کد جدید در نوبت عصر یا آخر هفته برای این دوره تعریف کنید تا تقاضای مازاد جذب شود.'
          : 'تمرکز تبلیغات روی تکمیل ظرفیت باقیمانده این دوره بازگشت سرمایه سریعی دارد.',
    });
  }

  if (topInstructor) {
    advisorInsights.push({
      id: 'insight-top-instructor',
      category: 'بازدهی اساتید',
      priority: 'positive',
      title: `بالاترین بازدهی تدریس: ${topInstructor.fullName}`,
      summary: `شاخص بازدهی ${formatNumber(topInstructor.efficiencyIndex)} از ۱۰۰ (میانگین نمره هنرجویان ${formatScore(topInstructor.avgScore)} و نرخ قبولی ${formatNumber(topInstructor.passRate)}٪).`,
      recommendation:
        'تخصیص کلاس‌های سطوح پیشرفته یا دوره‌های کلیدی ترم آینده به این استاد، نرخ ماندگاری هنرجویان را افزایش می‌دهد.',
    });
  }

  if (peakMonth) {
    advisorInsights.push({
      id: 'insight-peak-revenue',
      category: 'مدیریت مالی',
      priority: 'positive',
      title: `اوج درآمدزایی در «${peakMonth.monthLabel}»`,
      summary: `در این ماه مبلغ ${formatToman(peakMonth.revenue)} درآمد وصول شده و ${formatNumber(peakMonth.enrollmentsCount)} ثبت‌نام جدید به ثبت رسیده است.`,
      recommendation:
        'پیشنهاد می‌شود کمپین‌های پیش‌ثبت‌نام و تخفیف زودهنگام را دو هفته پیش از این بازه زمانی فعال کنید.',
    });
  }

  if (totalReceivables > 0) {
    advisorInsights.push({
      id: 'insight-receivables',
      category: 'مدیریت مالی',
      priority: 'high',
      title: `${formatToman(totalReceivables)} شهریه معوق نزد ${formatNumber(debtors.length)} هنرجو`,
      summary: `در حال حاضر ${formatNumber(Math.round((totalReceivables / Math.max(1, totalContractedTuition)) * 100))}٪ از کل شهریه‌های قراردادشده هنوز تسویه نشده است.`,
      recommendation:
        'از بخش «ارتباط با هنرجویان» پیامک یادآور قسط برای بدهکاران ارسال کرده و تسویه پیش از آزمون پایان‌ترم را الزامی کنید.',
    });
  }

  const lowUtilRooms = roomStats.filter((r) => r.utilizationPercent < 25);
  if (lowUtilRooms.length > 0) {
    advisorInsights.push({
      id: 'insight-room-util',
      category: 'بهره‌وری فضا',
      priority: 'medium',
      title: `ظرفیت خالی در ${formatNumber(lowUtilRooms.length)} فضای آموزشی`,
      summary: `فضای «${lowUtilRooms[0].name}» تنها ${formatNumber(lowUtilRooms[0].weeklyHours)} ساعت در هفته اشغال است (${formatNumber(lowUtilRooms[0].utilizationPercent)}٪ بهره‌وری).`,
      recommendation:
        'برگزاری کارگاه‌های تک‌جلسه‌ای یا کلاس‌های تقویتی آخر هفته در این اتاق می‌تواند بدون هزینه اجاره جدید درآمد بسازد.',
    });
  }

  const lowScoreClasses = classes.filter((cls) => {
    const clsGrades = grades.filter((g) => g.classId === cls.id);
    if (clsGrades.length === 0) return false;
    const avg = clsGrades.reduce((s, g) => s + g.totalScore, 0) / clsGrades.length;
    return avg < settings.passingGrade + 1.5;
  });
  if (lowScoreClasses.length > 0) {
    advisorInsights.push({
      id: 'insight-academic-risk',
      category: 'وضعیت آموزشی',
      priority: 'medium',
      title: `نیاز به پشتیبانی آموزشی در کلاس «${lowScoreClasses[0].title}»`,
      summary: 'میانگین نمرات ارزیابی‌شده این کلاس نزدیک به حد نصاب قبولی است.',
      recommendation:
        'برگزاری یک جلسه رفع اشکال یا ارسال تمرین‌های تکمیلی پیش از آزمون نهایی پیشنهاد می‌شود.',
    });
  }

  return {
    totalStudents: students.length,
    activeStudents: activeStudentsList.length,
    activeClasses: activeClassesList.length,
    totalCapacity,
    totalActiveEnrollments,
    overallFillRate,
    totalContractedTuition,
    totalDiscountsGiven,
    totalCollectedRevenue,
    totalReceivables,
    totalExpenses,
    netProfit,
    overallAvgScore,
    overallPassRate,
    courseStats,
    instructorStats,
    monthlyStats,
    roomStats,
    debtors,
    peakMonth,
    topCourse,
    topInstructor,
    advisorInsights,
  };
}
