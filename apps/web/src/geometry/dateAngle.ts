import { differenceInCalendarDays, startOfYear, addDays, isLeapYear } from 'date-fns';

function yearLengthInDays(year: number): number {
  return isLeapYear(new Date(year, 0, 1)) ? 366 : 365;
}

export function dateToAngle(date: Date, year: number): number {
  const start = startOfYear(new Date(year, 0, 1));
  const totalDays = yearLengthInDays(year);
  const dayIndex = differenceInCalendarDays(date, start);
  return (dayIndex / totalDays) * 2 * Math.PI;
}

export function angleToDate(angle: number, year: number, snapToDay = true): Date {
  const start = startOfYear(new Date(year, 0, 1));
  const totalDays = yearLengthInDays(year);
  const twoPi = 2 * Math.PI;
  const normalized = ((angle % twoPi) + twoPi) % twoPi;
  const rawDayIndex = (normalized / twoPi) * totalDays;
  const dayIndex = snapToDay ? Math.round(rawDayIndex) : rawDayIndex;
  return addDays(start, dayIndex);
}
