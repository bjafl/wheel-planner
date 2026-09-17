export interface Laneable {
  id: string;
  startDate: Date;
  endDate: Date;
}

export function assignLanes<T extends Laneable>(items: T[]): Array<T & { lane: number }> {
  const sorted = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const laneEndTimes: number[] = []; // laneEndTimes[i] = end time of the last item placed in lane i

  return sorted.map((item) => {
    const startTime = item.startDate.getTime();
    const endTime = item.endDate.getTime();

    let lane = laneEndTimes.findIndex((laneEnd) => laneEnd < startTime);
    if (lane === -1) {
      lane = laneEndTimes.length;
    }
    laneEndTimes[lane] = endTime;

    return { ...item, lane };
  });
}
