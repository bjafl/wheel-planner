import { useEffect, useState } from 'react';
import { WheelCanvas } from './wheel/WheelCanvas';
import { MonthRing } from './wheel/MonthRing';
import { TodayMarker } from './wheel/TodayMarker';
import { CategoryRing } from './wheel/CategoryRing';
import { ActivityTooltip } from './wheel/ActivityTooltip';
import { ActivityForm } from './panel/ActivityForm';
import { ActivityList } from './panel/ActivityList';
import { RingManager } from './panel/RingManager';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useWheelStore } from './store/wheelStore';
import { api } from './api/client';
import type { Activity } from './types';

// Dev bootstrap: until Task 13 adds a real "pick/create a wheel" UI, the app
// works against a single wheel per browser, created on first run and
// remembered in localStorage so reloads keep loading the same one.
const DEV_WHEEL_ID_KEY = 'wheel-planner:devWheelId';

async function ensureDevWheelId(): Promise<string> {
  const existing = localStorage.getItem(DEV_WHEEL_ID_KEY);
  if (existing) {
    try {
      await api.getWheel(existing);
      return existing;
    } catch {
      // Fall through and create a fresh one, e.g. after the dev DB was reset.
    }
  }
  const wheel = await api.createWheel({ title: 'Mitt årshjul', year: 2026 });
  localStorage.setItem(DEV_WHEEL_ID_KEY, wheel.id);
  return wheel.id;
}

export default function App() {
  const year = 2026;
  const wheel = useWheelStore((s) => s.wheel);
  const loadWheel = useWheelStore((s) => s.loadWheel);
  const removeActivity = useWheelStore((s) => s.removeActivity);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);
  const [formRingId, setFormRingId] = useState<string | undefined>(undefined);
  const [ringSheetOpen, setRingSheetOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ el: Element; label: string } | null>(null);

  useEffect(() => {
    ensureDevWheelId().then((id) => loadWheel(id));
  }, [loadWheel]);

  if (!wheel) {
    return <div className="p-8 text-center text-muted-foreground">Laster årshjul…</div>;
  }

  if (wheel.rings.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Legg til din første ring for å komme i gang.
        <RingManager rings={[]} />
      </div>
    );
  }

  const firstRing = wheel.rings[0];

  function openCreateForm() {
    setEditingActivity(undefined);
    setFormRingId(firstRing?.id);
    setSheetOpen(true);
  }

  function openEditForm(activity: Activity) {
    setEditingActivity(activity);
    setFormRingId(activity.ringId);
    setSheetOpen(true);
  }

  const formRing = wheel.rings.find((r) => r.id === formRingId);

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <WheelCanvas>
        <MonthRing year={year} />
        <TodayMarker year={year} />
        {wheel.rings.map((ring, ringIndex) => (
          <CategoryRing
            key={ring.id}
            ring={ring}
            ringIndex={ringIndex}
            activities={wheel.activities.filter((a) => a.ringId === ring.id)}
            year={year}
            setTooltip={setTooltip}
          />
        ))}
      </WheelCanvas>
      <ActivityTooltip
        referenceEl={tooltip?.el ?? null}
        label={tooltip?.label ?? ''}
        visible={tooltip !== null}
      />

      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Ringer</h2>
          <Button variant="outline" onClick={() => setRingSheetOpen(true)}>
            Administrer ringer
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Aktiviteter</h2>
          <Button onClick={openCreateForm} disabled={!firstRing}>
            Ny aktivitet
          </Button>
        </div>
        {!firstRing && (
          <p className="text-sm text-muted-foreground">
            Legg til en kategori-ring for å kunne opprette aktiviteter.
          </p>
        )}
        <ActivityList
          activities={wheel.activities}
          ringName={(ringId) => wheel.rings.find((r) => r.id === ringId)?.name ?? ringId}
          onEdit={openEditForm}
          onDelete={(activityId) => removeActivity(activityId)}
        />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingActivity ? 'Rediger aktivitet' : 'Ny aktivitet'}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {formRing && (
              <ActivityForm
                ring={formRing}
                activity={editingActivity}
                onDone={() => setSheetOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={ringSheetOpen} onOpenChange={setRingSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Administrer ringer</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <RingManager rings={wheel.rings} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
