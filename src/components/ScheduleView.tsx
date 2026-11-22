import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ClassSection,
  ClassStatus,
  InstituteState,
  Room,
  WeekDay,
} from '../types/institute.ts';
import {
  detectScheduleConflicts,
  findAvailableRooms,
  TIME_SLOTS,
  WEEK_DAYS,
} from '../utils/scheduling.ts';
import {
  formatNumber,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';

interface ScheduleViewProps {
  state: InstituteState;
  onSaveClass: (cls: ClassSection) => void;
  onDeleteClass: (classId: string) => void;
  onSaveRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
}

type ScheduleTab = 'timetable' | 'classes' | 'rooms';

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  state,
  onSaveClass,
  onDeleteClass,
  onSaveRoom,
  onDeleteRoom,
}) => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('timetable');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [filterInstructorId, setFilterInstructorId] = useState<string>('all');

  // Class Modal State
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [clsCourseId, setClsCourseId] = useState(state.courses[0]?.id ?? '');
  const [clsInstructorId, setClsInstructorId] = useState(state.instructors[0]?.id ?? '');
  const [clsRoomId, setClsRoomId] = useState(state.rooms[0]?.id ?? '');
  const [clsTitle, setClsTitle] = useState('');
  const [clsDays, setClsDays] = useState<WeekDay[]>(['شنبه', 'دوشنبه']);
  const [clsStartTime, setClsStartTime] = useState('15:00');
  const [clsEndTime, setClsEndTime] = useState('17:00');
  const [clsStartDate, setClsStartDate] = useState(getTodayJalali());
  const [clsMaxCap, setClsMaxCap] = useState(12);
  const [clsStatus, setClsStatus] = useState<ClassStatus>('scheduled');

  // Room Add/Edit Modal State
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(14);
  const [roomFloor, setRoomFloor] = useState('طبقه اول');
  const [roomEquipment, setRoomEquipment] = useState('');
  const [roomDeleteNotice, setRoomDeleteNotice] = useState('');

  const openNewRoomModal = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomCapacity(14);
    setRoomFloor('طبقه اول');
    setRoomEquipment('');
    setRoomModalOpen(true);
  };

  const openEditRoomModal = (rm: Room) => {
    setEditingRoomId(rm.id);
    setRoomName(rm.name);
    setRoomCapacity(rm.capacity);
    setRoomFloor(rm.floor);
    setRoomEquipment(rm.equipment);
    setRoomModalOpen(true);
  };

  const openNewClassModal = () => {
    const defaultCourse = state.courses[0];
    setEditingClassId(null);
    setClsCourseId(defaultCourse?.id ?? '');
    setClsInstructorId(state.instructors[0]?.id ?? '');
    setClsRoomId(state.rooms[0]?.id ?? '');
    setClsTitle(defaultCourse ? `${defaultCourse.title} - کد جدید` : '');
    setClsDays(['شنبه', 'دوشنبه']);
    setClsStartTime('15:00');
    setClsEndTime('17:00');
    setClsStartDate(getTodayJalali());
    setClsMaxCap(state.rooms[0]?.capacity ?? 12);
    setClsStatus('scheduled');
    setClassModalOpen(true);
  };

  const openEditClassModal = (cls: ClassSection) => {
    setEditingClassId(cls.id);
    setClsCourseId(cls.courseId);
    setClsInstructorId(cls.instructorId);
    setClsRoomId(cls.roomId);
    setClsTitle(cls.title);
    setClsDays(cls.days);
    setClsStartTime(cls.startTime);
    setClsEndTime(cls.endTime);
    setClsStartDate(cls.startDate);
    setClsMaxCap(cls.maxCapacity);
    setClsStatus(cls.status);
    setClassModalOpen(true);
  };

  const toggleDay = (day: WeekDay) => {
    setClsDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const liveConflicts = useMemo(
    () =>
      detectScheduleConflicts(
        {
          id: editingClassId ?? undefined,
          instructorId: clsInstructorId,
          roomId: clsRoomId,
          days: clsDays,
          startTime: clsStartTime,
          endTime: clsEndTime,
        },
        state.classes,
        state.rooms,
        state.instructors,
      ),
    [
      editingClassId,
      clsInstructorId,
      clsRoomId,
      clsDays,
      clsStartTime,
      clsEndTime,
      state.classes,
      state.rooms,
      state.instructors,
    ],
  );

  const freeRooms = useMemo(
    () =>
      findAvailableRooms(
        {
          id: editingClassId ?? undefined,
          days: clsDays,
          startTime: clsStartTime,
          endTime: clsEndTime,
        },
        state.classes,
        state.rooms,
      ),
    [editingClassId, clsDays, clsStartTime, clsEndTime, state.classes, state.rooms],
  );

  const filteredClasses = useMemo(
    () =>
      state.classes.filter((cls) => {
        if (filterRoomId !== 'all' && cls.roomId !== filterRoomId) return false;
        if (filterInstructorId !== 'all' && cls.instructorId !== filterInstructorId) return false;
        return true;
      }),
    [state.classes, filterRoomId, filterInstructorId],
  );

  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveConflicts.length > 0 || clsDays.length === 0) return;

    onSaveClass({
      id: editingClassId ?? generateId('cls'),
      courseId: clsCourseId,
      instructorId: clsInstructorId,
      roomId: clsRoomId,
      title: clsTitle.trim() || 'کلاس جدید',
      term: state.settings.currentTerm,
      days: clsDays,
      startTime: clsStartTime,
      endTime: clsEndTime,
      startDate: clsStartDate,
      maxCapacity: clsMaxCap,
      status: clsStatus,
    });
    setClassModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
          {[
            { id: 'timetable', label: 'جدول هفتگی کلاس‌ها' },
            { id: 'classes', label: 'فهرست کلاس‌ها و تداخل‌سنجی' },
            { id: 'rooms', label: 'تعریف و مدیریت اتاق‌ها / کارگاه‌ها' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ScheduleTab)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab !== 'rooms' && (
            <>
              <select
                value={filterRoomId}
                onChange={(e) => setFilterRoomId(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white text-stone-800 focus:outline-none focus:border-[#8E5F15]"
              >
                <option value="all">همه کارگاه‌ها</option>
                {state.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                value={filterInstructorId}
                onChange={(e) => setFilterInstructorId(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white text-stone-800 focus:outline-none focus:border-[#8E5F15]"
              >
                <option value="all">همه اساتید</option>
                {state.instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName}
                  </option>
                ))}
              </select>
            </>
          )}
          {activeTab === 'rooms' ? (
            <button
              onClick={openNewRoomModal}
              className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف اتاق / کارگاه جدید</span>
            </button>
          ) : (
            <button
              onClick={openNewClassModal}
              className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>زمان‌بندی کلاس جدید</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'timetable' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {WEEK_DAYS.map((day) => {
            const dayClasses = filteredClasses
              .filter((c) => c.status !== 'completed' && c.days.includes(day))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="px-3.5 py-3 bg-[#FAF8F5] border-b border-[#E6DFD3] flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">{day}</span>
                  <span className="text-[11px] text-stone-500 tabular-nums">
                    {formatNumber(dayClasses.length)} کلاس
                  </span>
                </div>
                <div className="p-2.5 space-y-2.5 flex-1">
                  {dayClasses.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-stone-400">
                      کلاسی برنامه‌ریزی نشده
                    </div>
                  ) : (
                    dayClasses.map((cls) => {
                      const inst = state.instructors.find((i) => i.id === cls.instructorId);
                      const room = state.rooms.find((r) => r.id === cls.roomId);
                      const enrolled = state.enrollments.filter(
                        (e) => e.classId === cls.id && e.status !== 'dropped',
                      ).length;

                      return (
                        <div
                          key={`${day}-${cls.id}`}
                          onClick={() => openEditClassModal(cls)}
                          className="p-3 rounded-lg border border-[#E6DFD3] hover:border-[#C89B3C] bg-[#FAF8F5]/70 hover:bg-[#FBF6EB] transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="text-[11px] font-bold text-[#8E5F15] tabular-nums">
                            {toPersianDigits(cls.startTime)} تا {toPersianDigits(cls.endTime)}
                          </div>
                          <div className="text-xs font-bold text-stone-900 leading-snug">
                            {cls.title}
                          </div>
                          <div className="text-[11px] text-stone-600">{inst?.fullName}</div>
                          <div className="pt-1 border-t border-[#E6DFD3] flex items-center justify-between text-[11px] text-stone-500 tabular-nums">
                            <span className="truncate">{room?.name}</span>
                            <span>
                              {formatNumber(enrolled)}/{formatNumber(cls.maxCapacity)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">عنوان کلاس</th>
                  <th className="py-3 px-3">دوره</th>
                  <th className="py-3 px-3">استاد</th>
                  <th className="py-3 px-3">اتاق / کارگاه</th>
                  <th className="py-3 px-3">برنامه هفتگی</th>
                  <th className="py-3 px-3">ظرفیت</th>
                  <th className="py-3 px-3">وضعیت</th>
                  <th className="py-3 px-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-xs">
                {filteredClasses.map((cls) => {
                  const crs = state.courses.find((c) => c.id === cls.courseId);
                  const inst = state.instructors.find((i) => i.id === cls.instructorId);
                  const room = state.rooms.find((r) => r.id === cls.roomId);
                  const enrolled = state.enrollments.filter(
                    (e) => e.classId === cls.id && e.status !== 'dropped',
                  ).length;

                  return (
                    <tr key={cls.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">{cls.title}</td>
                      <td className="py-3 px-3 text-stone-600">{crs?.title}</td>
                      <td className="py-3 px-3 text-stone-700">{inst?.fullName}</td>
                      <td className="py-3 px-3 text-stone-600">{room?.name}</td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {cls.days.join('، ')} · {toPersianDigits(cls.startTime)} تا{' '}
                        {toPersianDigits(cls.endTime)}
                      </td>
                      <td className="py-3 px-3 tabular-nums font-medium">
                        {formatNumber(enrolled)} / {formatNumber(cls.maxCapacity)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            cls.status === 'ongoing'
                              ? 'text-emerald-700'
                              : cls.status === 'scheduled'
                              ? 'text-[#8E5F15]'
                              : 'text-stone-500'
                          }`}
                        >
                          {cls.status === 'ongoing'
                            ? 'در حال برگزاری'
                            : cls.status === 'scheduled'
                            ? 'برنامه‌ریزی شده'
                            : 'پایان یافته'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditClassModal(cls)}
                            className="p-1.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-stone-600 cursor-pointer"
                            title="ویرایش زمان‌بندی"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteClass(cls.id)}
                            className="p-1.5 border border-[#E6DFD3] hover:bg-red-50 hover:text-red-700 rounded-md text-stone-500 cursor-pointer"
                            title="حذف کلاس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-4">
          {roomDeleteNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
              {roomDeleteNotice}
            </div>
          )}
          <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  فهرست اتاق‌ها و کارگاه‌های آموزشگاه ({formatNumber(state.rooms.length)})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  نام کارگاه، ظرفیت میز کار، طبقه و تجهیزات تخصصی هر فضای آموزشی قابل تعریف و ویرایش است
                </p>
              </div>
              <button
                onClick={openNewRoomModal}
                className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن اتاق / کارگاه</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-3 px-4">نام اتاق / کارگاه</th>
                    <th className="py-3 px-3">طبقه / موقعیت</th>
                    <th className="py-3 px-3">ظرفیت</th>
                    <th className="py-3 px-3">تجهیزات و امکانات</th>
                    <th className="py-3 px-3">کلاس‌های فعال</th>
                    <th className="py-3 px-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-xs">
                  {state.rooms.map((rm) => {
                    const classesCount = state.classes.filter(
                      (c) => c.roomId === rm.id && c.status !== 'completed',
                    ).length;
                    return (
                      <tr key={rm.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">{rm.name}</td>
                        <td className="py-3 px-3 text-stone-600">{rm.floor}</td>
                        <td className="py-3 px-3 tabular-nums font-semibold text-stone-800">
                          {formatNumber(rm.capacity)} نفر
                        </td>
                        <td className="py-3 px-3 text-stone-600">{rm.equipment}</td>
                        <td className="py-3 px-3 tabular-nums text-stone-600">
                          {formatNumber(classesCount)} کلاس
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditRoomModal(rm)}
                              className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>ویرایش</span>
                            </button>
                            <button
                              onClick={() => {
                                const used = state.classes.some((c) => c.roomId === rm.id);
                                if (used) {
                                  setRoomDeleteNotice(
                                    `کارگاه «${rm.name}» در برنامه کلاس‌ها استفاده شده است و ابتدا باید کلاس‌های مرتبط به کارگاه دیگری منتقل شوند.`,
                                  );
                                  setTimeout(() => setRoomDeleteNotice(''), 4000);
                                  return;
                                }
                                onDeleteRoom(rm.id);
                              }}
                              className="p-1.5 border border-[#E6DFD3] hover:bg-red-50 hover:text-red-700 rounded-md text-stone-500 cursor-pointer"
                              title="حذف اتاق"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {classModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#181614]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingClassId ? 'ویرایش زمان‌بندی کلاس' : 'برنامه‌ریزی هوشمند کلاس جدید'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  سیستم به صورت لحظه‌ای تداخل زمانی استاد و کارگاه را بررسی می‌کند
                </p>
              </div>
              <button
                onClick={() => setClassModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">دوره آموزشی</label>
                  <select
                    value={clsCourseId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setClsCourseId(id);
                      const crs = state.courses.find((c) => c.id === id);
                      if (crs && !editingClassId) {
                        setClsTitle(`${crs.title} - کد جدید`);
                      }
                    }}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    {state.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">عنوان گروه / کلاس</label>
                  <input
                    type="text"
                    required
                    value={clsTitle}
                    onChange={(e) => setClsTitle(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">استاد مدرس</label>
                  <select
                    value={clsInstructorId}
                    onChange={(e) => setClsInstructorId(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    {state.instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.fullName} ({i.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">اتاق / کارگاه</label>
                  <select
                    value={clsRoomId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setClsRoomId(id);
                      const rm = state.rooms.find((r) => r.id === id);
                      if (rm && !editingClassId) setClsMaxCap(rm.capacity);
                    }}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    {state.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (ظرفیت {formatNumber(r.capacity)} نفر)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">
                  روزهای برگزاری کلاس
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const active = clsDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#8E5F15] text-white border-[#8E5F15]'
                            : 'bg-white text-stone-700 border-[#E6DFD3] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ساعت شروع</label>
                  <select
                    value={clsStartTime}
                    onChange={(e) => setClsStartTime(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  >
                    {TIME_SLOTS.slice(0, -1).map((t) => (
                      <option key={t} value={t}>
                        {toPersianDigits(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ساعت پایان</label>
                  <select
                    value={clsEndTime}
                    onChange={(e) => setClsEndTime(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  >
                    {TIME_SLOTS.slice(1).map((t) => (
                      <option key={t} value={t}>
                        {toPersianDigits(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ظرفیت کلاس</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={clsMaxCap}
                    onChange={(e) => setClsMaxCap(Number(e.target.value) || 10)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">وضعیت</label>
                  <select
                    value={clsStatus}
                    onChange={(e) => setClsStatus(e.target.value as ClassStatus)}
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    <option value="scheduled">برنامه‌ریزی شده</option>
                    <option value="ongoing">در حال برگزاری</option>
                    <option value="completed">پایان یافته</option>
                  </select>
                </div>
              </div>

              {clsDays.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  حداقل یک روز هفته را برای برگزاری انتخاب کنید.
                </div>
              ) : clsStartTime >= clsEndTime ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  ساعت پایان باید بعد از ساعت شروع باشد.
                </div>
              ) : liveConflicts.length > 0 ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-2 text-xs text-red-800">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>تداخل زمانی شناسایی شد:</span>
                  </div>
                  <ul className="space-y-1 list-disc pr-4">
                    {liveConflicts.map((c, idx) => (
                      <li key={idx}>{c.message}</li>
                    ))}
                  </ul>
                  {freeRooms.length > 0 && (
                    <div className="pt-2 border-t border-red-200 text-stone-800">
                      <span className="font-semibold">پیشنهاد کارگاه‌های آزاد در این ساعت: </span>
                      {freeRooms.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setClsRoomId(r.id)}
                          className="ml-1.5 underline text-[#8E5F15] hover:text-[#754D10] cursor-pointer"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>برنامه بدون تداخل تایید شد؛ کارگاه و استاد در این زمان آزاد هستند.</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#E6DFD3] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="h-9 px-4 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={liveConflicts.length > 0 || clsDays.length === 0 || clsStartTime >= clsEndTime}
                  className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  {editingClassId ? 'ذخیره تغییرات' : 'ثبت کلاس در برنامه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roomModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#181614]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {editingRoomId ? 'ویرایش مشخصات اتاق / کارگاه' : 'تعریف اتاق / کارگاه جدید'}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!roomName.trim()) return;
                onSaveRoom({
                  id: editingRoomId ?? generateId('room'),
                  name: roomName.trim(),
                  capacity: Math.max(1, roomCapacity),
                  floor: roomFloor.trim() || 'طبقه همکف',
                  equipment: roomEquipment.trim() || 'میز کار زرگری و ابزار استاندارد',
                });
                setRoomModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  نام اتاق / کارگاه *
                </label>
                <input
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="مثلاً: کارگاه زرگری ب یا آتلیه گوهرشناسی"
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">ظرفیت میز کار</label>
                  <input
                    type="number"
                    min={1}
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(Number(e.target.value) || 1)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">طبقه</label>
                  <input
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">تجهیزات کارگاهی</label>
                <input
                  value={roomEquipment}
                  onChange={(e) => setRoomEquipment(e.target.value)}
                  placeholder="میز زرگری، سرپیک، نورد، میکروسکوپ جواهرشناسی..."
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="h-9 px-4 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  {editingRoomId ? 'ذخیره تغییرات' : 'ثبت اتاق / کارگاه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
