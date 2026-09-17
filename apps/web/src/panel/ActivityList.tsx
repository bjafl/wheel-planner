import { Button } from '@/components/ui/button';
import type { Activity } from '../types';

export function ActivityList({
  activities,
  ringName,
  onEdit,
  onDelete,
}: {
  activities: Activity[];
  ringName: (ringId: string) => string;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-center justify-between border-b pb-2">
          <div>
            <div className="font-medium">{activity.title}</div>
            <div className="text-sm text-muted-foreground">{ringName(activity.ringId)}</div>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(activity)}>Rediger</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(activity.id)}>Slett</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
