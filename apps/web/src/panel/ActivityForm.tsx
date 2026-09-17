import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWheelStore } from '../store/wheelStore';
import type { Activity, ActivityKind, Ring } from '../types';

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ringId: ring.id,
      title,
      notes: null,
      kind,
      startDate,
      endDate: kind === 'milestone' ? null : endDate,
      recurrenceRule: null,
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
      <Button type="submit">Lagre</Button>
    </form>
  );
}
