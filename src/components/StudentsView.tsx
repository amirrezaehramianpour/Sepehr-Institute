import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  UserPlus,
  Download,
  FileText,
  CreditCard,
  Award,
  X,
  Plus,
  Edit3,
  Save,
  Receipt,
  Trash2,
} from 'lucide-react';
import type { InstituteState, Student, StudentStatus } from '../types/institute.ts';
import {
  downloadCsv,
  formatNumber,
  formatScore,
  formatToman,
  toPersianDigits,
} from '../utils/formatters.ts';

interface StudentsViewProps {
  state: InstituteState;
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string | null) => void;
  onOpenNewStudentModal: () => void;
  onOpenEnrollForStudent: (studentId: string) => void;
  onOpenQuickPayment: (studentId: string) => void;
  onOpenReportCard: (studentId: string, classId: string) => void;
  onUpdateStudentStatus: (studentId: string, status: StudentStatus) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
}

type StudentFilter = 'all' | 'active' | 'debtors' | 'graduated';
type DrawerTab = 'courses-payments' | 'attendance' | 'grades';

export const StudentsView: React.FC<StudentsViewProps> = ({
  state,
  selectedStudentId,
  onSelectStudent,
  onOpenNewStudentModal,
  onOpenEnrollForStudent,
  onOpenQuickPayment,
  onOpenReportCard,
  onUpdateStudentStatus,
  onUpdateStudent,
  onDeleteStudent,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('courses-payments');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Student | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const studentFinancials = useMemo(() => {
    const map = new Map<
      string,
      { totalTuition: number; totalPaid: number; balance: number; classes: string[] }
    >();
    for (const s of state.students) {
      map.set(s.id, { totalTuition: 0, totalPaid: 0, balance: 0, classes: [] });
    }
    const paidByEnr = new Map<string, number>();
    for (const p of state.payments) {
      const signed = p.type === 'refund' ? -p.amount : p.amount;
      paidByEnr.set(p.enrollmentId, (paidByEnr.get(p.enrollmentId) ?? 0) + signed);
    }
    for (const en of state.enrollments) {
      if (en.status === 'dropped') continue;
      const item = map.get(en.studentId);
      if (!item) continue;
      const paid = paidByEnr.get(en.id) ?? 0;
      item.totalTuition += en.finalTuition;
      item.totalPaid += paid;
      item.balance += Math.max(0, en.finalTuition - paid);
      const cls = state.classes.find((c) => c.id === en.classId);
      if (cls) item.classes.push(cls.title);
    }
    return map;
  }, [state.students, state.enrollments, state.payments, state.classes]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.students.filter((stu) => {
      const fin = studentFinancials.get(stu.id);
      if (filter === 'active' && stu.status !== 'active') return false;
      if (filter === 'graduated' && stu.status !== 'graduated') return false;
      if (filter === 'debtors' && (!fin || fin.balance <= 0)) return false;

      if (!q) return true;
      return (
        stu.fullName.toLowerCase().includes(q) ||
        stu.phone.includes(q) ||
        stu.nationalId.includes(q) ||
        stu.code.toLowerCase().includes(q)
      );
    });
  }, [state.students, studentFinancials, filter, query]);

  const selectedStudent = selectedStudentId
    ? state.students.find((s) => s.id === selectedStudentId)
    : undefined;

  useEffect(() => {
    setEditingProfile(false);
    setConfirmDeleteOpen(false);
    setDrawerTab('courses-payments');
    if (selectedStudent) {
      setEditForm(selectedStudent);
    } else {
      setEditForm(null);
    }
  }, [selectedStudentId, selectedStudent]);

  // Comprehensive profile statistics for selected student
  const selectedProfileSummary = useMemo(() => {
    if (!selectedStudent) return null;
    const enrs = state.enrollments.filter(
      (e) => e.studentId === selectedStudent.id && e.status !== 'dropped',
    );
    const totalBase = enrs.reduce((s, e) => s + e.baseTuition, 0);
    const totalFinal = enrs.reduce((s, e) => s + e.finalTuition, 0);
    const totalDiscount = Math.max(0, totalBase - totalFinal);
    const stuPayments = state.payments.filter((p) => p.studentId === selectedStudent.id);
    const totalPaid = stuPayments.reduce(
      (s, p) => s + (p.type === 'refund' ? -p.amount : p.amount),
      0,
    );
    const totalBalance = Math.max(0, totalFinal - totalPaid);

    const stuGrades = state.grades.filter((g) => g.studentId === selectedStudent.id);
    const avgScore =
      stuGrades.length > 0
        ? stuGrades.reduce((s, g) => s + g.totalScore, 0) / stuGrades.length
        : null;

    const attendanceHistory: {
      id: string;
      date: string;
      classTitle: string;
      topic: string;
      status: 'present' | 'absent' | 'excused' | 'late';
    }[] = [];

    for (const sess of state.attendance) {
      const rec = sess.records.find((r) => r.studentId === selectedStudent.id);
      if (rec) {
        const cls = state.classes.find((c) => c.id === sess.classId);
        attendanceHistory.push({
          id: sess.id,
          date: sess.date,
          classTitle: cls?.title ?? 'کلاس',
          topic: sess.topic,
          status: rec.status,
        });
      }
    }
    attendanceHistory.sort((a, b) => b.date.localeCompare(a.date));

    const presentCount = attendanceHistory.filter(
      (a) => a.status === 'present' || a.status === 'late',
    ).length;
    const attendancePercent =
      attendanceHistory.length > 0
        ? Math.round((presentCount / attendanceHistory.length) * 100)
        : null;

    return {
      enrollments: enrs,
      totalBase,
      totalDiscount,
      totalFinal,
      totalPaid,
      totalBalance,
      avgScore,
      grades: stuGrades,
      attendanceHistory,
      attendancePercent,
    };
  }, [selectedStudent, state.enrollments, state.payments, state.grades, state.attendance, state.classes]);

  const handleExportCsv = () => {
    downloadCsv(
      'students-list.csv',
      [
        'کد هنرجو',
        'نام و نام خانوادگی',
        'کد ملی',
        'موبایل',
        'تحصیلات',
        'تاریخ ثبت‌نام',
        'شهریه کل',
        'پرداختی',
        'مانده بدهی',
      ],
      filteredStudents.map((s) => {
        const fin = studentFinancials.get(s.id) ?? {
          totalTuition: 0,
          totalPaid: 0,
          balance: 0,
        };
        return [
          s.code,
          s.fullName,
          s.nationalId,
          s.phone,
          s.education,
          s.registeredAt,
          fin.totalTuition,
          fin.totalPaid,
          fin.balance,
        ];
      }),
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو با نام، کد ملی، موبایل یا کد هنرجو..."
              className="w-full h-9 pr-9 pl-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
            {[
              { id: 'all', label: 'همه' },
              { id: 'active', label: 'فعال' },
              { id: 'debtors', label: 'بدهکاران' },
              { id: 'graduated', label: 'فارغ‌التحصیل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as StudentFilter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCsv}
            className="h-9 px-3.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-700 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
          <button
            onClick={onOpenNewStudentModal}
            className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>پذیرش هنرجوی جدید</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-stone-700">
              هیچ هنرجویی مطابق فیلتر انتخاب‌شده یافت نشد.
            </p>
            <button
              onClick={onOpenNewStudentModal}
              className="px-4 py-2 bg-[#8E5F15] hover:bg-[#754D10] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              ثبت‌نام اولین هنرجو
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">کد پرونده</th>
                  <th className="py-3 px-3">نام و نام خانوادگی</th>
                  <th className="py-3 px-3">شماره تماس</th>
                  <th className="py-3 px-3">دوره‌های ثبت‌نامی</th>
                  <th className="py-3 px-3">وضعیت مالی</th>
                  <th className="py-3 px-3">وضعیت</th>
                  <th className="py-3 px-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-xs">
                {filteredStudents.map((stu) => {
                  const fin = studentFinancials.get(stu.id) ?? {
                    totalTuition: 0,
                    totalPaid: 0,
                    balance: 0,
                    classes: [],
                  };
                  return (
                    <tr
                      key={stu.id}
                      onClick={() => onSelectStudent(stu.id)}
                      className={`hover:bg-[#FAF8F5] cursor-pointer transition-colors ${
                        selectedStudentId === stu.id ? 'bg-[#FBF6EB]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-code text-stone-600 tabular-nums">
                        {stu.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-stone-900">{stu.fullName}</div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          کد ملی: {toPersianDigits(stu.nationalId)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-700 tabular-nums">
                        {toPersianDigits(stu.phone)}
                      </td>
                      <td className="py-3 px-3 text-stone-600 max-w-xs truncate">
                        {fin.classes.length > 0 ? fin.classes.join(' · ') : 'بدون کلاس فعال'}
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {fin.balance > 0 ? (
                          <span className="font-semibold text-amber-700">
                            بدهکار: {formatToman(fin.balance)}
                          </span>
                        ) : fin.totalTuition > 0 ? (
                          <span className="font-medium text-emerald-700">تسویه کامل</span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-medium ${
                            stu.status === 'active'
                              ? 'text-emerald-700'
                              : stu.status === 'graduated'
                              ? 'text-[#8E5F15]'
                              : 'text-stone-500'
                          }`}
                        >
                          {stu.status === 'active'
                            ? 'در حال تحصیل'
                            : stu.status === 'graduated'
                            ? 'فارغ‌التحصیل'
                            : 'غیرفعال'}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onSelectStudent(stu.id)}
                            className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>پرونده جامع</span>
                          </button>
                          {fin.balance > 0 && (
                            <button
                              onClick={() => onOpenQuickPayment(stu.id)}
                              className="px-2.5 py-1 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-md text-[11px] font-medium cursor-pointer transition-colors"
                            >
                              پرداخت
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && selectedProfileSummary && (
        <div className="fixed inset-0 z-40 bg-[#181614]/40 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full border-r border-[#E6DFD3] shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6DFD3] flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">{selectedStudent.fullName}</h3>
                <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                  {selectedStudent.code} · کد ملی {toPersianDigits(selectedStudent.nationalId)} · ثبت‌نام{' '}
                  {toPersianDigits(selectedStudent.registeredAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingProfile((v) => !v)}
                  className="h-8 px-3 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{editingProfile ? 'بستن ویرایش' : 'ویرایش مشخصات'}</span>
                </button>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="h-8 px-3 border border-red-200 hover:bg-red-50 rounded-lg text-xs font-medium text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف پرونده</span>
                </button>
                <button
                  onClick={() => onSelectStudent(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {editingProfile && editForm ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateStudent(editForm);
                    setEditingProfile(false);
                  }}
                  className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="font-bold text-stone-900">ویرایش مشخصات پرونده هنرجو</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-stone-600 mb-1">نام و نام خانوادگی</label>
                      <input
                        required
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">کد ملی</label>
                      <input
                        value={editForm.nationalId}
                        onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">تاریخ تولد</label>
                      <input
                        value={editForm.birthDate}
                        onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">موبایل</label>
                      <input
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">تلفن اضطراری</label>
                      <input
                        value={editForm.emergencyPhone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, emergencyPhone: e.target.value })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">تحصیلات</label>
                      <input
                        value={editForm.education}
                        onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-stone-600 mb-1">نشانی</label>
                      <input
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1">وضعیت پرونده</label>
                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm({ ...editForm, status: e.target.value as StudentStatus })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                      >
                        <option value="active">در حال تحصیل</option>
                        <option value="graduated">فارغ‌التحصیل</option>
                        <option value="inactive">انصراف / غیرفعال</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-stone-600 mb-1">یادداشت پرونده</label>
                      <input
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="h-8 px-3 border border-[#E6DFD3] bg-white hover:bg-[#FAF8F5] text-stone-700 rounded-lg cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="h-8 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره مشخصات</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-4">
                  <div>
                    <span className="text-stone-500 block">موبایل:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {toPersianDigits(selectedStudent.phone)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">تلفن اضطراری:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {toPersianDigits(selectedStudent.emergencyPhone)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">تاریخ تولد:</span>
                    <span className="font-medium text-stone-900 tabular-nums">
                      {toPersianDigits(selectedStudent.birthDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">تحصیلات:</span>
                    <span className="font-medium text-stone-900">{selectedStudent.education}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">وضعیت تحصیلی:</span>
                    <select
                      value={selectedStudent.status}
                      onChange={(e) =>
                        onUpdateStudentStatus(selectedStudent.id, e.target.value as StudentStatus)
                      }
                      className="mt-0.5 h-7 px-2 text-xs border border-[#E6DFD3] rounded-md bg-white"
                    >
                      <option value="active">در حال تحصیل</option>
                      <option value="graduated">فارغ‌التحصیل</option>
                      <option value="inactive">انصراف / غیرفعال</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-stone-500 block">نشانی:</span>
                    <span className="font-medium text-stone-900">{selectedStudent.address}</span>
                  </div>
                  {selectedStudent.notes && (
                    <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#E6DFD3]">
                      <span className="text-stone-500 block">یادداشت پرونده:</span>
                      <span className="text-stone-800">{selectedStudent.notes}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="border border-[#E6DFD3] rounded-xl p-3">
                  <div className="text-[11px] text-stone-500">جمع شهریه دوره‌ها</div>
                  <div className="font-bold text-stone-900 mt-1">
                    {formatToman(selectedProfileSummary.totalFinal)}
                  </div>
                  {selectedProfileSummary.totalDiscount > 0 && (
                    <div className="text-[10px] text-[#8E5F15] mt-0.5">
                      تخفیف کل: {formatToman(selectedProfileSummary.totalDiscount)}
                    </div>
                  )}
                </div>
                <div className="border border-[#E6DFD3] rounded-xl p-3">
                  <div className="text-[11px] text-stone-500">مجموع واریزی‌ها</div>
                  <div className="font-bold text-emerald-700 mt-1">
                    {formatToman(selectedProfileSummary.totalPaid)}
                  </div>
                </div>
                <div className="border border-[#E6DFD3] rounded-xl p-3">
                  <div className="text-[11px] text-stone-500">مانده بدهی کل</div>
                  <div
                    className={`font-bold mt-1 ${
                      selectedProfileSummary.totalBalance > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {selectedProfileSummary.totalBalance > 0
                      ? formatToman(selectedProfileSummary.totalBalance)
                      : 'تسویه کامل'}
                  </div>
                </div>
                <div className="border border-[#E6DFD3] rounded-xl p-3">
                  <div className="text-[11px] text-stone-500">معدل و حضور کل</div>
                  <div className="font-bold text-stone-900 mt-1">
                    {selectedProfileSummary.avgScore !== null
                      ? `${formatScore(selectedProfileSummary.avgScore)} از ۲۰`
                      : '—'}
                    {selectedProfileSummary.attendancePercent !== null && (
                      <span className="text-[11px] font-normal text-stone-500 mr-1">
                        · {formatNumber(selectedProfileSummary.attendancePercent)}٪ حضور
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-[#E6DFD3] pb-3">
                <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
                  {[
                    { id: 'courses-payments', label: 'دوره‌ها و ریز واریزی‌ها' },
                    { id: 'attendance', label: 'سوابق حضور و غیاب' },
                    { id: 'grades', label: 'کارنامه و ارزیابی‌ها' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDrawerTab(t.id as DrawerTab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        drawerTab === t.id
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => onOpenEnrollForStudent(selectedStudent.id)}
                  className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت‌نام در دوره جدید</span>
                </button>
              </div>

              {drawerTab === 'courses-payments' && (
                <div className="space-y-4">
                  {selectedProfileSummary.enrollments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-[#E6DFD3] rounded-xl">
                      هنرجو هنوز در هیچ دوره‌ای ثبت‌نام نکرده است.
                    </div>
                  ) : (
                    selectedProfileSummary.enrollments.map((en) => {
                      const cls = state.classes.find((c) => c.id === en.classId);
                      const course = state.courses.find((cr) => cr.id === cls?.courseId);
                      const inst = state.instructors.find((i) => i.id === cls?.instructorId);
                      const room = state.rooms.find((r) => r.id === cls?.roomId);
                      const enPayments = state.payments
                        .filter((p) => p.enrollmentId === en.id)
                        .sort((a, b) => b.date.localeCompare(a.date));
                      const paid = enPayments.reduce(
                        (s, p) => s + (p.type === 'refund' ? -p.amount : p.amount),
                        0,
                      );
                      const due = Math.max(0, en.finalTuition - paid);
                      const discountAmt = Math.max(0, en.baseTuition - en.finalTuition);
                      const grade = state.grades.find(
                        (g) => g.studentId === selectedStudent.id && g.classId === en.classId,
                      );

                      return (
                        <div
                          key={en.id}
                          className="border border-[#E6DFD3] rounded-xl overflow-hidden text-xs"
                        >
                          <div className="p-4 bg-[#FAF8F5] border-b border-[#E6DFD3] space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-stone-900 text-sm">
                                  {course?.title ?? cls?.title}
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                                  {cls?.title} · استاد: {inst?.fullName} · {room?.name} ·{' '}
                                  {cls?.days.join('، ')} ({toPersianDigits(cls?.startTime ?? '')}–
                                  {toPersianDigits(cls?.endTime ?? '')})
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {due > 0 && (
                                  <button
                                    onClick={() => onOpenQuickPayment(selectedStudent.id)}
                                    className="px-2.5 py-1 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>ثبت واریزی</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onOpenReportCard(selectedStudent.id, en.classId)}
                                  className="px-2.5 py-1 border border-[#E6DFD3] bg-white hover:bg-[#FAF8F5] text-stone-700 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Award className="w-3 h-3" />
                                  <span>کارنامه</span>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#E6DFD3] text-[11px] tabular-nums">
                              <div>
                                <span className="text-stone-500">تاریخ ثبت‌نام: </span>
                                <span className="font-medium text-stone-800">
                                  {toPersianDigits(en.enrolledAt)}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500">شهریه پایه: </span>
                                <span className="font-medium text-stone-800">
                                  {formatToman(en.baseTuition)}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500">تخفیف: </span>
                                <span className="font-medium text-[#8E5F15]">
                                  {discountAmt > 0
                                    ? `${formatToman(discountAmt)}${
                                        en.discountReason ? ` (${en.discountReason})` : ''
                                      }`
                                    : 'ندارد'}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500">پرداختی: </span>
                                <span className="font-bold text-emerald-700">
                                  {formatToman(paid)}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500">مانده: </span>
                                <span
                                  className={`font-bold ${
                                    due > 0 ? 'text-amber-700' : 'text-emerald-700'
                                  }`}
                                >
                                  {due > 0 ? formatToman(due) : 'تسویه شده'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 space-y-2 bg-white">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-stone-700 inline-flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-[#8E5F15]" />
                                <span>ریز واریزی‌های ثبت‌شده بابت این دوره ({formatNumber(enPayments.length)} فیش)</span>
                              </span>
                              {grade && (
                                <span className="text-[11px] text-stone-600 tabular-nums">
                                  نمره نهایی:{' '}
                                  <strong className="text-stone-900">
                                    {formatScore(grade.totalScore)} از ۲۰
                                  </strong>
                                </span>
                              )}
                            </div>

                            {enPayments.length === 0 ? (
                              <div className="text-[11px] text-stone-400 py-2">
                                هنوز واریزی برای این دوره ثبت نشده است.
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-[#F0EAE0] rounded-lg">
                                <table className="w-full text-right border-collapse text-[11px]">
                                  <thead>
                                    <tr className="bg-[#FAF8F5] text-stone-500 border-b border-[#F0EAE0]">
                                      <th className="py-2 px-3">شماره فیش</th>
                                      <th className="py-2 px-2">تاریخ</th>
                                      <th className="py-2 px-2">روش پرداخت</th>
                                      <th className="py-2 px-2">مبلغ</th>
                                      <th className="py-2 px-3">توضیحات</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#F0EAE0] tabular-nums">
                                    {enPayments.map((p) => (
                                      <tr key={p.id}>
                                        <td className="py-2 px-3 font-code text-stone-600">
                                          {p.referenceCode}
                                        </td>
                                        <td className="py-2 px-2 text-stone-700">
                                          {toPersianDigits(p.date)}
                                        </td>
                                        <td className="py-2 px-2 text-stone-700">{p.method}</td>
                                        <td className="py-2 px-2 font-bold text-emerald-700">
                                          {formatToman(p.amount)}
                                        </td>
                                        <td className="py-2 px-3 text-stone-600">
                                          {p.note || '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {drawerTab === 'attendance' && (
                <div className="border border-[#E6DFD3] rounded-xl overflow-hidden">
                  {selectedProfileSummary.attendanceHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500">
                      هنوز سابقه حضور و غیابی برای این هنرجو ثبت نشده است.
                    </div>
                  ) : (
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                          <th className="py-2.5 px-4">تاریخ جلسه</th>
                          <th className="py-2.5 px-3">کلاس</th>
                          <th className="py-2.5 px-3">سرفصل</th>
                          <th className="py-2.5 px-4 text-left">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EAE0]">
                        {selectedProfileSummary.attendanceHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-4 tabular-nums text-stone-700">
                              {toPersianDigits(item.date)}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-stone-900">
                              {item.classTitle}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600">{item.topic}</td>
                            <td className="py-2.5 px-4 text-left font-semibold">
                              <span
                                className={
                                  item.status === 'present'
                                    ? 'text-emerald-700'
                                    : item.status === 'late'
                                    ? 'text-amber-700'
                                    : item.status === 'excused'
                                    ? 'text-[#8E5F15]'
                                    : 'text-red-700'
                                }
                              >
                                {item.status === 'present'
                                  ? 'حاضر'
                                  : item.status === 'late'
                                  ? 'تاخیر'
                                  : item.status === 'excused'
                                  ? 'غایب موجه'
                                  : 'غایب غیرموجه'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {drawerTab === 'grades' && (
                <div className="space-y-3">
                  {selectedProfileSummary.grades.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-[#E6DFD3] rounded-xl">
                      هنوز نمره‌ای برای این هنرجو ثبت نشده است.
                    </div>
                  ) : (
                    selectedProfileSummary.grades.map((g) => {
                      const cls = state.classes.find((c) => c.id === g.classId);
                      const passed = g.totalScore >= state.settings.passingGrade;
                      return (
                        <div
                          key={g.id}
                          className="border border-[#E6DFD3] rounded-xl p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900">{cls?.title}</span>
                            <div className="flex items-center gap-3 tabular-nums">
                              <span
                                className={`font-bold ${
                                  passed ? 'text-emerald-700' : 'text-red-700'
                                }`}
                              >
                                نمره کل: {formatScore(g.totalScore)} ({passed ? 'قبول' : 'نیاز به ترمیم'})
                              </span>
                              <button
                                onClick={() => onOpenReportCard(selectedStudent.id, g.classId)}
                                className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 cursor-pointer"
                              >
                                کارنامه رسمی
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[11px] text-stone-600 tabular-nums pt-1">
                            <span>میان‌ترم: {formatScore(g.midterm)}</span>
                            <span>پایان‌ترم: {formatScore(g.finalExam)}</span>
                            <span>پروژه عملی: {formatScore(g.practical)}</span>
                            <span>فعالیت کلاسی: {formatScore(g.classActivity)}</span>
                          </div>
                          {g.teacherComment && (
                            <p className="text-[11px] text-stone-700 pt-2 border-t border-[#F0EAE0]">
                              <strong>نظر استاد: </strong>
                              {g.teacherComment}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && selectedStudent && selectedProfileSummary && (
        <div className="fixed inset-0 z-50 bg-[#181614]/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3">
              <h3 className="text-sm font-bold text-red-700">تایید حذف پرونده هنرجو</h3>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
              <p>
                آیا از حذف کامل پرونده <strong className="text-stone-900">{selectedStudent.fullName}</strong> ({selectedStudent.code}) از پایگاه داده SQLite اطمینان دارید؟
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1 tabular-nums">
                <div>تعداد ثبت‌نام‌های متصل: {formatNumber(selectedProfileSummary.enrollments.length)} دوره</div>
                <div>
                  مانده بدهی فعلی:{' '}
                  {selectedProfileSummary.totalBalance > 0
                    ? formatToman(selectedProfileSummary.totalBalance)
                    : 'تسویه کامل'}
                </div>
                <div className="text-[11px] font-medium pt-1">
                  توجه: با حذف پرونده، سوابق ثبت‌نام، فیش‌های پرداخت، نمرات و حضور و غیاب این هنرجو نیز حذف می‌شوند و این عملیات غیرقابل بازگشت است.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="h-9 px-4 border border-[#E6DFD3] rounded-lg text-xs font-medium text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedStudent.id;
                  setConfirmDeleteOpen(false);
                  onDeleteStudent(id);
                }}
                className="h-9 px-4 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                حذف قطعی پرونده
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
