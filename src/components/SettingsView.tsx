import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  ImagePlus,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import type {
  DbInfo,
  InstituteSettings,
  InstituteState,
  SystemUser,
  UserRole,
} from '../types/institute.ts';
import { desktopApi } from '../services/desktopApi.ts';
import { formatNumber, toPersianDigits } from '../utils/formatters.ts';
import defaultEmblem from '../assets/images/jewelry_emblem_1795358999694.jpg';

interface SettingsViewProps {
  state: InstituteState;
  dbInfo: DbInfo | null;
  onSaveSettings: (settings: InstituteSettings) => void;
  onRestoreState: (newState: InstituteState) => void;
  onDbInfoUpdated: (info: DbInfo) => void;
  onResetDemo: () => void;
}

const USER_ROLES: UserRole[] = ['مدیر کل', 'مسئول ثبت‌نام', 'حسابدار'];

function formatIsoPersian(iso: string | null): string {
  if (!iso) return 'هنوز پشتیبانی تهیه نشده است';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt);
  } catch {
    return toPersianDigits(iso);
  }
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  dbInfo,
  onSaveSettings,
  onRestoreState,
  onDbInfoUpdated,
  onResetDemo,
}) => {
  const [form, setForm] = useState<InstituteSettings>(state.settings);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);

  // User Accounts & Security State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('مدیر کل');
  const [newPassword, setNewPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(state.settings);
  }, [state.settings]);

  const refreshUsersAndInfo = async () => {
    try {
      const [uList, info] = await Promise.all([desktopApi.listUsers(), desktopApi.getDbInfo()]);
      setUsers(uList);
      onDbInfoUpdated(info);
    } catch {
      // ignore initial load error
    }
  };

  useEffect(() => {
    refreshUsersAndInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalWeights =
    form.gradeWeights.midterm +
    form.gradeWeights.finalExam +
    form.gradeWeights.practical +
    form.gradeWeights.classActivity;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (totalWeights !== 100) {
      setErrorMsg('مجموع ضرایب ارزیابی کارنامه باید دقیقاً برابر ۱۰۰ درصد باشد.');
      return;
    }
    onSaveSettings(form);
    setSavedMsg('تنظیمات آموزشگاه ذخیره شد.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMsg('حجم فایل لوگو نباید بیشتر از ۱.۵ مگابایت باشد.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const updated = { ...form, logoUrl: dataUrl };
      setForm(updated);
      onSaveSettings(updated);
      setErrorMsg('');
      setSavedMsg('لوگوی جدید آموزشگاه بارگذاری و ذخیره شد.');
      setTimeout(() => setSavedMsg(''), 2500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    const updated = { ...form, logoUrl: undefined };
    setForm(updated);
    onSaveSettings(updated);
    setSavedMsg('لوگو به حالت پیش‌فرض بازگردانی شد.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const handleSqliteBackup = async () => {
    setErrorMsg('');
    setBackupBusy(true);
    try {
      const res = await desktopApi.createNativeBackup();
      if (!res.canceled) {
        const info = await desktopApi.getDbInfo();
        onDbInfoUpdated(info);
        setSavedMsg(
          res.filePath
            ? `نسخه پشتیبان SQLite با موفقیت در مسیر انتخابی ذخیره شد.`
            : 'فایل پشتیبان SQLite با موفقیت دانلود و ثبت شد.',
        );
        setTimeout(() => setSavedMsg(''), 3500);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'خطا در تهیه نسخه پشتیبان پایگاه داده.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleSqliteRestoreClick = async () => {
    setErrorMsg('');
    if (desktopApi.isDesktopApp()) {
      setBackupBusy(true);
      try {
        const res = await desktopApi.restoreNativeBackup();
        if (!res.canceled && res.state) {
          onRestoreState(res.state);
          setForm(res.state.settings);
          await refreshUsersAndInfo();
          setSavedMsg('پایگاه داده SQLite با موفقیت بازیابی شد.');
          setTimeout(() => setSavedMsg(''), 3500);
        }
      } catch (err) {
        setErrorMsg((err as Error).message || 'خطا در بازیابی پایگاه داده.');
      } finally {
        setBackupBusy(false);
      }
    } else {
      dbFileInputRef.current?.click();
    }
  };

  const handleBackupFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setBackupBusy(true);
    try {
      const restored = await desktopApi.restoreBackupFileUpload(file);
      onRestoreState(restored);
      setForm(restored.settings);
      await refreshUsersAndInfo();
      setSavedMsg('پایگاه داده از فایل پشتیبان با موفقیت بازیابی شد.');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err) {
      setErrorMsg((err as Error).message || 'فایل پشتیبان معتبر نیست.');
    } finally {
      setBackupBusy(false);
      e.target.value = '';
    }
  };

  const handleDownloadJsonBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zarinsaz-academy-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as InstituteState;
        if (!parsed || !parsed.settings || !Array.isArray(parsed.students)) {
          setErrorMsg('فایل پشتیبان JSON انتخاب‌شده معتبر نیست.');
          return;
        }
        onRestoreState(parsed);
        setForm(parsed.settings);
        setSavedMsg('فایل پشتیبان با موفقیت به SQLite منتقل و بازیابی شد.');
        setTimeout(() => setSavedMsg(''), 3000);
      } catch {
        setErrorMsg('خطا در خواندن فایل JSON پشتیبان.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    try {
      await desktopApi.createUser({
        username: newUsername,
        fullName: newFullName,
        role: newRole,
        password: newPassword,
      });
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      await refreshUsersAndInfo();
      setUserSuccess('کاربر جدید با رمز عبور هش‌شده در پایگاه داده ثبت شد.');
      setTimeout(() => setUserSuccess(''), 3000);
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserError('');
    try {
      await desktopApi.deleteUser(userId);
      await refreshUsersAndInfo();
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  const handleToggleLoginLock = async (enabled: boolean) => {
    setUserError('');
    try {
      const updatedInfo = await desktopApi.setRequireLogin(enabled);
      onDbInfoUpdated(updatedInfo);
      setUserSuccess(
        enabled ? 'صفحه ورود با رمز عبور برای اجرای برنامه فعال شد.' : 'قفل ورود غیرفعال شد.',
      );
      setTimeout(() => setUserSuccess(''), 3000);
    } catch (err) {
      setUserError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Institute & Grading Settings */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-sm font-bold text-stone-900">تنظیمات عمومی آموزشگاه و کارنامه</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              مشخصات چاپی سربرگ کارنامه‌ها، رسید شهریه و فرمول محاسبه نمرات
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Institute Logo Upload Block */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-xl border border-[#D4AF37]/40 bg-[#181614] overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={form.logoUrl || defaultEmblem}
                  alt="لوگوی آموزشگاه"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-stone-900">لوگوی رسمی آموزشگاه</div>
                <p className="text-[11px] text-stone-500">
                  در منوی برنامه، رسیدهای شهریه و کارنامه‌های الکترونیکی نمایش داده می‌شود (PNG / JPG).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="h-9 px-3.5 bg-white border border-[#E6DFD3] hover:bg-[#F5F1E9] rounded-lg text-xs font-semibold text-stone-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#8E5F15]" />
                <span>بارگذاری لوگو</span>
              </button>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="h-9 px-3 border border-red-200 hover:bg-red-50 rounded-lg text-xs font-medium text-red-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">نام آموزشگاه</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">نام مدیر مسئول</label>
              <input
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">زیرعنوان / مجوز</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">ترم آموزشی جاری</label>
              <input
                value={form.currentTerm}
                onChange={(e) => setForm({ ...form, currentTerm: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">تلفن تماس</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">نشانی آموزشگاه</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-9 px-3 border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0EAE0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-900">ضرایب نمره کارنامه و حد نصاب قبولی</span>
              <span
                className={`font-semibold tabular-nums ${
                  totalWeights === 100 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                مجموع ضرایب: {formatNumber(totalWeights)}٪
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">میان‌ترم (٪)</label>
                <input
                  type="number"
                  value={form.gradeWeights.midterm}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gradeWeights: { ...form.gradeWeights, midterm: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">پایان‌ترم (٪)</label>
                <input
                  type="number"
                  value={form.gradeWeights.finalExam}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gradeWeights: { ...form.gradeWeights, finalExam: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">پروژه عملی (٪)</label>
                <input
                  type="number"
                  value={form.gradeWeights.practical}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gradeWeights: { ...form.gradeWeights, practical: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">فعالیت (٪)</label>
                <input
                  type="number"
                  value={form.gradeWeights.classActivity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gradeWeights: {
                        ...form.gradeWeights,
                        classActivity: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">نمره قبولی</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.passingGrade}
                  onChange={(e) =>
                    setForm({ ...form, passingGrade: Number(e.target.value) || 12 })
                  }
                  className="w-full h-9 px-2.5 border border-[#E6DFD3] rounded-lg tabular-nums focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0EAE0] flex items-center justify-end gap-3">
            {savedMsg && (
              <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedMsg}</span>
              </span>
            )}
            <button
              type="submit"
              className="h-9 px-5 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>ذخیره تنظیمات</span>
            </button>
          </div>
        </form>

        {/* SQLite Backup & Restore Center */}
        <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-stone-900">پشتیبان‌گیری و بازیابی پایگاه داده SQLite</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              ذخیره‌سازی کاملاً آفلاین و محلی با قابلیت انتقال امن فایل دیتابیس بین سیستم‌های ویندوز
            </p>
          </div>

          {dbInfo && (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Database className="w-3.5 h-3.5 text-[#8E5F15]" />
                <span>وضعیت پایگاه داده محلی (SQLite)</span>
              </div>
              <div className="text-stone-600 break-all font-code" dir="ltr">
                {dbInfo.dbPath}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-stone-600 tabular-nums">
                <span>حجم دیتابیس: {formatNumber(Math.max(1, Math.round(dbInfo.dbSizeBytes / 1024)))} کیلوبایت</span>
                <span>
                  آخرین پشتیبان: <strong className="text-stone-900">{formatIsoPersian(dbInfo.lastBackupAt)}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="p-4 border border-[#E6DFD3] rounded-xl space-y-2.5">
              <div className="font-bold text-stone-900">تهیه نسخه پشتیبان رسمی SQLite (.db)</div>
              <p className="text-stone-600 leading-relaxed">
                از پایگاه داده اصلی بدون خطر خرابی داده (Hot Backup) نسخه پشتیبان تهیه کرده و محل ذخیره را انتخاب کنید تا روی رایانه دیگر نیز قابل انتقال باشد.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={handleSqliteBackup}
                  className="h-9 px-4 bg-[#181614] hover:bg-[#2B2620] disabled:bg-stone-400 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4A853]" />
                  <span>تهیه فایل پشتیبان (.db)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJsonBackup}
                  className="h-9 px-3 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  خروجی JSON
                </button>
              </div>
            </div>

            <div className="p-4 border border-[#E6DFD3] rounded-xl space-y-2.5">
              <div className="font-bold text-stone-900">بازیابی پایگاه داده از فایل پشتیبان</div>
              <p className="text-stone-600 leading-relaxed">
                فایل پشتیبان (.db یا .json) را انتخاب کنید؛ سیستم ابتدا سلامت فایل را بررسی کرده و سپس جایگزین می‌کند.
              </p>
              <input
                ref={dbFileInputRef}
                type="file"
                accept=".db,.sqlite,.json"
                onChange={handleBackupFileUpload}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonFileUpload}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={handleSqliteRestoreClick}
                  className="h-9 px-4 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-800 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>بازیابی از فایل (.db / .json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3 border border-[#E6DFD3] hover:bg-[#FAF8F5] text-stone-600 rounded-lg text-xs font-medium cursor-pointer"
                >
                  وارد کردن JSON
                </button>
              </div>
            </div>

            <div className="p-4 border border-[#E6DFD3] rounded-xl space-y-2.5">
              <div className="font-bold text-stone-900">بازگردانی داده‌های نمونه اولیه</div>
              <p className="text-stone-600 leading-relaxed">
                بازگشت پایگاه داده به اطلاعات نمونه پیش‌فرض آکادمی.
              </p>
              <button
                type="button"
                onClick={onResetDemo}
                className="h-9 px-4 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی داده‌های نمونه</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Director & Staff Users Management (Hashed Passwords in SQLite) */}
      <div className="bg-white border border-[#E6DFD3] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0EAE0] pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#8E5F15]" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">مدیریت کاربران، مدیر و امنیت دسترسی</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                رمزهای عبور با الگوریتم امن scrypt و Salt یکتا در پایگاه داده محلی هش و نگهداری می‌شوند
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(dbInfo?.requireLogin)}
              onChange={(e) => handleToggleLoginLock(e.target.checked)}
              className="w-4 h-4 accent-[#8E5F15] rounded"
            />
            <Lock className="w-3.5 h-3.5 text-[#8E5F15]" />
            <span>الزام ورود با رمز عبور هنگام اجرای نرم‌افزار</span>
          </label>
        </div>

        {(userError || userSuccess) && (
          <div
            className={`p-3 rounded-lg text-xs font-medium border ${
              userError
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {userError || userSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleCreateUser} className="lg:col-span-5 space-y-3 text-xs bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-4">
            <div className="font-bold text-stone-900">افزودن حساب کاربری مدیر / پرسنل</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-600 mb-1">نام کاربری (انگلیسی)</label>
                <input
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="مثلاً: admin"
                  className="w-full h-9 px-3 bg-white border border-[#E6DFD3] rounded-lg font-code focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">نقش کاربری</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-9 px-3 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-stone-600 mb-1">نام و نام خانوادگی</label>
                <input
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="نام کامل مدیر یا کارمند"
                  className="w-full h-9 px-3 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">رمز عبور (حداقل ۶ کاراکتر)</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#8E5F15]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="h-9 px-4 bg-[#8E5F15] hover:bg-[#754D10] text-white rounded-lg font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ثبت کاربر جدید</span>
            </button>
          </form>

          <div className="lg:col-span-7 border border-[#E6DFD3] rounded-xl overflow-hidden">
            {users.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                هنوز کاربر مدیری تعریف نشده است. برای فعال‌سازی قفل ورود، ابتدا یک کاربر تعریف کنید.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6DFD3] text-[11px] font-semibold text-stone-500">
                    <th className="py-2.5 px-4">نام کاربری</th>
                    <th className="py-2.5 px-3">نام کامل</th>
                    <th className="py-2.5 px-3">نقش</th>
                    <th className="py-2.5 px-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 px-4 font-code text-stone-900">{u.username}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">{u.fullName}</td>
                      <td className="py-2.5 px-3 text-stone-600">{u.role}</td>
                      <td className="py-2.5 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="px-2.5 py-1 border border-red-200 hover:bg-red-50 text-red-700 rounded-md text-[11px] font-medium cursor-pointer"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
