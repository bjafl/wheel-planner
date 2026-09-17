import { WheelCanvas } from './wheel/WheelCanvas';
import { MonthRing } from './wheel/MonthRing';
import { TodayMarker } from './wheel/TodayMarker';
import { CategoryRing } from './wheel/CategoryRing';
import type { Ring, Activity } from './types';

const fixtureRing: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
const fixtureActivities: Activity[] = [
  { id: 'a1', ringId: 'r1', title: 'Vårkampanje', notes: null, kind: 'range', startDate: '2026-03-01', endDate: '2026-05-01', recurrenceRule: null, lane: 0, color: null },
  { id: 'a2', ringId: 'r1', title: 'Lansering', notes: null, kind: 'milestone', startDate: '2026-06-15', endDate: null, recurrenceRule: null, lane: 0, color: null },
];

export default function App() {
  const year = 2026;
  return (
    <div className="p-8 flex justify-center">
      <WheelCanvas>
        <MonthRing year={year} />
        <TodayMarker year={year} />
        <CategoryRing ring={fixtureRing} ringIndex={0} activities={fixtureActivities} year={year} />
      </WheelCanvas>
    </div>
  );
}
