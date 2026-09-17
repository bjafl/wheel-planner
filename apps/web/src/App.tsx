import { WheelCanvas } from './wheel/WheelCanvas';
import { MonthRing } from './wheel/MonthRing';
import { TodayMarker } from './wheel/TodayMarker';

export default function App() {
  const year = 2026;
  return (
    <div className="p-8 flex justify-center">
      <WheelCanvas>
        <MonthRing year={year} />
        <TodayMarker year={year} />
      </WheelCanvas>
    </div>
  );
}
