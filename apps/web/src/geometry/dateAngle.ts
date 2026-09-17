import { differenceInCalendarDays, startOfYear, addDays, isLeapYear, format } from 'date-fns';

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

// Formats a local-calendar Date as a 'yyyy-MM-dd' string using local time
// components (via date-fns' `format`), NOT `date.toISOString()`. `toISOString`
// converts to UTC first, which shifts the date backward by one calendar day
// in any timezone ahead of UTC (e.g. Europe/Oslo) — and, worse, is only
// lossless across a `addDays` round-trip while the local UTC offset hasn't
// changed between the two dates, so it also silently loses a day when the
// arithmetic crosses a DST transition. This is the sole place Date→string
// conversion for activity dates should happen, per the geometry/ boundary.
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
