import React, { useMemo, useState } from 'react';
import { Edit3, GraduationCap, Plus, Search, Trash2, X } from 'lucide-react';
import type { InstituteState, Instructor } from '../types/institute.ts';
import {
  formatNumber,
  formatToman,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';

interface InstructorsViewProps {
  state: InstituteState;
  onSaveInstructor: (inst: Instructor) => void;
  onDeleteInstructor: (instructorId: string) => void;
}

export const InstructorsView: React.FC<InstructorsViewProps> = ({
  state,
  onSaveInstructor,
  onDeleteInstructor,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(38);
  const [hourlyRate, setHourlyRate] = useState(400000);
  const [joinedAt, setJoinedAt] = useState(getTodayJalali());
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [deleteNotice, setDeleteNotice] = useState('');

  const filteredInstructors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.instructors.filter((inst) => {
      if (statusFilter !== 'all' && inst.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inst.fullName.toLowerCase().includes(q) ||
        inst.specialty.toLowerCase().includes(q) ||
        inst.phone.includes(q)
      );
    });
  }, [state.instructors, query, statusFilter]);

  const openNewModal = () => {
    setEditingId(null);
    setFullName('');
    setSpecialty('');
    setPhone('');
    setEmail('');
    setCommissionPercent(38);
    setHourlyRate(400000);
    setJoinedAt(getTodayJalali());
    setStatus('active');
    setModalOpen(true);
  };

  const openEditModal = (inst: Instructor) => {
    setEditingId(inst.id);
    setFullName(inst.fullName);
    setSpecialty(inst.specialty);
    setPhone(inst.phone);
    setEmail(inst.email);
    setCommissionPercent(inst.commissionPercent);
    setHourlyRate(inst.hourlyRate);
    setJoinedAt(inst.joinedAt);
    setStatus(inst.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !specialty.trim()) return;
    onSaveInstructor({
      id: editingId ?? generateId('inst'),
      fullName: fullName.trim(),
      specialty: specialty.trim(),
      phone: phone.trim(),
      email: email.trim(),
      commissionPercent: Math.min(100, Math.max(0, commissionPercent)),
      hourlyRate: Math.max(0, hourlyRate),
      joinedAt: joinedAt.trim() || getTodayJalali(),
      status,
    });
    setModalOpen(false);
  };

  const handleDelete = (inst: Instructor) => {
    const hasClasses = state.classes.some((c) => c.instructorId === inst.id);
    if (hasClasses) {
      setDeleteNotice(
        `استاد «${inst.fullName}» دارای کلاس ثبت‌شده است. می‌توانید وضعیت همکاری ایشان را به «غیرفعال» تغییر دهید یا ابتدا کلاس‌ها را ویرایش کنید.`,
      );
      setTimeout(() => setDeleteNotice(''), 4500);
      return;
    }
    onDeleteInstructor(inst.id);
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
              placeholder="جستجوی استاد با نام، تخصص یا شماره تماس..."
              className="w-full h-9 pr-9 pl-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
            {[
              { id: 'all', label: 'همه' },
              { id: 'active', label: 'فعال' },
              { id: 'inactive', label: 'غیرفعال' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as 'all' | 'active' | 'inactive')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openNewModal}
          className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ثبت استاد جدید</span>
        </button>
      </div>

      {deleteNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          {deleteNotice}
        </div>
      )}

      <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        {filteredInstructors.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <GraduationCap className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-medium text-stone-700">استادی با این مشخصات یافت نشد.</p>
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-[#8E5F15] hover:bg-[#754D10] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              ثبت اولین استاد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">نام و نام خانوادگی</th>
                  <th className="py-3 px-3">تخصص تدریس</th>
                  <th className="py-3 px-3">شماره تماس و ایمیل</th>
                  <th className="py-3 px-3">نرخ همکاری</th>
                  <th className="py-3 px-3">کلاس‌ها و هنرجویان</th>
                  <th className="py-3 px-3">وضعیت</th>
                  <th className="py-3 px-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-xs">
                {filteredInstructors.map((inst) => {
                  const instClasses = state.classes.filter((c) => c.instructorId === inst.id);
                  const clsIds = new Set(instClasses.map((c) => c.id));
                  const studentsCount = state.enrollments.filter(
                    (e) => clsIds.has(e.classId) && e.status !== 'dropped',
                  ).length;

                  return (
                    <tr key={inst.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{inst.fullName}</div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          همکاری از {toPersianDigits(inst.joinedAt)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-700">{inst.specialty}</td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        <div>{toPersianDigits(inst.phone || '—')}</div>
                        {inst.email && (
                          <div className="text-[11px] text-stone-500 font-code">{inst.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        <div className="font-semibold text-emerald-700">
                          {formatNumber(inst.commissionPercent)}٪ از شهریه
                        </div>
                        <div className="text-[11px] text-stone-500">
                          ساعتی: {formatToman(inst.hourlyRate)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {formatNumber(instClasses.length)} کلاس · {formatNumber(studentsCount)} هنرجو
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            inst.status === 'active' ? 'text-emerald-700' : 'text-stone-500'
                          }`}
                        >
                          {inst.status === 'active' ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(inst)}
                            className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            onClick={() => handleDelete(inst)}
                            className="p-1.5 border border-[#E6DFD3] hover:bg-red-50 hover:text-red-700 rounded-md text-stone-500 cursor-pointer"
                            title="حذف استاد"
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
                {editingId ? 'ویرایش اطلاعات استاد' : 'ثبت استاد جدید'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">نام و نام خانوادگی *</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثلاً: استاد منوچهر زرین‌پور"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">تخصص تدریس *</label>
                  <input
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثلاً: طلاسازی و مخراج‌کاری میکروسکوپی"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">شماره موبایل</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">ایمیل</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="master@zarinsaz.ir"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg font-code focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">سهم حق‌التدریس (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                    className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">نرخ ساعتی (تومان)</label>
                  <input
                    type="number"
                    min={0}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                    className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">تاریخ شروع</label>
                  <input
                    value={joinedAt}
                    onChange={(e) => setJoinedAt(e.target.value)}
                    className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">وضعیت همکاری</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                  </select>
                </div>
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
                  {editingId ? 'ذخیره تغییرات استاد' : 'ثبت استاد جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
