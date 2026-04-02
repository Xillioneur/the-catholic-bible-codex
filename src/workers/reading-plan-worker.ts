
export interface ReadingPlanDayStatus {
  dayNumber: number;
  dateStr: string;
  isOverdue: boolean;
  isCurrent: boolean;
  isSealed: boolean;
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "PROCESS_STATUS") {
    const { days, userPlan } = payload;
    
    if (!userPlan || !days) {
      self.postMessage({ type: "STATUS_RESULT", payload: [] });
      return;
    }

    const startedAt = userPlan.startedAt;
    const currentDay = userPlan.currentDay;
    const completedDays = new Set(userPlan.completedDays || []);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const results: Record<number, ReadingPlanDayStatus> = {};

    for (const day of days) {
      let isOverdue = false;
      let dateStr = "";
      const isSealed = completedDays.has(day.dayNumber);
      const isCurrent = currentDay === day.dayNumber;

      if (startedAt) {
        const d = new Date(startedAt);
        d.setDate(d.getDate() + (day.dayNumber - 1));
        dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        const dayDate = new Date(d);
        dayDate.setHours(0, 0, 0, 0);
        
        if (dayDate < now && !isSealed) {
          isOverdue = true;
        }
      }

      results[day.dayNumber] = {
        dayNumber: day.dayNumber,
        dateStr,
        isOverdue,
        isCurrent,
        isSealed
      };
    }

    self.postMessage({ type: "STATUS_RESULT", payload: results });
  }
};
