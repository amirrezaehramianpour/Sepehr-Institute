import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { SEED_DATA } from './data/seedData.ts';
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
  NavSection,
  Payment,
  Room,
  Student,
  StudentStatus,
  SystemUser,
} from './types/institute.ts';
import { desktopApi } from './services/desktopApi.ts';
import { computeInstituteAnalytics } from './utils/analytics.ts';
import { LayoutShell } from './components/LayoutShell.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { StudentsView } from './components/StudentsView.tsx';
import { CoursesView } from './components/CoursesView.tsx';
import { InstructorsView } from './components/InstructorsView.tsx';
import { StudentRegistrationModal } from './components/StudentRegistrationModal.tsx';
import { ScheduleView } from './components/ScheduleView.tsx';
import { AttendanceView } from './components/AttendanceView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { GradesView } from './components/GradesView.tsx';
import { AnalyticsAdvisorView } from './components/AnalyticsAdvisorView.tsx';
import { CommunicationsView } from './components/CommunicationsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import defaultEmblem from './assets/images/jewelry_emblem_1795358999694.jpg';

export default function App() {
  const [state, setState] = useState<InstituteState>(SEED_DATA);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');

  // Cross-module UI coordination states
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [enrollTargetStudentId, setEnrollTargetStudentId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [quickPayStudentId, setQuickPayStudentId] = useState<string | null>(null);
  const [reportCardTarget, setReportCardTarget] = useState<{
    studentId: string;
    classId: string;
  } | null>(null);
  const [commDebtorStudentId, setCommDebtorStudentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([desktopApi.getState(), desktopApi.getDbInfo()])
      .then(([data, info]) => {
        if (!active) return;
        if (data && data.settings && Array.isArray(data.students)) {
          setState(data);
        }
        setDbInfo(info);
      })
      .catch(() => {
        // Fallback to seed state if initialization fails
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persistState = useCallback((updater: (prev: InstituteState) => InstituteState) => {
    setState((prev) => {
      const next = updater(prev);
      setSavingState('saving');
      desktopApi
        .saveState(next)
        .then(() => {
          setSavingState('saved');
          desktopApi.getDbInfo().then(setDbInfo).catch(() => undefined);
        })
        .catch(() => {
          setSavingState('error');
        });
      return next;
    });
  }, []);

  const analytics = useMemo(() => computeInstituteAnalytics(state), [state]);

  // Handlers
  const handleAddStudentWithOptionalEnrollment = (payload: {
    student: Student;
    enrollment?: Enrollment;
    payment?: Payment;
  }) => {
    persistState((prev) => ({
      ...prev,
      students: [payload.student, ...prev.students],
      enrollments: payload.enrollment
        ? [payload.enrollment, ...prev.enrollments]
        : prev.enrollments,
      payments: payload.payment ? [payload.payment, ...prev.payments] : prev.payments,
    }));
    setRegModalOpen(false);
    setEnrollTargetStudentId(null);
    setActiveNav('students');
    setSelectedStudentId(payload.student.id);
  };

  const handleAddEnrollmentOnly = (payload: {
    enrollment: Enrollment;
    payment?: Payment;
  }) => {
    persistState((prev) => ({
      ...prev,
      enrollments: [payload.enrollment, ...prev.enrollments],
      payments: payload.payment ? [payload.payment, ...prev.payments] : prev.payments,
    }));
    setRegModalOpen(false);
    setEnrollTargetStudentId(null);
  };

  const handleUpdateStudentStatus = (studentId: string, status: StudentStatus) => {
    persistState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === studentId ? { ...s, status } : s)),
    }));
  };

  const handleUpdateStudent = (student: Student) => {
    persistState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === student.id ? student : s)),
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    setSavingState('saving');
    desktopApi
      .deleteStudent(studentId)
      .then((updated) => {
        setState(updated);
        setSelectedStudentId(null);
        setSavingState('saved');
        desktopApi.getDbInfo().then(setDbInfo).catch(() => undefined);
      })
      .catch(() => {
        setSavingState('error');
      });
  };

  const handleSaveClass = (cls: ClassSection) => {
    persistState((prev) => {
      const exists = prev.classes.some((c) => c.id === cls.id);
      return {
        ...prev,
        classes: exists
          ? prev.classes.map((c) => (c.id === cls.id ? cls : c))
          : [cls, ...prev.classes],
      };
    });
  };

  const handleDeleteClass = (classId: string) => {
    persistState((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== classId),
    }));
  };

  const handleSaveCourse = (course: Course) => {
    persistState((prev) => {
      const exists = prev.courses.some((c) => c.id === course.id);
      return {
        ...prev,
        courses: exists
          ? prev.courses.map((c) => (c.id === course.id ? course : c))
          : [course, ...prev.courses],
      };
    });
  };

  const handleDeleteCourse = (courseId: string) => {
    persistState((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== courseId),
    }));
  };

  const handleSaveRoom = (room: Room) => {
    persistState((prev) => {
      const exists = prev.rooms.some((r) => r.id === room.id);
      return {
        ...prev,
        rooms: exists
          ? prev.rooms.map((r) => (r.id === room.id ? room : r))
          : [room, ...prev.rooms],
      };
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    persistState((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }));
  };

  const handleSaveInstructor = (inst: Instructor) => {
    persistState((prev) => {
      const exists = prev.instructors.some((i) => i.id === inst.id);
      return {
        ...prev,
        instructors: exists
          ? prev.instructors.map((i) => (i.id === inst.id ? inst : i))
          : [inst, ...prev.instructors],
      };
    });
  };

  const handleDeleteInstructor = (instructorId: string) => {
    persistState((prev) => ({
      ...prev,
      instructors: prev.instructors.filter((i) => i.id !== instructorId),
    }));
  };

  const handleSaveAttendanceSession = (session: AttendanceSession) => {
    persistState((prev) => {
      const exists = prev.attendance.some((a) => a.id === session.id);
      return {
        ...prev,
        attendance: exists
          ? prev.attendance.map((a) => (a.id === session.id ? session : a))
          : [session, ...prev.attendance],
      };
    });
  };

  const handleAddPayment = (payment: Payment) => {
    setSavingState('saving');
    desktopApi
      .addPayment(payment)
      .then((updated) => {
        setState(updated);
        setSavingState('saved');
      })
      .catch(() => {
        setSavingState('error');
      });
  };

  const handleAddExpense = (expense: Expense) => {
    persistState((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  };

  const handleSaveClassGrades = (records: GradeRecord[]) => {
    persistState((prev) => {
      const map = new Map(prev.grades.map((g) => [`${g.classId}:${g.studentId}`, g]));
      for (const r of records) {
        map.set(`${r.classId}:${r.studentId}`, r);
      }
      return {
        ...prev,
        grades: Array.from(map.values()),
      };
    });
  };

  const handleSendCommunication = (log: CommunicationLog) => {
    persistState((prev) => ({
      ...prev,
      communications: [log, ...prev.communications],
    }));
  };

  const handleSaveSettings = (settings: InstituteSettings) => {
    persistState((prev) => ({
      ...prev,
      settings,
    }));
  };

  const handleRestoreState = (newState: InstituteState) => {
    setState(newState);
    desktopApi.getDbInfo().then(setDbInfo).catch(() => undefined);
  };

  const handleResetDemo = () => {
    setSavingState('saving');
    desktopApi
      .resetDemo()
      .then((data) => {
        setState(data);
        setSavingState('saved');
        desktopApi.getDbInfo().then(setDbInfo).catch(() => undefined);
      })
      .catch(() => {
        setState(SEED_DATA);
        setSavingState('error');
      });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const user = await desktopApi.verifyLogin(loginUsername, loginPassword);
      if (!user) {
        setLoginError('نام کاربری یا رمز عبور نادرست است.');
        return;
      }
      setCurrentUser(user);
      setLoginPassword('');
    } catch (err) {
      setLoginError((err as Error).message || 'خطا در بررسی اطلاعات ورود');
    }
  };

  if (!loading && dbInfo?.requireLogin && !currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-sm bg-white border border-[#E6DFD3] rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-[#F0EAE0] pb-4">
            <img
              src={state.settings.logoUrl || defaultEmblem}
              alt={state.settings.name}
              className="w-12 h-12 rounded-xl border border-[#D4AF37]/40 bg-[#181614] object-cover"
            />
            <div>
              <h1 className="text-sm font-bold text-stone-900">{state.settings.name}</h1>
              <p className="text-[11px] text-stone-500 mt-0.5">ورود به نرم‌افزار دسکتاپ</p>
            </div>
          </div>

          {loginError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {loginError}
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">نام کاربری</label>
              <input
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg font-code focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">رمز عبور</label>
              <input
                required
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-9 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>ورود به سیستم</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <LayoutShell
      activeNav={activeNav}
      onNavigate={(section) => setActiveNav(section)}
      state={state}
      savingState={savingState}
      onSelectStudentFromSearch={(studentId) => {
        setActiveNav('students');
        setSelectedStudentId(studentId);
      }}
    >
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white border border-[#E6DFD3] rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-white border border-[#E6DFD3] rounded-xl" />
        </div>
      ) : (
        <>
          {activeNav === 'dashboard' && (
            <DashboardView
              state={state}
              analytics={analytics}
              onNavigate={(sec) => setActiveNav(sec)}
              onOpenQuickPayment={(stuId) => {
                setQuickPayStudentId(stuId);
                setActiveNav('finance');
              }}
              onOpenStudentFile={(stuId) => {
                setSelectedStudentId(stuId);
                setActiveNav('students');
              }}
            />
          )}

          {activeNav === 'students' && (
            <StudentsView
              state={state}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              onOpenNewStudentModal={() => {
                setEnrollTargetStudentId(null);
                setRegModalOpen(true);
              }}
              onOpenEnrollForStudent={(stuId) => {
                setEnrollTargetStudentId(stuId);
                setRegModalOpen(true);
              }}
              onOpenQuickPayment={(stuId) => {
                setQuickPayStudentId(stuId);
                setActiveNav('finance');
              }}
              onOpenReportCard={(stuId, clsId) => {
                setReportCardTarget({ studentId: stuId, classId: clsId });
                setActiveNav('grades');
              }}
              onUpdateStudentStatus={handleUpdateStudentStatus}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
            />
          )}

          {activeNav === 'courses' && (
            <CoursesView
              state={state}
              onSaveCourse={handleSaveCourse}
              onDeleteCourse={handleDeleteCourse}
            />
          )}

          {activeNav === 'instructors' && (
            <InstructorsView
              state={state}
              onSaveInstructor={handleSaveInstructor}
              onDeleteInstructor={handleDeleteInstructor}
            />
          )}

          {activeNav === 'schedule' && (
            <ScheduleView
              state={state}
              onSaveClass={handleSaveClass}
              onDeleteClass={handleDeleteClass}
              onSaveRoom={handleSaveRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          )}

          {activeNav === 'attendance' && (
            <AttendanceView
              state={state}
              onSaveAttendanceSession={handleSaveAttendanceSession}
            />
          )}

          {activeNav === 'finance' && (
            <FinanceView
              state={state}
              analytics={analytics}
              quickPayStudentId={quickPayStudentId}
              onClearQuickPay={() => setQuickPayStudentId(null)}
              onAddPayment={handleAddPayment}
              onAddExpense={handleAddExpense}
              onRemindDebtor={(stuId) => {
                setCommDebtorStudentId(stuId);
                setActiveNav('communications');
              }}
            />
          )}

          {activeNav === 'grades' && (
            <GradesView
              state={state}
              initialReportSelection={reportCardTarget}
              onClearReportSelection={() => setReportCardTarget(null)}
              onSaveClassGrades={handleSaveClassGrades}
            />
          )}

          {activeNav === 'analytics' && (
            <AnalyticsAdvisorView analytics={analytics} />
          )}

          {activeNav === 'communications' && (
            <CommunicationsView
              state={state}
              analytics={analytics}
              initialDebtorStudentId={commDebtorStudentId}
              onClearInitialDebtor={() => setCommDebtorStudentId(null)}
              onSendCommunication={handleSendCommunication}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView
              state={state}
              dbInfo={dbInfo}
              onSaveSettings={handleSaveSettings}
              onRestoreState={handleRestoreState}
              onDbInfoUpdated={setDbInfo}
              onResetDemo={handleResetDemo}
            />
          )}
        </>
      )}

      {regModalOpen && (
        <StudentRegistrationModal
          state={state}
          initialStudentId={enrollTargetStudentId}
          onClose={() => {
            setRegModalOpen(false);
            setEnrollTargetStudentId(null);
          }}
          onSubmitNewStudent={handleAddStudentWithOptionalEnrollment}
          onSubmitEnrollmentOnly={handleAddEnrollmentOnly}
        />
      )}
    </LayoutShell>
  );
}
