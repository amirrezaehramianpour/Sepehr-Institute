import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Printer, Save } from 'lucide-react';
import type { GradeRecord, InstituteState } from '../types/institute.ts';
import {
  calculateWeightedScore,
  formatNumber,
  formatScore,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';
import defaultEmblem from '../assets/images/jewelry_emblem_1795358999694.jpg';

interface GradesViewProps {
  state: InstituteState;
  initialReportSelection?: { studentId: string; classId: string } | null;
  onClearReportSelection?: () => void;
  onSaveClassGrades: (records: GradeRecord[]) => void;
}

type GradesTab = 'entry' | 'report-card';

interface EditableRow {
  enrollmentId: string;
  studentId: string;
  midterm: number;
  finalExam: number;
  practical: number;
  classActivity: number;
  teacherComment: string;
  published: boolean;
}

export const GradesView: React.FC<GradesViewProps> = ({
  state,
  initialReportSelection,
  onClearReportSelection,
  onSaveClassGrades,
}) => {
  const [activeTab, setActiveTab] = useState<GradesTab>(
    initialReportSelection ? 'report-card' : 'entry',
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialReportSelection?.classId ?? state.classes[0]?.id ?? '',
  );
  const [reportStudentId, setReportStudentId] = useState(
    initialReportSelection?.studentId ?? '',
  );
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (initialReportSelection) {
      setActiveTab('report-card');
      setSelectedClassId(initialReportSelection.classId);
      setReportStudentId(initialReportSelection.studentId);
      onClearReportSelection?.();
    }
  }, [initialReportSelection, onClearReportSelection]);

  const classEnrollments = useMemo(
    () =>
      state.enrollments.filter(
        (e) => e.classId === selectedClassId && e.status !== 'dropped',
      ),
    [state.enrollments, selectedClassId],
  );

  useEffect(() => {
    const nextRows: EditableRow[] = classEnrollments.map((en) => {
      const existing = state.grades.find(
        (g) => g.classId === selectedClassId && g.studentId === en.studentId,
      );
      return {
        enrollmentId: en.id,
        studentId: en.studentId,
        midterm: existing?.midterm ?? 0,
        finalExam: existing?.finalExam ?? 0,
        practical: existing?.practical ?? 0,
        classActivity: existing?.classActivity ?? 0,
        teacherComment: existing?.teacherComment ?? '',
        published: existing?.published ?? true,
      };
    });
    setRows(nextRows);
    if (!nextRows.some((r) => r.studentId === reportStudentId)) {
      setReportStudentId(nextRows[0]?.studentId ?? '');
    }
  }, [classEnrollments, selectedClassId, state.grades, reportStudentId]);

  const weights = state.settings.gradeWeights;

  const updateRow = (studentId: string, patch: Partial<EditableRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)),
    );
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const today = getTodayJalali();
    const payload: GradeRecord[] = rows.map((r) => {
      const existing = state.grades.find(
        (g) => g.classId === selectedClassId && g.studentId === r.studentId,
      );
      const totalScore = calculateWeightedScore(
        {
          midterm: r.midterm,
          finalExam: r.finalExam,
          practical: r.practical,
          classActivity: r.classActivity,
        },
        weights,
      );
      return {
        id: existing?.id ?? generateId('grd'),
        enrollmentId: r.enrollmentId,
        studentId: r.studentId,
        classId: selectedClassId,
        midterm: r.midterm,
        finalExam: r.finalExam,
        practical: r.practical,
        classActivity: r.classActivity,
        totalScore,
        teacherComment: r.teacherComment,
        updatedAt: today,
        published: r.published,
      };
    });
    onSaveClassGrades(payload);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Report Card Computations
  const selectedClass = state.classes.find((c) => c.id === selectedClassId);
  const selectedCourse = state.courses.find((c) => c.id === selectedClass?.courseId);
  const selectedInstructor = state.instructors.find(
    (i) => i.id === selectedClass?.instructorId,
  );
  const reportStudent = state.students.find((s) => s.id === reportStudentId);
  const reportGrade = state.grades.find(
    (g) => g.classId === selectedClassId && g.studentId === reportStudentId,
  );

  const classGradeStats = useMemo(() => {
    const clsGrades = state.grades
      .filter((g) => g.classId === selectedClassId)
      .sort((a, b) => b.totalScore - a.totalScore);
    const rankIdx = clsGrades.findIndex((g) => g.studentId === reportStudentId);
    const avg =
      clsGrades.length > 0
        ? clsGrades.reduce((s, g) => s + g.totalScore, 0) / clsGrades.length
        : 0;
    return {
      rank: rankIdx >= 0 ? rankIdx + 1 : null,
      totalRanked: clsGrades.length,
      classAverage: Number(avg.toFixed(2)),
    };
  }, [state.grades, selectedClassId, reportStudentId]);

  const studentAttendanceSummary = useMemo(() => {
    const sessions = state.attendance.filter((a) => a.classId === selectedClassId);
    let total = 0;
    let present = 0;
    for (const s of sessions) {
      const rec = s.records.find((r) => r.studentId === reportStudentId);
      if (rec) {
        total += 1;
        if (rec.status === 'present' || rec.status === 'late') present += 1;
      }
    }
    const percent = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, percent };
  }, [state.attendance, selectedClassId, reportStudentId]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="no-print bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'entry'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ثبت نمرات توسط استاد
          </button>
          <button
            onClick={() => setActiveTab('report-card')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'report-card'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            صدور و چاپ کارنامه الکترونیکی
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
          >
            {state.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.title}
              </option>
            ))}
          </select>

          {activeTab === 'report-card' && (
            <>
              <select
                value={reportStudentId}
                onChange={(e) => setReportStudentId(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
              >
                {classEnrollments.map((en) => {
                  const stu = state.students.find((s) => s.id === en.studentId);
                  return (
                    <option key={en.id} value={en.studentId}>
                      {stu?.fullName ?? 'هنرجو'}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => window.print()}
                className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ / ذخیره PDF کارنامه</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Instructor Grade Entry Table */}
      {activeTab === 'entry' && (
        <form
          onSubmit={handleSaveAll}
          className="no-print bg-white border border-[#E6DFD3] rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#E6DFD3] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                کاربرگ ثبت نمرات: {selectedClass?.title}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                ضرایب ارزیابی: میان‌ترم {formatNumber(weights.midterm)}٪ · پایان‌ترم{' '}
                {formatNumber(weights.finalExam)}٪ · پروژه عملی{' '}
                {formatNumber(weights.practical)}٪ · فعالیت کلاسی{' '}
                {formatNumber(weights.classActivity)}٪
              </p>
            </div>
            <div className="text-xs text-stone-600">
              استاد: <strong className="text-stone-900">{selectedInstructor?.fullName}</strong>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-500">
              هنرجویی برای این کلاس ثبت‌نام نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-3 px-4">نام هنرجو</th>
                    <th className="py-3 px-2 w-24">میان‌ترم (۲۰)</th>
                    <th className="py-3 px-2 w-24">پایان‌ترم (۲۰)</th>
                    <th className="py-3 px-2 w-24">پروژه عملی (۲۰)</th>
                    <th className="py-3 px-2 w-24">فعالیت (۲۰)</th>
                    <th className="py-3 px-3">نمره کل</th>
                    <th className="py-3 px-3">توصیه و تحلیل استاد</th>
                    <th className="py-3 px-4 text-left">کارنامه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-xs">
                  {rows.map((row) => {
                    const stu = state.students.find((s) => s.id === row.studentId);
                    const total = calculateWeightedScore(
                      {
                        midterm: row.midterm,
                        finalExam: row.finalExam,
                        practical: row.practical,
                        classActivity: row.classActivity,
                      },
                      weights,
                    );
                    const passed = total >= state.settings.passingGrade;
                    return (
                      <tr key={row.studentId} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{stu?.fullName}</div>
                          <div className="text-[11px] text-stone-500 font-code">{stu?.code}</div>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            max={20}
                            value={row.midterm}
                            onChange={(e) =>
                              updateRow(row.studentId, {
                                midterm: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-20 h-8 px-2 border border-[#E6DFD3] rounded-md text-center tabular-nums focus:outline-none focus:border-[#8E5F15]"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            max={20}
                            value={row.finalExam}
                            onChange={(e) =>
                              updateRow(row.studentId, {
                                finalExam: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-20 h-8 px-2 border border-[#E6DFD3] rounded-md text-center tabular-nums focus:outline-none focus:border-[#8E5F15]"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            max={20}
                            value={row.practical}
                            onChange={(e) =>
                              updateRow(row.studentId, {
                                practical: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-20 h-8 px-2 border border-[#E6DFD3] rounded-md text-center tabular-nums focus:outline-none focus:border-[#8E5F15]"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            max={20}
                            value={row.classActivity}
                            onChange={(e) =>
                              updateRow(row.studentId, {
                                classActivity: Math.min(
                                  20,
                                  Math.max(0, Number(e.target.value) || 0),
                                ),
                              })
                            }
                            className="w-20 h-8 px-2 border border-[#E6DFD3] rounded-md text-center tabular-nums focus:outline-none focus:border-[#8E5F15]"
                          />
                        </td>
                        <td className="py-3 px-3 tabular-nums">
                          <div
                            className={`font-bold text-sm ${
                              passed ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {formatScore(total)}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {passed ? 'قبول' : 'نیاز به ترمیم'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.teacherComment}
                            onChange={(e) =>
                              updateRow(row.studentId, { teacherComment: e.target.value })
                            }
                            placeholder="ارزیابی کیفی عملکرد کارگاهی..."
                            className="w-full min-w-[200px] h-8 px-2.5 border border-[#E6DFD3] rounded-md text-xs focus:outline-none focus:border-[#8E5F15]"
                          />
                        </td>
                        <td className="py-3 px-4 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setReportStudentId(row.studentId);
                              setActiveTab('report-card');
                            }}
                            className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Award className="w-3 h-3 text-[#8E5F15]" />
                            <span>پیش‌نمایش کارنامه</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-4 bg-[#FAF8F5] border-t border-[#E6DFD3] flex items-center justify-between">
            <span className="text-xs text-stone-600">
              پس از ذخیره نمرات، کارنامه الکترونیکی هر هنرجو به صورت خودکار طراحی و به‌روزرسانی می‌شود.
            </span>
            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>نمرات ذخیره و کارنامه‌ها تولید شدند</span>
                </span>
              )}
              <button
                type="submit"
                disabled={rows.length === 0}
                className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ثبت نهایی نمرات و صدور کارنامه‌ها</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Automatic Electronic Report Card */}
      {activeTab === 'report-card' && (
        <div className="print-only-container bg-white border border-[#E6DFD3] rounded-xl max-w-4xl mx-auto p-8 space-y-6">
          {!reportStudent ? (
            <div className="py-12 text-center text-xs text-stone-500">
              هنرجویی در این کلاس برای صدور کارنامه یافت نشد.
            </div>
          ) : (
            <>
              {/* Report Card Official Header */}
              <div className="flex items-center justify-between border-b-2 border-[#181614] pb-5">
                <div className="flex items-center gap-4">
                  <img
                    src={state.settings.logoUrl || defaultEmblem}
                    alt={state.settings.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg border border-[#D4AF37]/40 bg-[#181614] object-cover"
                  />
                  <div>
                    <h2 className="text-lg font-extrabold text-stone-900">
                      {state.settings.name}
                    </h2>
                    <p className="text-xs text-stone-600 mt-0.5">{state.settings.subtitle}</p>
                    <p className="text-xs font-bold text-[#8E5F15] mt-1">
                      کارنامه الکترونیکی و ارزشیابی پایان دوره
                    </p>
                  </div>
                </div>
                <div className="text-left text-xs text-stone-600 space-y-1 tabular-nums">
                  <div>
                    ترم آموزشی: <strong className="text-stone-900">{selectedClass?.term}</strong>
                  </div>
                  <div>
                    تاریخ صدور:{' '}
                    <strong className="text-stone-900">
                      {toPersianDigits(reportGrade?.updatedAt ?? getTodayJalali())}
                    </strong>
                  </div>
                  <div>
                    کد کارنامه: <span className="font-code">{reportStudent.code}</span>
                  </div>
                </div>
              </div>

              {/* Student & Course Info Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-4 text-xs">
                <div>
                  <span className="text-stone-500 block">نام و نام خانوادگی هنرجو:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">
                    {reportStudent.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">کد ملی:</span>
                  <span className="font-semibold text-stone-900 tabular-nums mt-0.5 block">
                    {toPersianDigits(reportStudent.nationalId)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">دوره و گروه:</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">
                    {selectedCourse?.title} ({selectedClass?.title})
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">استاد مدرس:</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">
                    {selectedInstructor?.fullName}
                  </span>
                </div>
              </div>

              {!reportGrade ? (
                <div className="p-8 border border-dashed border-[#D6CCBC] rounded-xl text-center text-xs text-stone-600 space-y-2">
                  <p>برای این هنرجو هنوز نمره‌ای در کلاس انتخاب‌شده ثبت نشده است.</p>
                  <button
                    onClick={() => setActiveTab('entry')}
                    className="no-print px-4 py-2 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold cursor-pointer"
                  >
                    ورود نمره در کاربرگ استاد
                  </button>
                </div>
              ) : (
                <>
                  {/* Detailed Score Breakdown Table */}
                  <div className="border border-[#E6DFD3] rounded-xl overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-stone-700 font-semibold">
                          <th className="py-3 px-4">بخش ارزیابی</th>
                          <th className="py-3 px-3">وزن در نمره نهایی</th>
                          <th className="py-3 px-3">سقف نمره</th>
                          <th className="py-3 px-4 text-left">نمره کسب‌شده</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EAE0] tabular-nums">
                        <tr>
                          <td className="py-3 px-4 font-medium text-stone-900">آزمون میان‌ترم</td>
                          <td className="py-3 px-3 text-stone-600">{formatNumber(weights.midterm)}٪</td>
                          <td className="py-3 px-3 text-stone-600">۲۰٫۰۰</td>
                          <td className="py-3 px-4 text-left font-bold text-stone-900">
                            {formatScore(reportGrade.midterm)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium text-stone-900">آزمون پایان‌ترم</td>
                          <td className="py-3 px-3 text-stone-600">{formatNumber(weights.finalExam)}٪</td>
                          <td className="py-3 px-3 text-stone-600">۲۰٫۰۰</td>
                          <td className="py-3 px-4 text-left font-bold text-stone-900">
                            {formatScore(reportGrade.finalExam)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium text-stone-900">پروژه و آزمون عملی کارگاهی</td>
                          <td className="py-3 px-3 text-stone-600">{formatNumber(weights.practical)}٪</td>
                          <td className="py-3 px-3 text-stone-600">۲۰٫۰۰</td>
                          <td className="py-3 px-4 text-left font-bold text-stone-900">
                            {formatScore(reportGrade.practical)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium text-stone-900">فعالیت کلاسی و تمرین</td>
                          <td className="py-3 px-3 text-stone-600">{formatNumber(weights.classActivity)}٪</td>
                          <td className="py-3 px-3 text-stone-600">۲۰٫۰۰</td>
                          <td className="py-3 px-4 text-left font-bold text-stone-900">
                            {formatScore(reportGrade.classActivity)}
                          </td>
                        </tr>
                        <tr className="bg-[#FAF8F5] border-t-2 border-[#E6DFD3]">
                          <td className="py-3.5 px-4 font-extrabold text-stone-900">
                            معدل نهایی و نمره کل دوره
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-stone-700">۱۰۰٪</td>
                          <td className="py-3.5 px-3 text-stone-700">۲۰٫۰۰</td>
                          <td
                            className={`py-3.5 px-4 text-left text-base font-extrabold ${
                              reportGrade.totalScore >= state.settings.passingGrade
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {formatScore(reportGrade.totalScore)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Analytical Summary Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="border border-[#E6DFD3] rounded-xl p-4">
                      <span className="text-stone-500 block">نتیجه نهایی ارزشیابی</span>
                      <span
                        className={`mt-1 text-sm font-bold block ${
                          reportGrade.totalScore >= state.settings.passingGrade
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        {reportGrade.totalScore >= state.settings.passingGrade
                          ? 'قبول — مجاز به دریافت گواهینامه'
                          : 'نیاز به آزمون مجدد / ترمیم'}
                      </span>
                    </div>
                    <div className="border border-[#E6DFD3] rounded-xl p-4 tabular-nums">
                      <span className="text-stone-500 block">رتبه در کلاس و مقایسه با میانگین</span>
                      <span className="mt-1 text-sm font-bold text-stone-900 block">
                        {classGradeStats.rank
                          ? `رتبه ${formatNumber(classGradeStats.rank)} از ${formatNumber(
                              classGradeStats.totalRanked,
                            )} نفر`
                          : '—'}{' '}
                        <span className="text-xs font-normal text-stone-500">
                          (میانگین کلاس: {formatScore(classGradeStats.classAverage)})
                        </span>
                      </span>
                    </div>
                    <div className="border border-[#E6DFD3] rounded-xl p-4 tabular-nums">
                      <span className="text-stone-500 block">درصد حضور در جلسات</span>
                      <span className="mt-1 text-sm font-bold text-stone-900 block">
                        {formatNumber(studentAttendanceSummary.percent)}٪ حضور{' '}
                        <span className="text-xs font-normal text-stone-500">
                          ({formatNumber(studentAttendanceSummary.present)} از{' '}
                          {formatNumber(studentAttendanceSummary.total)} جلسه ثبت‌شده)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Teacher Qualitative Feedback */}
                  <div className="border border-[#E6DFD3] rounded-xl p-4 space-y-1.5 text-xs">
                    <div className="font-bold text-stone-900">ارزیابی توصیفی و پیشنهاد استاد:</div>
                    <p className="text-stone-700 leading-relaxed">
                      {reportGrade.teacherComment ||
                        'عملکرد هنرجو در طول ترم مورد تایید استاد مدرس می‌باشد.'}
                    </p>
                  </div>
                </>
              )}

              {/* Signatures & Footer */}
              <div className="pt-6 border-t border-[#E6DFD3] grid grid-cols-3 gap-6 text-center text-xs text-stone-600">
                <div className="space-y-6">
                  <div>امضای استاد مدرس</div>
                  <div className="font-semibold text-stone-800">{selectedInstructor?.fullName}</div>
                </div>
                <div className="space-y-6">
                  <div>امضای واحد آموزش</div>
                  <div className="font-semibold text-stone-800">واحد برنامه‌ریزی و آزمون</div>
                </div>
                <div className="space-y-6">
                  <div>مهر و تایید مدیریت</div>
                  <div className="font-semibold text-stone-800">{state.settings.managerName}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
