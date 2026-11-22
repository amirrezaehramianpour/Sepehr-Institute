import React from 'react';
import {
  ArrowUpLeft,
  Calendar,
  CreditCard,
  TrendingUp,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import type { InstituteState, NavSection } from '../types/institute.ts';
import type { InstituteAnalytics } from '../utils/analytics.ts';
import {
  formatNumber,
  formatScore,
  formatToman,
  toPersianDigits,
} from '../utils/formatters.ts';

interface DashboardViewProps {
  state: InstituteState;
  analytics: InstituteAnalytics;
  onNavigate: (section: NavSection) => void;
  onOpenQuickPayment: (studentId: string) => void;
  onOpenStudentFile: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  analytics,
  onNavigate,
  onOpenQuickPayment,
  onOpenStudentFile,
}) => {
  const activeClasses = state.classes.filter((c) => c.status !== 'completed');
  const maxMonthlyRevenue = Math.max(
    1,
    ...analytics.monthlyStats.map((m) => Math.max(m.revenue, m.expenses)),
  );

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-stone-500">هنرجویان فعال آکادمی</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">
              {formatNumber(analytics.activeStudents)} نفر
            </span>
            <span className="text-xs text-stone-500 tabular-nums">
              از کل {formatNumber(analytics.totalStudents)} پرونده
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 text-xs text-stone-500">
            ثبت‌نام‌های جاری: {formatNumber(analytics.totalActiveEnrollments)} مورد
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-stone-500">کارگاه‌های فعال و تکمیل ظرفیت</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">
              {formatNumber(analytics.activeClasses)} کلاس
            </span>
            <span className="text-xs font-bold text-[#8E5F15] tabular-nums">
              {formatNumber(analytics.overallFillRate)}٪ تکمیل
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 text-xs text-stone-500 tabular-nums">
            ظرفیت کل میزکارها: {formatNumber(analytics.totalCapacity)} نفر
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-stone-500">درآمد وصول‌شده کل</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold text-stone-900 tabular-nums">
              {formatToman(analytics.totalCollectedRevenue)}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs tabular-nums">
            <span className="text-amber-800 font-medium">
              مطالبات معوق: {formatToman(analytics.totalReceivables)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-stone-500">کیفیت آموزشی و کارنامه</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">
              {formatScore(analytics.overallAvgScore)}{' '}
              <span className="text-xs font-normal text-stone-500">از ۲۰</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 tabular-nums">
              {formatNumber(analytics.overallPassRate)}٪ قبولی
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 text-xs text-stone-500 tabular-nums">
            بر اساس {formatNumber(state.grades.length)} کارنامه ثبت‌شده
          </div>
        </div>
      </section>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Monthly Revenue Chart + Active Classes Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Monthly Revenue vs Expenses Chart */}
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-stone-900">روند درآمد و هزینه‌های ماهانه</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  مقایسه وصولی شهریه با هزینه‌های کارگاهی آکادمی
                </p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>تحلیل کامل</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {analytics.monthlyStats.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-stone-500">
                هنوز تراکنش مالی برای رسم نمودار ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 items-end h-44 pt-4 border-b border-stone-100 pb-2">
                  {analytics.monthlyStats.map((m) => {
                    const revHeight = Math.max(8, Math.round((m.revenue / maxMonthlyRevenue) * 100));
                    const expHeight = Math.max(4, Math.round((m.expenses / maxMonthlyRevenue) * 100));
                    return (
                      <div
                        key={m.monthKey}
                        className="flex flex-col items-center h-full justify-end gap-1.5"
                      >
                        <div className="w-full flex items-end justify-center gap-1.5 flex-1">
                          <div
                            title={`درآمد: ${formatToman(m.revenue)}`}
                            style={{ height: `${revHeight}%` }}
                            className="w-5 bg-[#9A6B1E] rounded-t-sm transition-all"
                          />
                          <div
                            title={`هزینه: ${formatToman(m.expenses)}`}
                            style={{ height: `${expHeight}%` }}
                            className="w-3 bg-[#D6CFC2] rounded-t-sm transition-all"
                          />
                        </div>
                        <span className="text-[11px] text-stone-600 font-medium whitespace-nowrap">
                          {m.monthLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-[#9A6B1E] rounded-xs inline-block" />
                      درآمد وصولی
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-[#D6CFC2] rounded-xs inline-block" />
                      هزینه‌ها
                    </span>
                  </div>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    سود خالص دوره: {formatToman(analytics.netProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Classes Overview Table */}
          <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">برنامه کارگاه‌ها و کلاس‌های جاری</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  وضعیت زمان‌بندی، کارگاه و ظرفیت میزکار هنرجویان
                </p>
              </div>
              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>جدول هفتگی</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-2.5 px-4">عنوان کلاس</th>
                    <th className="py-2.5 px-3">استاد</th>
                    <th className="py-2.5 px-3">روز و ساعت</th>
                    <th className="py-2.5 px-3">کارگاه</th>
                    <th className="py-2.5 px-4 text-left">ظرفیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {activeClasses.map((cls) => {
                    const inst = state.instructors.find((i) => i.id === cls.instructorId);
                    const room = state.rooms.find((r) => r.id === cls.roomId);
                    const enrolled = state.enrollments.filter(
                      (e) => e.classId === cls.id && e.status !== 'dropped',
                    ).length;
                    return (
                      <tr key={cls.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4 font-semibold text-stone-900">{cls.title}</td>
                        <td className="py-3 px-3 text-stone-600">{inst?.fullName ?? '—'}</td>
                        <td className="py-3 px-3 text-stone-600 tabular-nums">
                          {cls.days.join('، ')} · {toPersianDigits(cls.startTime)} تا{' '}
                          {toPersianDigits(cls.endTime)}
                        </td>
                        <td className="py-3 px-3 text-stone-600">{room?.name ?? '—'}</td>
                        <td className="py-3 px-4 text-left tabular-nums font-semibold text-stone-900">
                          {formatNumber(enrolled)} / {formatNumber(cls.maxCapacity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Left Column: Smart Advisor Briefings + Pending Tuition Collection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Smart Advisor Highlights */}
          <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8E5F15]" />
                <h2 className="text-sm font-bold text-stone-900">خلاصه مشاور هوشمند مدیریت</h2>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] cursor-pointer whitespace-nowrap shrink-0"
              >
                مشاهده همه
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {analytics.advisorInsights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-stone-500">
                      {insight.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        insight.priority === 'high'
                          ? 'text-red-700'
                          : insight.priority === 'medium'
                          ? 'text-amber-800'
                          : 'text-emerald-700'
                      }`}
                    >
                      {insight.priority === 'high'
                        ? 'اولویت بالا'
                        : insight.priority === 'medium'
                        ? 'قابل بهبود'
                        : 'عملکرد برتر'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-stone-900">{insight.title}</div>
                  <p className="text-xs text-stone-600 leading-relaxed">{insight.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Tuition / Debtors Quick Collection */}
          <div className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#8E5F15]" />
                <h2 className="text-sm font-bold text-stone-900">شهریه‌های در انتظار تسویه</h2>
              </div>
              <button
                onClick={() => onNavigate('finance')}
                className="text-xs font-semibold text-[#8E5F15] hover:text-[#754D10] cursor-pointer whitespace-nowrap shrink-0"
              >
                بخش مالی
              </button>
            </div>

            {analytics.debtors.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                تمامی شهریه‌های ثبت‌نامی به صورت کامل تسویه شده‌اند.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {analytics.debtors.slice(0, 5).map((debtor) => (
                  <div
                    key={debtor.studentId}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="min-w-0">
                      <button
                        onClick={() => onOpenStudentFile(debtor.studentId)}
                        className="text-xs font-semibold text-stone-900 hover:text-[#8E5F15] truncate block cursor-pointer"
                      >
                        {debtor.fullName}
                      </button>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5">
                        {debtor.activeCourses.join('، ')} · {toPersianDigits(debtor.phone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-bold text-amber-800 tabular-nums">
                        {formatToman(debtor.balanceDue)}
                      </span>
                      <button
                        onClick={() => onOpenQuickPayment(debtor.studentId)}
                        className="px-2.5 py-1.5 bg-[#F5F1E9] hover:bg-[#8E5F15] hover:text-white text-stone-800 rounded-md text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>ثبت قسط</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts Strip */}
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              ثبت حضور و غیاب و ورود نمرات جلسات امروز
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('attendance')}
                className="px-3 py-1.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>حضور و غیاب</span>
              </button>
              <button
                onClick={() => onNavigate('grades')}
                className="px-3 py-1.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                ثبت نمرات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
