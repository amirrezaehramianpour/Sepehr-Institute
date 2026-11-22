import React, { useEffect, useMemo, useState } from 'react';
import { Send, CheckCircle2, MessageSquare } from 'lucide-react';
import type {
  CommunicationChannel,
  CommunicationLog,
  InstituteState,
} from '../types/institute.ts';
import type { InstituteAnalytics } from '../utils/analytics.ts';
import {
  formatNumber,
  formatToman,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';

interface CommunicationsViewProps {
  state: InstituteState;
  analytics: InstituteAnalytics;
  initialDebtorStudentId?: string | null;
  onClearInitialDebtor?: () => void;
  onSendCommunication: (log: CommunicationLog) => void;
}

const TEMPLATES = [
  {
    id: 'debt',
    label: 'یادآور تسویه قسط شهریه',
    subject: 'یادآور تسویه باقیمانده شهریه',
    message:
      'هنرجوی گرامی، با سلام. خواهشمند است نسبت به تسویه باقیمانده شهریه دوره آموزشی خود پیش از جلسه آزمون پایان دوره اقدام فرمایید. با تشکر - واحد مالی آموزشگاه.',
  },
  {
    id: 'exam',
    label: 'اعلام زمان آزمون و کارنامه',
    subject: 'اطلاعیه زمان‌بندی آزمون پایان دوره',
    message:
      'هنرجوی گرامی، آزمون ارزیابی نهایی دوره طبق برنامه کلاسی برگزار و کارنامه الکترونیکی شما بلافاصله پس از تصحیح صادر خواهد شد.',
  },
  {
    id: 'welcome',
    label: 'خوش‌آمدگویی و برنامه کارگاه',
    subject: 'خوش‌آمدگویی به آکادمی زرین‌ساز',
    message:
      'ثبت‌نام شما در کارگاه تخصصی ساخت طلا و جواهر با موفقیت انجام شد. لطفاً ۱۵ دقیقه پیش از شروع اولین جلسه در محل کارگاه حضور داشته باشید.',
  },
  {
    id: 'reschedule',
    label: 'اطلاعیه جابجایی ساعت کلاس',
    subject: 'تغییر موقت زمان برگزاری کارگاه',
    message:
      'به اطلاع هنرجویان محترم می‌رساند جلسه پیش‌رو با هماهنگی استاد مدرس با یک ساعت تاخیر برگزار می‌گردد.',
  },
];

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  state,
  analytics,
  initialDebtorStudentId,
  onClearInitialDebtor,
  onSendCommunication,
}) => {
  const [recipientType, setRecipientType] = useState<'student' | 'class' | 'debtors'>(
    initialDebtorStudentId ? 'student' : 'class',
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialDebtorStudentId || state.students[0]?.id || '',
  );
  const [selectedClassId, setSelectedClassId] = useState(state.classes[0]?.id || '');
  const [channel, setChannel] = useState<CommunicationChannel>('پیامک');
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    if (initialDebtorStudentId) {
      setRecipientType('student');
      setSelectedStudentId(initialDebtorStudentId);
      const debtor = analytics.debtors.find((d) => d.studentId === initialDebtorStudentId);
      setSubject('یادآور تسویه مانده شهریه');
      setMessage(
        debtor
          ? `سلام ${debtor.fullName} گرامی، مبلغ ${formatToman(
              debtor.balanceDue,
            )} از شهریه دوره شما در ${state.settings.name} باقی مانده است. لطفاً جهت تسویه با دفتر آکادمی تماس بگیرید.`
          : TEMPLATES[0].message,
      );
      onClearInitialDebtor?.();
    }
  }, [initialDebtorStudentId, analytics.debtors, onClearInitialDebtor, state.settings.name]);

  const recipientStats = useMemo(() => {
    if (recipientType === 'student') {
      const stu = state.students.find((s) => s.id === selectedStudentId);
      return {
        label: stu ? `${stu.fullName} (${toPersianDigits(stu.phone)})` : 'هنرجو',
        count: stu ? 1 : 0,
      };
    }
    if (recipientType === 'class') {
      const cls = state.classes.find((c) => c.id === selectedClassId);
      const count = state.enrollments.filter(
        (e) => e.classId === selectedClassId && e.status !== 'dropped',
      ).length;
      return {
        label: cls ? `کلاس ${cls.title}` : 'کلاس',
        count,
      };
    }
    return {
      label: `کلیه هنرجویان بدهکار (${formatNumber(analytics.debtors.length)} نفر)`,
      count: analytics.debtors.length,
    };
  }, [
    recipientType,
    selectedStudentId,
    selectedClassId,
    state.students,
    state.classes,
    state.enrollments,
    analytics.debtors.length,
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || recipientStats.count === 0) return;

    onSendCommunication({
      id: generateId('comm'),
      recipientType,
      recipientLabel: recipientStats.label,
      channel,
      subject: subject.trim(),
      message: message.trim(),
      sentAt: `${getTodayJalali()} · ثبت سیستمی`,
      count: recipientStats.count,
    });
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSend}
        className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-5"
      >
        <div>
          <h2 className="text-sm font-bold text-stone-900">ارسال پیام و اطلاع‌رسانی به هنرجویان</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ارسال فردی، گروه کلاسی یا یادآور خودکار برای بدهکاران شهریه
          </p>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-stone-700">قالب‌های آماده پیام:</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                type="button"
                key={tpl.id}
                onClick={() => {
                  setSubject(
                    tpl.id === 'welcome'
                      ? `خوش‌آمدگویی به ${state.settings.name}`
                      : tpl.subject,
                  );
                  setMessage(tpl.message);
                }}
                className="px-3 py-1.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-[11px] font-medium text-stone-700 cursor-pointer transition-colors"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">گروه مخاطب</label>
            <select
              value={recipientType}
              onChange={(e) =>
                setRecipientType(e.target.value as 'student' | 'class' | 'debtors')
              }
              className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
            >
              <option value="class">همه هنرجویان یک کلاس</option>
              <option value="debtors">کلیه هنرجویان بدهکار</option>
              <option value="student">ارسال فردی به یک هنرجو</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">کانال ارتباطی</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
              className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
            >
              <option value="پیامک">پیامک (SMS)</option>
              <option value="اطلاعیه داخلی">اطلاعیه کارتابل هنرجو</option>
              <option value="تماس تلفنی">ثبت پیگیری تماس تلفنی</option>
            </select>
          </div>

          {recipientType === 'class' && (
            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">انتخاب کلاس</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
              >
                {state.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'student' && (
            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">انتخاب هنرجو</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
              >
                {state.students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.fullName} — {toPersianDigits(stu.phone)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block font-medium text-stone-700 mb-1">موضوع پیام</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-medium text-stone-700 mb-1">متن پیام</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-[#E6DFD3] rounded-lg leading-relaxed focus:outline-none focus:border-[#8E5F15]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#E6DFD3] flex items-center justify-between">
          <span className="text-xs text-stone-600 tabular-nums">
            گیرنده: <strong>{recipientStats.label}</strong> ({formatNumber(recipientStats.count)} نفر)
          </span>
          <div className="flex items-center gap-3">
            {sentNotice && (
              <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>در تاریخچه ارتباطات ثبت شد</span>
              </span>
            )}
            <button
              type="submit"
              disabled={recipientStats.count === 0}
              className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال و ثبت پیام</span>
            </button>
          </div>
        </div>
      </form>

      <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E6DFD3] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#8E5F15]" />
          <h3 className="text-sm font-bold text-stone-900">تاریخچه پیام‌ها و پیگیری‌ها</h3>
        </div>

        {state.communications.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            هنوز پیامی ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EAE0] max-h-[540px] overflow-y-auto">
            {state.communications.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-stone-900">{log.subject}</span>
                  <span className="text-[11px] font-medium text-[#8E5F15]">{log.channel}</span>
                </div>
                <div className="text-[11px] text-stone-500 tabular-nums">
                  {log.recipientLabel} · {formatNumber(log.count)} مخاطب · {toPersianDigits(log.sentAt)}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
