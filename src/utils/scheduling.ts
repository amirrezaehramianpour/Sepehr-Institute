import type { ClassSection, Instructor, Room, WeekDay } from '../types/institute.ts';

export const WEEK_DAYS: WeekDay[] = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
];

export const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

export interface ScheduleConflict {
  type: 'room' | 'instructor';
  conflictingClass: ClassSection;
  overlappingDays: WeekDay[];
  message: string;
}

export function detectScheduleConflicts(
  candidate: {
    id?: string;
    instructorId: string;
    roomId: string;
    days: WeekDay[];
    startTime: string;
    endTime: string;
  },
  existingClasses: ClassSection[],
  rooms: Room[],
  instructors: Instructor[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  if (
    !candidate.days.length ||
    timeToMinutes(candidate.startTime) >= timeToMinutes(candidate.endTime)
  ) {
    return conflicts;
  }

  for (const cls of existingClasses) {
    if (candidate.id && cls.id === candidate.id) continue;
    if (cls.status === 'completed') continue;

    const overlappingDays = candidate.days.filter((d) => cls.days.includes(d));
    if (overlappingDays.length === 0) continue;

    if (!timesOverlap(candidate.startTime, candidate.endTime, cls.startTime, cls.endTime)) {
      continue;
    }

    if (cls.roomId === candidate.roomId) {
      const roomName = rooms.find((r) => r.id === cls.roomId)?.name ?? 'اتاق انتخابی';
      conflicts.push({
        type: 'room',
        conflictingClass: cls,
        overlappingDays,
        message: `تداخل اتاق: «${roomName}» در روزهای ${overlappingDays.join('، ')} ساعت ${cls.startTime} تا ${cls.endTime} به کلاس «${cls.title}» اختصاص دارد.`,
      });
    }

    if (cls.instructorId === candidate.instructorId) {
      const instName =
        instructors.find((i) => i.id === cls.instructorId)?.fullName ?? 'استاد انتخابی';
      conflicts.push({
        type: 'instructor',
        conflictingClass: cls,
        overlappingDays,
        message: `تداخل استاد: «${instName}» در روزهای ${overlappingDays.join('، ')} ساعت ${cls.startTime} تا ${cls.endTime} در حال تدریس کلاس «${cls.title}» است.`,
      });
    }
  }

  return conflicts;
}

export function findAvailableRooms(
  candidate: {
    id?: string;
    days: WeekDay[];
    startTime: string;
    endTime: string;
  },
  existingClasses: ClassSection[],
  rooms: Room[],
): Room[] {
  if (
    !candidate.days.length ||
    timeToMinutes(candidate.startTime) >= timeToMinutes(candidate.endTime)
  ) {
    return rooms;
  }

  return rooms.filter((room) => {
    const conflict = existingClasses.some((cls) => {
      if (candidate.id && cls.id === candidate.id) return false;
      if (cls.status === 'completed') return false;
      if (cls.roomId !== room.id) return false;
      const dayOverlap = candidate.days.some((d) => cls.days.includes(d));
      if (!dayOverlap) return false;
      return timesOverlap(candidate.startTime, candidate.endTime, cls.startTime, cls.endTime);
    });
    return !conflict;
  });
}
