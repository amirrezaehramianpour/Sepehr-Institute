import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  Plus,
  Printer,
  Send,
  X,
} from 'lucide-react';
import type {
  Expense,
  ExpenseCategory,
  InstituteState,
  Payment,
  PaymentMethod,
} from '../types/institute.ts';
import type { InstituteAnalytics } from '../utils/analytics.ts';
import {
  downloadCsv,
  formatNumber,
  formatToman,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';
import defaultEmblem from '../assets/images/jewelry_emblem_1795358999694.jpg';

interface FinanceViewProps {
  state: InstituteState;
  analytics: InstituteAnalytics;
  quickPayStudentId: string | null;
  onClearQuickPay: () => void;
  onAddPayment: (payment: Payment) => void;
  onAddExpense: (expense: Expense) => void;
  onRemindDebtor: (studentId: string) => void;
}

type FinanceTab = 'ledger' | 'debtors' | 'expenses';

const PAYMENT_METHODS: PaymentMethod[] = [
  'کارتخوان',
  'کارت به کارت',
  'نقدی',
  'چک / اقساط',
  'درگاه آنلاین',
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'حق‌التدریس اساتید',
  'اجاره و شارژ',
  'تجهیزات و پشتیبانی',
  'تبلیغات',
  'سایر',
];

export const FinanceView: React.FC<FinanceViewProps> = ({
  state,
  analytics,
  quickPayStudentId,
  onClearQuickPay,
  onAddPayment,
  onAddExpense,
  onRemindDebtor,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('ledger');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(Boolean(quickPayStudentId));
  const [payStudentId, setPayStudentId] = useState(
    quickPayStudentId || analytics.debtors[0]?.studentId || state.students[0]?.id || '',
  );
  const [payEnrollmentId, setPayEnrollmentId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('کارتخوان');
  const [payDate, setPayDate] = useState(getTodayJalali());
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');

  // Expense Modal State
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('حق‌التدریس اساتید');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState(getTodayJalali());
  const [expNote, setExpNote] = useState('');

  // Sync quickPayStudentId prop
  React.useEffect(() => {
    if (quickPayStudentId) {
      setPayStudentId(quickPayStudentId);
      const stuEnrs = state.enrollments.filter(
        (e) => e.studentId === quickPayStudentId && e.status !== 'dropped',
      );
      const firstUnpaid = stuEnrs.find((en) => {
        const paid = state.payments
          .filter((p) => p.enrollmentId === en.id)
          .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
        return en.finalTuition - paid > 0;
      });
      if (firstUnpaid) {
        const paid = state.payments
          .filter((p) => p.enrollmentId === firstUnpaid.id)
          .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
        setPayEnrollmentId(firstUnpaid.id);
        setPayAmount(Math.max(0, firstUnpaid.finalTuition - paid));
      } else if (stuEnrs[0]) {
        setPayEnrollmentId(stuEnrs[0].id);
        setPayAmount(0);
      }
      setPayModalOpen(true);
    }
  }, [quickPayStudentId, state.enrollments, state.payments]);

  const studentEnrollmentsWithDebt = useMemo(() => {
    return state.enrollments
      .filter((e) => e.studentId === payStudentId && e.status !== 'dropped')
      .map((en) => {
        const cls = state.classes.find((c) => c.id === en.classId);
        const paid = state.payments
          .filter((p) => p.enrollmentId === en.id)
          .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
        return {
          ...en,
          className: cls?.title ?? 'کلاس',
          due: Math.max(0, en.finalTuition - paid),
        };
      });
  }, [payStudentId, state.enrollments, state.classes, state.payments]);

  const openPaymentModal = (studentId?: string) => {
    const targetId = studentId || analytics.debtors[0]?.studentId || state.students[0]?.id || '';
    setPayStudentId(targetId);
    const enrs = state.enrollments.filter(
      (e) => e.studentId === targetId && e.status !== 'dropped',
    );
    const unpaid = enrs.find((en) => {
      const paid = state.payments
        .filter((p) => p.enrollmentId === en.id)
        .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
      return en.finalTuition - paid > 0;
    });
    const chosen = unpaid ?? enrs[0];
    if (chosen) {
      const paid = state.payments
        .filter((p) => p.enrollmentId === chosen.id)
        .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
      setPayEnrollmentId(chosen.id);
      setPayAmount(Math.max(0, chosen.finalTuition - paid));
    } else {
      setPayEnrollmentId('');
      setPayAmount(0);
    }
    setPayModalOpen(true);
  };

  const filteredPayments = useMemo(() => {
    return [...state.payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((p) => methodFilter === 'all' || p.method === methodFilter);
  }, [state.payments, methodFilter]);

  const handleExportFinanceCsv = () => {
    downloadCsv(
      'institute-transactions.csv',
      ['کد پیگیری', 'تاریخ', 'نام هنرجو', 'بابت کلاس', 'روش پرداخت', 'مبلغ (تومان)', 'توضیحات'],
      filteredPayments.map((p) => {
        const stu = state.students.find((s) => s.id === p.studentId);
        const en = state.enrollments.find((e) => e.id === p.enrollmentId);
        const cls = state.classes.find((c) => c.id === en?.classId);
        return [
          p.referenceCode,
          p.date,
          stu?.fullName ?? '',
          cls?.title ?? '',
          p.method,
          p.amount,
          p.note,
        ];
      }),
    );
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudentId || !payEnrollmentId || payAmount <= 0) return;
    onAddPayment({
      id: generateId('pay'),
      enrollmentId: payEnrollmentId,
      studentId: payStudentId,
      amount: payAmount,
      date: payDate,
      method: payMethod,
      referenceCode: payRef.trim() || `TRX-${Math.floor(100000 + Math.random() * 899999)}`,
      note: payNote.trim() || 'پرداخت قسط شهریه',
      type: 'payment',
    });
    setPayModalOpen(false);
    setPayRef('');
    setPayNote('');
    onClearQuickPay();
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;
    onAddExpense({
      id: generateId('exp'),
      title: expTitle.trim(),
      category: expCategory,
      amount: expAmount,
      date: expDate,
      note: expNote.trim(),
    });
    setExpModalOpen(false);
    setExpTitle('');
    setExpAmount(0);
    setExpNote('');
  };

  return (
    <div className="space-y-6">
      <section className="no-print grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
          <div className="text-xs text-stone-500 font-medium">کل شهریه‌های قراردادشده</div>
          <div className="mt-2 text-lg font-bold text-stone-900 tabular-nums">
            {formatToman(analytics.totalContractedTuition)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 tabular-nums">
            تخفیف‌های اعطایی: {formatToman(analytics.totalDiscountsGiven)}
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
          <div className="text-xs text-stone-500 font-medium">مجموع وصولی نقدی و بانکی</div>
          <div className="mt-2 text-lg font-bold text-emerald-700 tabular-nums">
            {formatToman(analytics.totalCollectedRevenue)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 tabular-nums">
            تعداد تراکنش: {formatNumber(state.payments.length)} فیش
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
          <div className="text-xs text-stone-500 font-medium">مطالبات و بدهی هنرجویان</div>
          <div className="mt-2 text-lg font-bold text-amber-700 tabular-nums">
            {formatToman(analytics.totalReceivables)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 tabular-nums">
            تعداد بدهکاران: {formatNumber(analytics.debtors.length)} نفر
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
          <div className="text-xs text-stone-500 font-medium">تراز و سود خالص آموزشگاه</div>
          <div
            className={`mt-2 text-lg font-bold tabular-nums ${
              analytics.netProfit >= 0 ? 'text-[#8E5F15]' : 'text-red-700'
            }`}
          >
            {formatToman(analytics.netProfit)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 tabular-nums">
            کل هزینه‌ها: {formatToman(analytics.totalExpenses)}
          </div>
        </div>
      </section>

      <div className="no-print bg-white border border-[#E6DFD3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#F5F1E9] rounded-lg">
          {[
            { id: 'ledger', label: 'دفتر تراکنش‌ها و دریافت‌ها' },
            { id: 'debtors', label: `بدهکاران و اقساط (${formatNumber(analytics.debtors.length)})` },
            { id: 'expenses', label: 'هزینه‌ها و حق‌التدریس اساتید' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinanceTab)}
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
          {activeTab === 'ledger' && (
            <>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white text-stone-800 focus:outline-none focus:border-[#8E5F15]"
              >
                <option value="all">همه روش‌های پرداخت</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportFinanceCsv}
                className="h-9 px-3.5 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-lg text-xs font-medium text-stone-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>گزارش CSV</span>
              </button>
            </>
          )}

          {activeTab === 'expenses' ? (
            <button
              onClick={() => setExpModalOpen(true)}
              className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت هزینه جدید</span>
            </button>
          ) : (
            <button
              onClick={() => openPaymentModal()}
              className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>ثبت دریافت شهریه</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ledger' && (
        <div className="no-print bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                  <th className="py-3 px-4">شماره فیش</th>
                  <th className="py-3 px-3">تاریخ</th>
                  <th className="py-3 px-3">نام هنرجو</th>
                  <th className="py-3 px-3">دوره / کلاس</th>
                  <th className="py-3 px-3">روش پرداخت</th>
                  <th className="py-3 px-3">مبلغ</th>
                  <th className="py-3 px-4 text-left">رسید</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-xs">
                {filteredPayments.map((pay) => {
                  const stu = state.students.find((s) => s.id === pay.studentId);
                  const en = state.enrollments.find((e) => e.id === pay.enrollmentId);
                  const cls = state.classes.find((c) => c.id === en?.classId);
                  return (
                    <tr key={pay.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-code text-stone-600 tabular-nums">
                        {pay.referenceCode}
                      </td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {toPersianDigits(pay.date)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900">
                        {stu?.fullName ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-stone-600">{cls?.title ?? '—'}</td>
                      <td className="py-3 px-3 text-stone-600">{pay.method}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700 tabular-nums">
                        {formatToman(pay.amount)}
                      </td>
                      <td className="py-3 px-4 text-left">
                        <button
                          onClick={() => setReceiptPayment(pay)}
                          className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] rounded-md text-[11px] font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>چاپ رسید</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'debtors' && (
        <div className="no-print bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
          {analytics.debtors.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-500">
              هیچ هنرجوی بدهکاری در سیستم وجود ندارد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-3 px-4">کد هنرجو</th>
                    <th className="py-3 px-3">نام هنرجو</th>
                    <th className="py-3 px-3">موبایل</th>
                    <th className="py-3 px-3">دوره‌ها</th>
                    <th className="py-3 px-3">شهریه کل</th>
                    <th className="py-3 px-3">پرداختی</th>
                    <th className="py-3 px-3">مانده بدهی</th>
                    <th className="py-3 px-4 text-left">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-xs">
                  {analytics.debtors.map((d) => (
                    <tr key={d.studentId} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-code text-stone-600">{d.code}</td>
                      <td className="py-3 px-3 font-bold text-stone-900">{d.fullName}</td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {toPersianDigits(d.phone)}
                      </td>
                      <td className="py-3 px-3 text-stone-600">{d.activeCourses.join('، ')}</td>
                      <td className="py-3 px-3 tabular-nums text-stone-700">
                        {formatToman(d.totalTuition)}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-emerald-700">
                        {formatToman(d.totalPaid)}
                      </td>
                      <td className="py-3 px-3 tabular-nums font-bold text-amber-700">
                        {formatToman(d.balanceDue)}
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openPaymentModal(d.studentId)}
                            className="px-2.5 py-1 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-md text-[11px] font-medium cursor-pointer transition-colors"
                          >
                            ثبت قسط
                          </button>
                          <button
                            onClick={() => onRemindDebtor(d.studentId)}
                            className="px-2.5 py-1 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-700 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>یادآور</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3]">
              <h3 className="text-sm font-bold text-stone-900">دفتر هزینه‌های ثبت‌شده</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-2.5 px-4">عنوان هزینه</th>
                    <th className="py-2.5 px-3">سرفصل</th>
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-4 text-left">مبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-xs">
                  {state.expenses.map((ex) => (
                    <tr key={ex.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        <div>{ex.title}</div>
                        {ex.note && <div className="text-[11px] text-stone-500 font-normal">{ex.note}</div>}
                      </td>
                      <td className="py-3 px-3 text-stone-600">{ex.category}</td>
                      <td className="py-3 px-3 text-stone-600 tabular-nums">
                        {toPersianDigits(ex.date)}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-stone-900 tabular-nums">
                        {formatToman(ex.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E6DFD3]">
              <h3 className="text-sm font-bold text-stone-900">محاسبه خودکار حق‌التدریس اساتید</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                بر اساس درصد همکاری و شهریه وصول‌شده کلاس‌های هر استاد
              </p>
            </div>
            <div className="divide-y divide-[#F0EAE0]">
              {analytics.instructorStats.map((stat) => {
                const inst = state.instructors.find((i) => i.id === stat.instructorId);
                const pct = inst?.commissionPercent ?? 35;
                const payable = Math.round((stat.generatedRevenue * pct) / 100);
                return (
                  <div key={stat.instructorId} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{stat.fullName}</div>
                      <div className="text-[11px] text-stone-500 tabular-nums mt-0.5">
                        سهم {formatNumber(pct)}٪ از {formatToman(stat.generatedRevenue)}
                      </div>
                    </div>
                    <div className="text-left tabular-nums">
                      <div className="font-bold text-[#8E5F15]">{formatToman(payable)}</div>
                      <div className="text-[11px] text-stone-500">حق‌التدریس محاسبه‌شده</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {payModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-[#181614]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3">
              <h3 className="text-sm font-bold text-stone-900">ثبت دریافت شهریه / قسط</h3>
              <button
                onClick={() => {
                  setPayModalOpen(false);
                  onClearQuickPay();
                }}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">انتخاب هنرجو</label>
                <select
                  value={payStudentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayStudentId(id);
                    const enrs = state.enrollments.filter(
                      (en) => en.studentId === id && en.status !== 'dropped',
                    );
                    if (enrs[0]) {
                      const paid = state.payments
                        .filter((p) => p.enrollmentId === enrs[0].id)
                        .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
                      setPayEnrollmentId(enrs[0].id);
                      setPayAmount(Math.max(0, enrs[0].finalTuition - paid));
                    } else {
                      setPayEnrollmentId('');
                      setPayAmount(0);
                    }
                  }}
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                >
                  {state.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">بابت کلاس / کارگاه</label>
                <select
                  value={payEnrollmentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayEnrollmentId(id);
                    const found = studentEnrollmentsWithDebt.find((x) => x.id === id);
                    if (found) setPayAmount(found.due);
                  }}
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                >
                  {studentEnrollmentsWithDebt.length === 0 ? (
                    <option value="">کلاس فعالی یافت نشد</option>
                  ) : (
                    studentEnrollmentsWithDebt.map((en) => (
                      <option key={en.id} value={en.id}>
                        {en.className} (مانده: {formatToman(en.due)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">مبلغ پرداختی (تومان)</label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">روش پرداخت</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">تاریخ</label>
                  <input
                    type="text"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">شماره پیگیری</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="تولید خودکار"
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">توضیحات فیش</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="مثلاً: تسویه قسط دوم کارگاه طلاسازی"
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayModalOpen(false);
                    onClearQuickPay();
                  }}
                  className="h-9 px-4 border border-[#E6DFD3] rounded-lg text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!payEnrollmentId || payAmount <= 0}
                  className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] disabled:bg-stone-300 text-white rounded-lg font-semibold cursor-pointer"
                >
                  ثبت در دفتر مالی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {expModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-[#181614]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3">
              <h3 className="text-sm font-bold text-stone-900">ثبت هزینه آکادمی</h3>
              <button onClick={() => setExpModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">عنوان هزینه *</label>
                <input
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="مثلاً: خرید اره مویی، مته مخراج‌کاری و مصرفی کارگاه زرگری"
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">سرفصل</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">تاریخ</label>
                  <input
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">مبلغ (تومان) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">توضیحات</label>
                <input
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setExpModalOpen(false)} className="h-9 px-4 border border-[#E6DFD3] rounded-lg text-stone-700 hover:bg-[#FAF8F5] cursor-pointer">انصراف</button>
                <button type="submit" className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold cursor-pointer">ثبت هزینه</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Tuition Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 bg-[#181614]/50 flex items-center justify-center p-4">
          <div className="print-only-container bg-white border border-[#E6DFD3] rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E6DFD3] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={state.settings.logoUrl || defaultEmblem}
                  alt={state.settings.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-lg border border-[#D4AF37]/40 bg-[#181614] object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{state.settings.name}</h3>
                  <p className="text-[11px] text-[#8E5F15] font-medium">رسید رسمی پرداخت شهریه</p>
                </div>
              </div>
              <div className="text-left text-[11px] text-stone-600 tabular-nums">
                <div>شماره سند: {receiptPayment.referenceCode}</div>
                <div>تاریخ: {toPersianDigits(receiptPayment.date)}</div>
              </div>
            </div>

            {(() => {
              const stu = state.students.find((s) => s.id === receiptPayment.studentId);
              const en = state.enrollments.find((e) => e.id === receiptPayment.enrollmentId);
              const cls = state.classes.find((c) => c.id === en?.classId);
              const totalPaid = state.payments
                .filter((p) => p.enrollmentId === receiptPayment.enrollmentId)
                .reduce((s, p) => s + (p.type === 'refund' ? -p.amount : p.amount), 0);
              const rem = Math.max(0, (en?.finalTuition ?? 0) - totalPaid);

              return (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg p-3.5">
                    <div>
                      <span className="text-stone-500 block">نام هنرجو:</span>
                      <span className="font-bold text-stone-900">{stu?.fullName}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">کد پرونده:</span>
                      <span className="font-code text-stone-900">{stu?.code}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-500 block">بابت دوره / کارگاه:</span>
                      <span className="font-semibold text-stone-900">{cls?.title}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">روش پرداخت:</span>
                      <span className="font-medium text-stone-900">{receiptPayment.method}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">مبلغ پرداختی این فیش:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {formatToman(receiptPayment.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1 text-xs tabular-nums">
                    <span className="text-stone-600">
                      شهریه نهایی: {formatToman(en?.finalTuition ?? 0)}
                    </span>
                    <span className="font-bold text-stone-900">
                      مانده بدهی فعلی: {rem > 0 ? formatToman(rem) : 'تسویه کامل'}
                    </span>
                  </div>
                  {receiptPayment.note && (
                    <div className="text-[11px] text-stone-600 px-1">
                      توضیحات: {receiptPayment.note}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-4 border-t border-[#F0EAE0] flex items-center justify-between text-[11px] text-stone-500">
              <span>{state.settings.address}</span>
              <span>تلفن: {toPersianDigits(state.settings.phone)}</span>
            </div>

            <div className="no-print flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReceiptPayment(null)}
                className="h-9 px-4 border border-[#E6DFD3] rounded-lg text-xs font-medium text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
              >
                بستن
              </button>
              <button
                onClick={() => window.print()}
                className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ رسید رسمی</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
