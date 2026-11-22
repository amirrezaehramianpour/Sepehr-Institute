import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  CalendarRange,
  ClipboardCheck,
  Wallet,
  Award,
  TrendingUp,
  MessageSquare,
  Settings,
  Search,
  X,
} from 'lucide-react';
import type { InstituteState, NavSection } from '../types/institute.ts';
import { getTodayPersianLabel, toPersianDigits } from '../utils/formatters.ts';
import defaultEmblem from '../assets/images/jewelry_emblem_1795358999694.jpg';
import directorAvatar from '../assets/images/director_avatar_1795336500648.jpg';

interface LayoutShellProps {
  activeNav: NavSection;
  onNavigate: (section: NavSection) => void;
  state: InstituteState;
  onSelectStudentFromSearch: (studentId: string) => void;
  savingState: 'idle' | 'saving' | 'saved' | 'error';
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'پیشخوان مدیریت', icon: LayoutDashboard },
  { id: 'students', label: 'ثبت‌نام و هنرجویان', icon: Users },
  { id: 'courses', label: 'دوره‌های آموزشی', icon: BookOpen },
  { id: 'instructors', label: 'مدیریت اساتید', icon: GraduationCap },
  { id: 'schedule', label: 'برنامه‌ریزی و کلاس‌ها', icon: CalendarRange },
  { id: 'attendance', label: 'حضور و غیاب کلاسی', icon: ClipboardCheck },
  { id: 'finance', label: 'مالی و حسابداری', icon: Wallet },
  { id: 'grades', label: 'نمرات و کارنامه', icon: Award },
  { id: 'analytics', label: 'مشاور هوشمند و تحلیل', icon: TrendingUp },
  { id: 'communications', label: 'ارتباط با هنرجویان', icon: MessageSquare },
  { id: 'settings', label: 'تنظیمات و پشتیبان', icon: Settings },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeNav,
  onNavigate,
  state,
  onSelectStudentFromSearch,
  savingState,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [emblemError, setEmblemError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { students: [], classes: [], instructors: [] };

    const students = state.students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.nationalId.includes(q) ||
          s.code.toLowerCase().includes(q),
      )
      .slice(0, 5);

    const classes = state.classes
      .filter((c) => c.title.toLowerCase().includes(q))
      .slice(0, 4);

    const instructors = state.instructors
      .filter((i) => i.fullName.toLowerCase().includes(q) || i.specialty.toLowerCase().includes(q))
      .slice(0, 3);

    return { students, classes, instructors };
  }, [searchQuery, state.students, state.classes, state.instructors]);

  const activeItem = NAV_ITEMS.find((n) => n.id === activeNav);
  const todayLabel = useMemo(() => getTodayPersianLabel(), []);

  const hasResults =
    searchResults.students.length > 0 ||
    searchResults.classes.length > 0 ||
    searchResults.instructors.length > 0;

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] text-stone-900">
      {/* Desktop Obsidian Atelier Sidebar Navigation */}
      <aside className="no-print w-64 shrink-0 bg-[#181614] border-l border-[#2B2620] text-stone-200 flex flex-col justify-between sticky top-0 h-screen">
        <div>
          {/* Institute Brand Lockup */}
          <div className="px-4 py-4 border-b border-[#2B2620] flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg border border-[#3B3328] bg-[#221E1A] flex items-center justify-center overflow-hidden shrink-0">
              {!emblemError ? (
                <img
                  src={state.settings.logoUrl || defaultEmblem}
                  alt={state.settings.name}
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-[#D4A853]">زرین</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-stone-50 truncate">
                {state.settings.name}
              </div>
              <div className="text-xs text-[#D4A853] truncate">
                ترم {state.settings.currentTerm}
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#C89B3C] text-[#181614] font-bold'
                      : 'text-stone-300 font-medium hover:bg-[#25211D] hover:text-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#181614]' : 'text-[#C89B3C]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Director Profile & Save State */}
        <div className="p-3 border-t border-[#2B2620] space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-9 h-9 rounded-lg border border-[#3B3328] bg-[#221E1A] overflow-hidden shrink-0 flex items-center justify-center">
              {!avatarError ? (
                <img
                  src={directorAvatar}
                  alt={state.settings.managerName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-[#D4A853]">مدیر</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-stone-100 truncate">
                {state.settings.managerName}
              </div>
              <div className="text-[11px] text-stone-400 truncate">
                {savingState === 'saving'
                  ? 'در حال ذخیره...'
                  : savingState === 'error'
                  ? 'خطا در ذخیره‌سازی'
                  : 'مدیریت کل آکادمی'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Desktop Workspace Bar */}
        <header className="no-print h-14 bg-white border-b border-[#E6DFD3] px-6 flex items-center justify-between gap-6 sticky top-0 z-20">
          {/* Breadcrumb / Active Section Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-base font-bold text-stone-900 whitespace-nowrap shrink-0">
              {activeItem?.label}
            </h1>
            <span className="text-stone-300 hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-xs text-stone-500 hidden sm:inline whitespace-nowrap shrink-0">
              {todayLabel}
            </span>
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="جستجوی سریع هنرجو، کلاس یا استاد (Ctrl+K)..."
                className="w-full h-9 pr-9 pl-8 text-xs bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#9A6B1E] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  aria-label="پاک کردن جستجو"
                  className="absolute left-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-11 right-0 left-0 bg-white border border-[#E6DFD3] rounded-xl shadow-lg overflow-hidden z-30">
                {!hasResults ? (
                  <div className="p-4 text-xs text-stone-500 text-center">
                    موردی با عبارت «{searchQuery}» یافت نشد.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                    {searchResults.students.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-semibold text-stone-500">
                          هنرجویان
                        </div>
                        {searchResults.students.map((stu) => (
                          <button
                            key={stu.id}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              onSelectStudentFromSearch(stu.id);
                            }}
                            className="w-full text-right px-2.5 py-2 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-between text-xs cursor-pointer"
                          >
                            <span className="font-medium text-stone-900">{stu.fullName}</span>
                            <span className="text-stone-500 tabular-nums">
                              {toPersianDigits(stu.phone)} · {stu.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.classes.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-semibold text-stone-500">
                          کلاس‌ها
                        </div>
                        {searchResults.classes.map((cls) => (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              onNavigate('schedule');
                            }}
                            className="w-full text-right px-2.5 py-2 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-between text-xs cursor-pointer"
                          >
                            <span className="font-medium text-stone-900">{cls.title}</span>
                            <span className="text-stone-500 tabular-nums">
                              {toPersianDigits(cls.startTime)}–{toPersianDigits(cls.endTime)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.instructors.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[11px] font-semibold text-stone-500">
                          اساتید
                        </div>
                        {searchResults.instructors.map((inst) => (
                          <button
                            key={inst.id}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              onNavigate('instructors');
                            }}
                            className="w-full text-right px-2.5 py-2 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-between text-xs cursor-pointer"
                          >
                            <span className="font-medium text-stone-900">{inst.fullName}</span>
                            <span className="text-stone-500">{inst.specialty}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
