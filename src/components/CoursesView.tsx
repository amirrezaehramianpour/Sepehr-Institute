import React, { useMemo, useState } from 'react';
import { BookOpen, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import type { Course, InstituteState } from '../types/institute.ts';
import { formatNumber, formatToman, generateId } from '../utils/formatters.ts';

interface CoursesViewProps {
  state: InstituteState;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  state,
  onSaveCourse,
  onDeleteCourse,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('زرگری و ساخت طلا');
  const [totalHours, setTotalHours] = useState(40);
  const [sessionsCount, setSessionsCount] = useState(20);
  const [baseTuition, setBaseTuition] = useState(12000000);
  const [description, setDescription] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');

  const categories = useMemo(() => {
    const set = new Set(state.courses.map((c) => c.category).filter(Boolean));
    return Array.from(set);
  }, [state.courses]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.courses.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [state.courses, query, categoryFilter]);

  const openNewModal = () => {
    setEditingCourseId(null);
    setCode(`GLD-${state.courses.length + 101}`);
    setTitle('');
    setCategory('زرگری و ساخت طلا');
    setTotalHours(40);
    setSessionsCount(20);
    setBaseTuition(12000000);
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourseId(course.id);
    setCode(course.code);
    setTitle(course.title);
    setCategory(course.category);
    setTotalHours(course.totalHours);
    setSessionsCount(course.sessionsCount);
    setBaseTuition(course.baseTuition);
    setDescription(course.description);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSaveCourse({
      id: editingCourseId ?? generateId('crs'),
      code: code.trim() || `GLD-${state.courses.length + 101}`,
      title: title.trim(),
      category: category.trim() || 'عمومی',
      totalHours: Math.max(1, totalHours),
      sessionsCount: Math.max(1, sessionsCount),
      baseTuition: Math.max(0, baseTuition),
      description: description.trim(),
    });
    setModalOpen(false);
  };

  const handleDelete = (course: Course) => {
    const hasClasses = state.classes.some((cls) => cls.courseId === course.id);
    if (hasClasses) {
      setDeleteNotice(
        `دوره «${course.title}» دارای کلاس ثبت‌شده است و ابتدا باید کلاس‌های مرتبط حذف یا ویرایش شوند.`,
      );
      setTimeout(() => setDeleteNotice(''), 4000);
      return;
    }
    onDeleteCourse(course.id);
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
              placeholder="جستجوی دوره بر اساس عنوان، کد یا شاخه هنری..."
              className="w-full h-9 pr-9 pl-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white text-stone-800 focus:outline-none focus:border-[#8E5F15]"
          >
            <option value="all">همه گروه‌های آموزشی</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openNewModal}
          className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ثبت دوره آموزشی جدید</span>
        </button>
      </div>

      {deleteNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          {deleteNotice}
        </div>
      )}

      <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-medium text-stone-700">دوره‌ای یافت نشد.</p>
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-[#8E5F15] hover:bg-[#754D10] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              تعریف اولین دوره آموزشی
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">کد دوره</th>
                  <th className="py-3 px-3">عنوان دوره</th>
                  <th className="py-3 px-3">گروه آموزشی</th>
                  <th className="py-3 px-3">مدت و جلسات</th>
                  <th className="py-3 px-3">شهریه مصوب</th>
                  <th className="py-3 px-3">کلاس‌ها و هنرجویان</th>
                  <th className="py-3 px-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-xs">
                {filteredCourses.map((crs) => {
                  const courseClasses = state.classes.filter((c) => c.courseId === crs.id);
                  const classIds = new Set(courseClasses.map((c) => c.id));
                  const enrolledCount = state.enrollments.filter(
                    (e) => classIds.has(e.classId) && e.status !== 'dropped',
                  ).length;

                  return (
                    <tr key={crs.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-code text-stone-600">{crs.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{crs.title}</div>
                        {crs.description && (
                          <div className="text-[11px] text-stone-500 max-w-md truncate mt-0.5">
                            {crs.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone-700">{crs.category}</td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {formatNumber(crs.totalHours)} ساعت · {formatNumber(crs.sessionsCount)} جلسه
                      </td>
                      <td className="py-3 px-3 font-bold text-[#8E5F15] tabular-nums">
                        {formatToman(crs.baseTuition)}
                      </td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {formatNumber(courseClasses.length)} کلاس · {formatNumber(enrolledCount)} هنرجو
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(crs)}
                            className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            onClick={() => handleDelete(crs)}
                            className="p-1.5 border border-[#E6DFD3] hover:bg-red-50 hover:text-red-700 rounded-md text-stone-500 cursor-pointer"
                            title="حذف دوره"
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
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#181614]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {editingCourseId ? 'ویرایش مشخصات دوره آموزشی' : 'ثبت دوره آموزشی جدید'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-stone-700 mb-1">عنوان دوره *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلاً: مخراج‌کاری میکروسکوپی پیشرفته"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">کد دوره</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="GLD-201"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg font-code focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">گروه آموزشی</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="زرگری، مخراج‌کاری، طراحی سه‌بعدی، گوهرشناسی..."
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">شهریه مصوب (تومان) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={baseTuition}
                    onChange={(e) => setBaseTuition(Number(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">مجموع ساعات</label>
                  <input
                    type="number"
                    min={1}
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value) || 1)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">تعداد جلسات</label>
                  <input
                    type="number"
                    min={1}
                    value={sessionsCount}
                    onChange={(e) => setSessionsCount(Number(e.target.value) || 1)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">توضیحات و سرفصل‌ها</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="معرفی کوتاه، تکنیک‌ها و ابزارهای مورد نیاز دوره..."
                  className="w-full p-3 border border-[#E6DFD3] rounded-lg leading-relaxed focus:outline-none focus:border-[#8E5F15]"
                />
              </div>

              <div className="pt-3 border-t border-[#E6DFD3] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-700 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  {editingCourseId ? 'ذخیره تغییرات دوره' : 'ثبت دوره جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
