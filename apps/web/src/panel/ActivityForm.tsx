import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWheelStore } from '../store/wheelStore';
import type { Activity, ActivityKind, RecurrenceType, Ring } from '../types';

export function ActivityForm({
  ring,
  activity,
  onDone,
}: {
  ring: Ring;
  activity?: Activity;
  onDone: () => void;
}) {
  const { addActivity, updateActivity } = useWheelStore();

  const [title, setTitle] = useState(activity?.title ?? '');
  const [kind, setKind] = useState<ActivityKind>(activity?.kind ?? 'range');
  const [startDate, setStartDate] = useState(activity?.startDate ?? '');
  const [endDate, setEndDate] = useState(activity?.endDate ?? '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>(
    activity?.recurrenceRule?.type ?? 'none'
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The native `required` attribute was intentionally removed from the date
    // inputs (it broke a jsdom test-submission scenario), so this manual
    // check is the only guard against persisting an empty date string, which
    // would otherwise silently produce an Invalid Date / NaN angle later.
    if (!startDate) {
      toast.error('Startdato er påkrevd');
      return;
    }
    if (kind === 'range' && !endDate) {
      toast.error('Sluttdato er påkrevd for aktiviteter med varighet');
      return;
    }
    const payload = {
      ringId: ring.id,
      title,
      notes: null,
      kind,
      startDate,
      endDate: kind === 'milestone' ? null : endDate,
      recurrenceRule: recurrenceType === 'none' ? null : { type: recurrenceType, interval: 1, until: null },
      lane: activity?.lane ?? 0,
      color: null,
    };
    if (activity) {
      await updateActivity(activity.id, payload);
    } else {
      await addActivity(payload);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tittel</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="kind">Type</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as ActivityKind)}>
          <SelectTrigger id="kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="range">Periode</SelectItem>
            <SelectItem value="milestone">Milepæl</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="startDate">Startdato</Label>
        <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      {kind === 'range' && (
        <div>
          <Label htmlFor="endDate">Sluttdato</Label>
          <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      )}
      <div>
        <Label htmlFor="recurrence">Gjentakelse</Label>
        <select
          id="recurrence"
          aria-label="Gjentakelse"
          value={recurrenceType}
          onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType | 'none')}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="none">Ingen</option>
          <option value="daily">Daglig</option>
          <option value="weekly">Ukentlig</option>
          <option value="monthly">Månedlig</option>
          <option value="yearly">Årlig</option>
        </select>
      </div>
      <Button type="submit">Lagre</Button>
    </form>
  );
}
