import React from 'react';
import { Lightbulb, Award, TrendingUp, BookOpen, Building2 } from 'lucide-react';
import type { InstituteAnalytics } from '../utils/analytics.ts';
import { formatNumber, formatScore, formatToman } from '../utils/formatters.ts';

interface AnalyticsAdvisorViewProps {
  analytics: InstituteAnalytics;
}

export const AnalyticsAdvisorView: React.FC<AnalyticsAdvisorViewProps> = ({
  analytics,
}) => {
  const maxCourseEnrollments = Math.max(
    1,
    ...analytics.courseStats.map((c) => c.enrollmentCount),
  );
  const maxMonthRev = Math.max(1, ...analytics.monthlyStats.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* Executive Advisor Briefings */}
      <section className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#8E5F15]" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                تحلیل و پیشنهادهای مشاور هوشمند مدیریت
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                استخراج خودکار الگوهای ثبت‌نام، بازدهی کارگاهی و زمان‌های اوج درآمد از داده‌های زنده آکادمی
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#E6DFD3]">
          {analytics.advisorInsights.map((insight) => (
            <div key={insight.id} className="p-5 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-stone-500">{insight.category}</span>
                  <span
                    className={`font-bold ${
                      insight.priority === 'high'
                        ? 'text-red-700'
                        : insight.priority === 'medium'
                        ? 'text-amber-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    {insight.priority === 'high'
                      ? 'نیازمند اقدام فوری'
                      : insight.priority === 'medium'
                      ? 'فرصت بهینه‌سازی'
                      : 'نقطه قوت کلیدی'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-stone-900 leading-snug">
                  {insight.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">{insight.summary}</p>
              </div>
              <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-700 leading-relaxed">
                <strong className="text-[#8E5F15]">توصیه اجرایی: </strong>
                {insight.recommendation}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Courses & Peak Revenue Timing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Top Enrolled Courses */}
        <section className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#8E5F15]" />
              <h2 className="text-sm font-bold text-stone-900">
                دوره‌ها بر اساس بیشترین تعداد ثبت‌نام
              </h2>
            </div>
            {analytics.topCourse && (
              <span className="text-[11px] font-semibold text-[#8E5F15]">
                رتبه اول: {analytics.topCourse.title}
              </span>
            )}
          </div>

          <div className="space-y-4 pt-1">
            {analytics.courseStats.map((crs, idx) => {
              const barPct = Math.max(
                8,
                Math.round((crs.enrollmentCount / maxCourseEnrollments) * 100),
              );
              return (
                <div key={crs.courseId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-stone-900">
                      <span className="text-stone-400 tabular-nums ml-1.5">
                        {formatNumber(idx + 1)}.
                      </span>
                      {crs.title}
                    </div>
                    <div className="text-stone-600 tabular-nums">
                      <strong className="text-stone-900">
                        {formatNumber(crs.enrollmentCount)} هنرجو
                      </strong>{' '}
                      · {formatNumber(crs.fillRate)}٪ ظرفیت · {formatToman(crs.collectedRevenue)}
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPct}%` }}
                      className="h-full bg-[#9A6B1E] rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Peak Revenue Timing */}
        <section className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-stone-900">
                زمان‌بندی اوج درآمد و جریان نقدینگی
              </h2>
            </div>
            {analytics.peakMonth && (
              <span className="text-[11px] font-semibold text-emerald-700">
                اوج درآمد: {analytics.peakMonth.monthLabel}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {analytics.monthlyStats.map((m) => {
              const pct = Math.max(6, Math.round((m.revenue / maxMonthRev) * 100));
              const isPeak = analytics.peakMonth?.monthKey === m.monthKey;
              return (
                <div key={m.monthKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <div className="font-semibold text-stone-900">
                      {m.monthLabel}{' '}
                      {isPeak && (
                        <span className="text-[11px] font-bold text-[#8E5F15] mr-1">
                          (بیشترین درآمد)
                        </span>
                      )}
                    </div>
                    <div className="text-stone-600">
                      درآمد: <strong className="text-stone-900">{formatToman(m.revenue)}</strong> ·{' '}
                      {formatNumber(m.enrollmentsCount)} ثبت‌نام جدید
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all ${
                        isPeak ? 'bg-[#9A6B1E]' : 'bg-stone-700'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Instructor Efficiency Ranking Matrix */}
      <section className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E6DFD3] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#8E5F15]" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                رتبه‌بندی بازدهی و عملکرد اساتید
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                محاسبه شاخص بازدهی بر مبنای نرخ قبولی (۳۵٪)، میانگین نمره (۲۵٪)، تکمیل ظرفیت کارگاه (۲۰٪) و حضور هنرجویان (۲۰٪)
              </p>
            </div>
          </div>
          {analytics.topInstructor && (
            <div className="text-xs font-bold text-[#8E5F15]">
              استاد برتر دوره: {analytics.topInstructor.fullName}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                <th className="py-3 px-4">رتبه و استاد</th>
                <th className="py-3 px-3">تخصص</th>
                <th className="py-3 px-3">کلاس / هنرجو</th>
                <th className="py-3 px-3">میانگین نمره</th>
                <th className="py-3 px-3">نرخ قبولی</th>
                <th className="py-3 px-3">حضور کلاسی</th>
                <th className="py-3 px-3">درآمد ایجادشده</th>
                <th className="py-3 px-4 text-left">شاخص بازدهی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs tabular-nums">
              {analytics.instructorStats.map((inst, idx) => (
                <tr key={inst.instructorId} className="hover:bg-[#FAF8F5]">
                  <td className="py-3 px-4 font-bold text-stone-900">
                    <span className="text-stone-400 ml-1.5">{formatNumber(idx + 1)}.</span>
                    {inst.fullName}
                  </td>
                  <td className="py-3 px-3 text-stone-600">{inst.specialty}</td>
                  <td className="py-3 px-3 text-stone-700">
                    {formatNumber(inst.classesCount)} کلاس · {formatNumber(inst.studentsCount)} هنرجو
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-900">
                    {inst.avgScore > 0 ? `${formatScore(inst.avgScore)} از ۲۰` : '—'}
                  </td>
                  <td className="py-3 px-3 text-emerald-700 font-semibold">
                    {inst.avgScore > 0 ? `${formatNumber(inst.passRate)}٪` : '—'}
                  </td>
                  <td className="py-3 px-3 text-stone-700">
                    {formatNumber(inst.attendanceRate)}٪
                  </td>
                  <td className="py-3 px-3 font-medium text-stone-900">
                    {formatToman(inst.generatedRevenue)}
                  </td>
                  <td className="py-3 px-4 text-left">
                    <span
                      className={`font-extrabold text-sm ${
                        inst.efficiencyIndex >= 85
                          ? 'text-emerald-700'
                          : inst.efficiencyIndex >= 70
                          ? 'text-[#8E5F15]'
                          : 'text-amber-800'
                      }`}
                    >
                      {formatNumber(inst.efficiencyIndex)} / ۱۰۰
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Room Utilization */}
      <section className="bg-white border border-[#E6DFD3] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-stone-600" />
          <h2 className="text-sm font-bold text-stone-900">
            بهره‌وری کارگاه‌ها و فضاهای آموزشی (در هفته)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {analytics.roomStats.map((rm) => (
            <div key={rm.roomId} className="border border-[#E6DFD3] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-stone-900 truncate">{rm.name}</div>
              <div className="text-[11px] text-stone-500 tabular-nums">
                {formatNumber(rm.classesCount)} کلاس · {formatNumber(rm.weeklyHours)} ساعت در هفته
              </div>
              <div className="w-full h-2 bg-[#F5F1E9] rounded-full overflow-hidden">
                <div
                  style={{ width: `${rm.utilizationPercent}%` }}
                  className="h-full bg-[#1C1917] rounded-full"
                />
              </div>
              <div className="text-[11px] font-semibold text-stone-700 tabular-nums">
                نرخ اشغال: {formatNumber(rm.utilizationPercent)}٪
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
