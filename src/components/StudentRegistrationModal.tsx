import React, { useMemo, useState } from 'react';
import { X, Calculator, CheckCircle2 } from 'lucide-react';
import type {
  DiscountType,
  Enrollment,
  InstituteState,
  Payment,
  PaymentMethod,
  Student,
} from '../types/institute.ts';
import {
  calculateFinalTuition,
  formatNumber,
  formatToman,
  generateId,
  getTodayJalali,
  toPersianDigits,
} from '../utils/formatters.ts';

interface StudentRegistrationModalProps {
  state: InstituteState;
  initialStudentId?: string | null;
  onClose: () => void;
  onSubmitNewStudent: (payload: {
    student: Student;
    enrollment?: Enrollment;
    payment?: Payment;
  }) => void;
  onSubmitEnrollmentOnly: (payload: {
    enrollment: Enrollment;
    payment?: Payment;
  }) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'کارتخوان',
  'کارت به کارت',
  'نقدی',
  'چک / اقساط',
  'درگاه آنلاین',
];

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  state,
  initialStudentId,
  onClose,
  onSubmitNewStudent,
  onSubmitEnrollmentOnly,
}) => {
  const existingStudent = initialStudentId
    ? state.students.find((s) => s.id === initialStudentId)
    : undefined;

  // Student personal fields
  const [fullName, setFullName] = useState(existingStudent?.fullName ?? '');
  const [nationalId, setNationalId] = useState(existingStudent?.nationalId ?? '');
  const [birthDate, setBirthDate] = useState(existingStudent?.birthDate ?? '1380/01/01');
  const [phone, setPhone] = useState(existingStudent?.phone ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(existingStudent?.emergencyPhone ?? '');
  const [education, setEducation] = useState(existingStudent?.education ?? '');
  const [address, setAddress] = useState(existingStudent?.address ?? '');
  const [notes, setNotes] = useState(existingStudent?.notes ?? '');

  // Optional class enrollment
  const [enrollNow, setEnrollNow] = useState(true);
  const availableClasses = state.classes.filter((c) => c.status !== 'completed');
  const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id ?? '');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('کارتخوان');
  const [paymentRef, setPaymentRef] = useState('');
  const [formError, setFormError] = useState('');

  const selectedClass = state.classes.find((c) => c.id === selectedClassId);
  const selectedCourse = state.courses.find((cr) => cr.id === selectedClass?.courseId);
  const baseTuition = selectedCourse?.baseTuition ?? 0;

  const finalTuition = useMemo(
    () => calculateFinalTuition(baseTuition, discountType, discountValue),
    [baseTuition, discountType, discountValue],
  );

  const remainingAfterInitial = Math.max(0, finalTuition - Math.max(0, initialPaidAmount));

  const nextCode = useMemo(() => {
    const num = state.students.length + 1;
    return `ZR-1405-${String(num).padStart(3, '0')}`;
  }, [state.students.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!existingStudent) {
      if (!fullName.trim() || !phone.trim()) {
        setFormError('نام و نام خانوادگی و شماره موبایل هنرجو الزامی است.');
        return;
      }
      if (nationalId.trim() && nationalId.trim().length < 8) {
        setFormError('کد ملی واردشده معتبر نیست.');
        return;
      }
    }

    if (enrollNow && !selectedClassId) {
      setFormError('لطفاً یک کلاس فعال برای ثبت‌نام انتخاب کنید.');
      return;
    }

    if (existingStudent && enrollNow) {
      const alreadyEnrolled = state.enrollments.some(
        (en) =>
          en.studentId === existingStudent.id &&
          en.classId === selectedClassId &&
          en.status !== 'dropped',
      );
      if (alreadyEnrolled) {
        setFormError('این هنرجو قبلاً در کلاس انتخاب‌شده ثبت‌نام کرده است.');
        return;
      }
    }

    const today = getTodayJalali();
    const studentId = existingStudent ? existingStudent.id : generateId('stu');

    let enrollment: Enrollment | undefined;
    let payment: Payment | undefined;

    if (enrollNow && selectedClassId) {
      const enrollmentId = generateId('enr');
      enrollment = {
        id: enrollmentId,
        studentId,
        classId: selectedClassId,
        enrolledAt: today,
        baseTuition,
        discountType,
        discountValue: discountType === 'none' ? 0 : discountValue,
        discountReason: discountReason.trim(),
        finalTuition,
        status: 'active',
      };

      if (initialPaidAmount > 0) {
        payment = {
          id: generateId('pay'),
          enrollmentId,
          studentId,
          amount: Math.min(finalTuition, initialPaidAmount),
          date: today,
          method: paymentMethod,
          referenceCode: paymentRef.trim() || `TRX-${Math.floor(100000 + Math.random() * 899999)}`,
          note:
            initialPaidAmount >= finalTuition
              ? 'تسویه کامل هنگام ثبت‌نام'
              : 'پیش‌پرداخت هنگام ثبت‌نام',
          type: 'payment',
        };
      }
    }

    if (existingStudent && enrollment) {
      onSubmitEnrollmentOnly({ enrollment, payment });
      return;
    }

    const newStudent: Student = {
      id: studentId,
      code: nextCode,
      fullName: fullName.trim(),
      nationalId: nationalId.trim() || '—',
      birthDate: birthDate.trim() || '—',
      phone: phone.trim(),
      emergencyPhone: emergencyPhone.trim() || '—',
      education: education.trim() || '—',
      address: address.trim() || '—',
      notes: notes.trim(),
      registeredAt: today,
      status: 'active',
    };

    onSubmitNewStudent({ student: newStudent, enrollment, payment });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#181614]/45 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6DFD3] rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#E6DFD3] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {existingStudent
                ? `ثبت‌نام دوره جدید برای ${existingStudent.fullName}`
                : 'فرم پذیرش و ثبت‌نام هنرجوی جدید'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {existingStudent
                ? `کد پرونده: ${existingStudent.code}`
                : `کد پرونده پیشنهادی: ${nextCode}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          {!existingStudent && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-stone-800 border-b border-[#F0EAE0] pb-2">
                ۱. مشخصات فردی و تماس هنرجو
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    نام و نام خانوادگی *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثلاً: کیمیا فرهمند"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    کد ملی
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="۱۰ رقم بدون خط تیره"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    تاریخ تولد (شمسی)
                  </label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="1380/05/12"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    شماره موبایل *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    تلفن اضطراری / ولی
                  </label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    تحصیلات / رشته
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="مثلاً: کارشناسی طراحی صنعتی"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">آدرس</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="نشانی محل سکونت"
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    توضیحات مشاوره یا سوابق هنری
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="یادداشت پرونده و سطح آشنایی با ابزار..."
                    className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-2">
              <span className="text-xs font-bold text-stone-800">
                {existingStudent ? 'انتخاب کلاس و محاسبه خودکار شهریه' : '۲. انتخاب کلاس، تخفیف و ثبت پرداخت اولیه'}
              </span>
              {!existingStudent && (
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrollNow}
                    onChange={(e) => setEnrollNow(e.target.checked)}
                    className="rounded border-stone-300 text-[#8E5F15] focus:ring-[#8E5F15]"
                  />
                  <span>ثبت‌نام همزمان در کلاس</span>
                </label>
              )}
            </div>

            {enrollNow && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      انتخاب کلاس و گروه زمانی
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                    >
                      {availableClasses.map((cls) => {
                        const crs = state.courses.find((c) => c.id === cls.courseId);
                        const inst = state.instructors.find((i) => i.id === cls.instructorId);
                        const enrolledCount = state.enrollments.filter(
                          (en) => en.classId === cls.id && en.status !== 'dropped',
                        ).length;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {cls.title} — {inst?.fullName} ({cls.days.join('، ')} {toPersianDigits(cls.startTime)}–{toPersianDigits(cls.endTime)}) · ظرفیت {formatNumber(enrolledCount)}/{formatNumber(cls.maxCapacity)} · شهریه {formatToman(crs?.baseTuition ?? 0)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      نوع تخفیف
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as DiscountType);
                        setDiscountValue(0);
                      }}
                      className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                    >
                      <option value="none">بدون تخفیف</option>
                      <option value="percent">تخفیف درصدی (٪)</option>
                      <option value="amount">تخفیف مبلغ ثابت (تومان)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      {discountType === 'percent'
                        ? 'درصد تخفیف (۰ تا ۱۰۰)'
                        : discountType === 'amount'
                        ? 'مبلغ تخفیف (تومان)'
                        : 'مقدار تخفیف'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percent' ? 100 : baseTuition}
                      disabled={discountType === 'none'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] disabled:bg-[#FAF8F5] tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      علت یا کد تخفیف
                    </label>
                    <input
                      type="text"
                      disabled={discountType === 'none'}
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="مثلاً: تخفیف ثبت‌نام دو دوره همزمان"
                      className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] disabled:bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      مبلغ پرداختی فعلی / پیش‌پرداخت (تومان)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={finalTuition}
                      value={initialPaidAmount}
                      onChange={(e) => setInitialPaidAmount(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                    />
                  </div>

                  {initialPaidAmount > 0 && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          روش پرداخت
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg bg-white focus:outline-none focus:border-[#8E5F15]"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          شماره پیگیری / فیش
                        </label>
                        <input
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="اختیاری (تولید خودکار)"
                          className="w-full h-9 px-3 text-xs border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15] tabular-nums"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 text-stone-700 font-semibold">
                    <Calculator className="w-4 h-4 text-[#8E5F15]" />
                    <span>محاسبه خودکار حسابداری:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 tabular-nums">
                    <div>
                      <span className="text-stone-500">شهریه مصوب: </span>
                      <span className="font-semibold text-stone-900">{formatToman(baseTuition)}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">شهریه نهایی: </span>
                      <span className="font-bold text-[#8E5F15]">{formatToman(finalTuition)}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">مانده بدهی: </span>
                      <span
                        className={`font-bold ${
                          remainingAfterInitial > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {remainingAfterInitial > 0 ? formatToman(remainingAfterInitial) : 'تسویه کامل'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E6DFD3] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 border border-[#E6DFD3] rounded-lg text-xs font-medium text-stone-700 hover:bg-[#FAF8F5] cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{existingStudent ? 'ثبت نهایی در دوره' : 'ثبت پرونده و تکمیل پذیرش'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
