export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
  until: string | null; // ISO date 'YYYY-MM-DD', inclusive
}

export type ActivityKind = 'range' | 'milestone';

export interface Activity {
  id: string;
  ringId: string;
  title: string;
  notes: string | null;
  kind: ActivityKind;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string | null; // null when kind === 'milestone'
  recurrenceRule: RecurrenceRule | null;
  lane: number;
  color: string | null; // overrides the ring's color when set
}

export interface Ring {
  id: string;
  wheelId: string;
  name: string;
  orderIndex: number;
  color: string;
}

export interface Wheel {
  id: string;
  title: string;
  year: number;
  rings: Ring[];
  activities: Activity[];
}
