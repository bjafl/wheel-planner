export function mapRingRow(row: any) {
  return {
    id: row.id,
    wheelId: row.wheel_id,
    name: row.name,
    orderIndex: row.order_index,
    color: row.color,
  };
}

export function mapActivityRow(row: any) {
  return {
    id: row.id,
    ringId: row.ring_id,
    title: row.title,
    notes: row.notes,
    kind: row.kind,
    startDate: row.start_date,
    endDate: row.end_date,
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule) : null,
    lane: row.lane,
    color: row.color,
  };
}
