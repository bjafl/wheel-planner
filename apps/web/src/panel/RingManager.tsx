import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

function SortableRingRow({ ring, onRemove }: { ring: Ring; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: ring.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between border-b py-2">
      <span className="flex items-center gap-2">
        {/* Drag handle: dnd-kit's `attributes` include role="button"/tabIndex, so these are
            scoped to a dedicated handle rather than the whole <li> — spreading them onto the
            row would make the row itself an accessible button whose computed name includes
            both the ring name and "Fjern", colliding with the remove button below. */}
        <span
          {...attributes}
          {...listeners}
          aria-label={`Dra for å flytte ${ring.name}`}
          className="cursor-grab touch-none px-1 text-muted-foreground select-none"
        >
          ⠿
        </span>
        <span>{ring.name}</span>
      </span>
      <Button variant="destructive" size="sm" onClick={onRemove}>Fjern</Button>
    </li>
  );
}

export function RingManager({ rings }: { rings: Ring[] }) {
  const { addRing, updateRing, removeRing } = useWheelStore();
  const [name, setName] = useState('');

  async function handleAdd() {
    await addRing({ name, color: '#3b82f6', orderIndex: rings.length });
    setName('');
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rings.findIndex((r) => r.id === active.id);
    const newIndex = rings.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(rings, oldIndex, newIndex);
    await Promise.all(reordered.map((ring, index) => updateRing(ring.id, { orderIndex: index })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="ringName">Ringnavn</Label>
          <Input id="ringName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={handleAdd}>Legg til ring</Button>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rings.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {rings.map((ring) => (
              <SortableRingRow key={ring.id} ring={ring} onRemove={() => removeRing(ring.id)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
