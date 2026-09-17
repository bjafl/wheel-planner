import { addDays, addWeeks, addMonths, addYears, startOfYear, endOfYear } from 'date-fns';
import type { RecurrenceType } from '../types';

export interface RecurrenceRuleInput {
  type: RecurrenceType;
  interval: number;
  until: Date | null;
}

function step(date: Date, type: RecurrenceType, interval: number): Date {
  switch (type) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'monthly':
      return addMonths(date, interval);
    case 'yearly':
      return addYears(date, interval);
  }
}

export function expandRecurrence(anchorDate: Date, rule: RecurrenceRuleInput, year: number): Date[] {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const hardStop = rule.until ?? yearEnd;
  const effectiveEnd = hardStop < yearEnd ? hardStop : yearEnd;

  const occurrences: Date[] = [];
  let current = anchorDate;

  // Fast-forward to the first occurrence that could fall within the year.
  while (current < yearStart) {
    current = step(current, rule.type, rule.interval);
  }

  while (current <= effectiveEnd) {
    if (current >= yearStart) {
      occurrences.push(current);
    }
    current = step(current, rule.type, rule.interval);
  }

  return occurrences;
}
