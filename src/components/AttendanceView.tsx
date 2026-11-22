import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Users, Save } from 'lucide-react';
import type {
  AttendanceSession,
  AttendanceStatus,
  InstituteState,
} from '../types/institute.ts';
import {
  formatNumber,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';

interface AttendanceViewProps {
  state: InstituteState;
  onSaveAttendanceSession: (session: AttendanceSession) => void;
}

const STATUS_OPTIONS: { id: AttendanceStatus; label: string; activeClass: string }[] = [
  { id: 'present', label: 'حاضر', activeClass: 'bg-emerald-700 text-white border-emerald-700' },
  { id: 'late', label: 'تاخیر', activeClass: 'bg-amber-600 text-white border-amber-600' },
  { id: 'excused', label: 'غیبت موجه', activeClass: 'bg-[#8E5F15] text-white border-[#8E5F15]' },
  { id: 'absent', label: 'غیبت غیرموجه', activeClass: 'bg-red-700 text-white border-red-700' },
];

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  state,
  onSaveAttendanceSession,
}) => {
  const activeClasses = state.classes.filter((c) => c.status !== 'completed');
  const [selectedClassId, setSelectedClassId] = useState(activeClasses[0]?.id ?? '');
  const [sessionDate, setSessionDate] = useState(getTodayJalali());
  const [topic, setTopic] = useState('');
  const [recordsMap, setRecordsMap] = useState<Record<string, AttendanceStatus>>({});
  const [savedFeedback, setSavedFeedback] = useState(false);

  const enrolledStudents = useMemo(() => {
    const enrs = state.enrollments.filter(
      (e) => e.classId === selectedClassId && e.status !== 'dropped',
    );
    return enrs
      .map((e) => state.students.find((s) => s.id === e.studentId))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [state.enrollments, state.students, selectedClassId]);

  useEffect(() => {
    const existing = state.attendance.find(
      (a) => a.classId === selectedClassId && a.date === sessionDate,
    );
    if (existing) {
      setTopic(existing.topic);
      const next: Record<string, AttendanceStatus> = {};
      for (const rec of existing.records) {
        next[rec.studentId] = rec.status;
      }
      setRecordsMap(next);
    } else {
      const next: Record<string, AttendanceStatus> = {};
      for (const stu of enrolledStudents) {
        next[stu.id] = 'present';
      }
      setRecordsMap(next);
    }
  }, [selectedClassId, sessionDate, state.attendance, enrolledStudents]);

  const classSessions = useMemo(
    () =>
      state.attendance
        .filter((a) => a.classId === selectedClassId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.attendance, selectedClassId],
  );

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    for (const stu of enrolledStudents) {
      next[stu.id] = 'present';
    }
    setRecordsMap(next);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || enrolledStudents.length === 0) return;
    const existing = state.attendance.find(
      (a) => a.classId === selectedClassId && a.date === sessionDate,
    );
    onSaveAttendanceSession({
      id: existing?.id ?? generateId('att'),
      classId: selectedClassId,
      date: sessionDate,
      topic: topic.trim() || 'جلسه عادی کارگاه',
      records: enrolledStudents.map((stu) => ({
        studentId: stu.id,
        status: recordsMap[stu.id] ?? 'present',
      })),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        <form onSubmit={handleSave}>
          <div className="p-5 border-b border-[#E6DFD3] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900">ثبت حضور و غیاب جلسه کارگاه</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  آمار حضور به صورت خودکار در کارنامه الکترونیکی و تحلیل بازدهی استاد لحاظ می‌شود
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="h-8 px-3 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 cursor-pointer"
              >
                علامت‌گذاری همه: حاضر
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">انتخاب کلاس</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white text-stone-800 focus:outline-none focus:border-[#8E5F15]"
                >
                  {activeClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">تاریخ جلسه (شمسی)</label>
                <input
                  type="text"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">سرفصل تدریس‌شده</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="مثلاً: اره‌کاری و لحیم‌کاری پایه انگشتر"
                  className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
            </div>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-500">
              هنرجویی در این کلاس ثبت‌نام نکرده است.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EAE0]">
              {enrolledStudents.map((stu, idx) => {
                const currentStatus = recordsMap[stu.id] ?? 'present';
                return (
                  <div
                    key={stu.id}
                    className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs text-stone-400 tabular-nums">
                        {formatNumber(idx + 1)}.
                      </span>
                      <div>
                        <div className="text-xs font-bold text-stone-900">{stu.fullName}</div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          {stu.code} · {toPersianDigits(stu.phone)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {STATUS_OPTIONS.map((opt) => {
                        const isSelected = currentStatus === opt.id;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() =>
                              setRecordsMap((prev) => ({ ...prev, [stu.id]: opt.id }))
                            }
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isSelected
                                ? opt.activeClass
                                : 'bg-white text-stone-600 border-[#E6DFD3] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-4 bg-[#FAF8F5] border-t border-[#E6DFD3] flex items-center justify-between">
            <div className="text-xs text-stone-600 tabular-nums">
              تعداد هنرجویان: {formatNumber(enrolledStudents.length)} نفر
            </div>
            <div className="flex items-center gap-3">
              {savedFeedback && (
                <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>لیست حضور و غیاب ذخیره شد</span>
                </span>
              )}
              <button
                type="submit"
                disabled={enrolledStudents.length === 0}
                className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ثبت حضور و غیاب جلسه</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="lg:col-span-4 bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8E5F15]" />
          <h3 className="text-sm font-bold text-stone-900">سوابق جلسات این کلاس</h3>
        </div>
        {classSessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">
            هنوز جلسه‌ای برای این کلاس ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EAE0]">
            {classSessions.map((sess) => {
              const presentCount = sess.records.filter(
                (r) => r.status === 'present' || r.status === 'late',
              ).length;
              return (
                <button
                  key={sess.id}
                  onClick={() => setSessionDate(sess.date)}
                  className="w-full text-right p-4 hover:bg-[#FAF8F5] transition-colors space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-900 tabular-nums">
                      {toPersianDigits(sess.date)}
                    </span>
                    <span className="text-emerald-700 font-semibold tabular-nums">
                      {formatNumber(presentCount)} / {formatNumber(sess.records.length)} حاضر
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 truncate">{sess.topic}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
