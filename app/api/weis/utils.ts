// app/api/weis/utils.ts

import { CalendarDay, ProcessedRow } from "@/app/types/weis";

// Convert a Date to an MT ISO-like string (your original logic)
export function toMountainISO(date: Date): string {
  const mt = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Denver" })
  );

  const pad = (n: number) => String(n).padStart(2, "0");

  const year = mt.getFullYear();
  const month = pad(mt.getMonth() + 1);
  const day = pad(mt.getDate());
  const hour = pad(mt.getHours());
  const minute = pad(mt.getMinutes());
  const second = pad(mt.getSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

// Build "8A–12P, 1P–3P" style range labels from hour ints
export function hoursToRanges(hours: number[]): string {
  if (!hours || hours.length === 0) return "—";

  const sorted = [...hours].sort((a, b) => a - b);

  const ranges: [number, number][] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const h = sorted[i];
    if (h !== prev + 1) {
      ranges.push([start, prev]);
      start = h;
    }
    prev = h;
  }
  ranges.push([start, prev]);

  const fmt = (h: number) => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const suffix = h < 12 ? "A" : "P";
    return `${hour}${suffix}`;
  };

  return ranges
    .map(([s, e]) => `${fmt(s)}–${fmt(e + 1)}`) // end is exclusive
    .join(", ");
}

// Build the calendar summary from intervals
export function buildCalendar(
  intervals: { time: number; date: Date; green: boolean }[]
): CalendarDay[] {
  const calendarMap: Record<
    string,
    { dayHours: number[]; nightHours: number[] }
  > = {};

  intervals.forEach((i) => {
    const date = i.date instanceof Date ? i.date : new Date(i.date);
    const hour = date.getHours();
    const key = date.toLocaleDateString("en-CA"); // YYYY-MM-DD

    if (!calendarMap[key]) {
      calendarMap[key] = { dayHours: [], nightHours: [] };
    }

    // Day: 8–21
    if (hour >= 8 && hour < 21 && i.green) {
      calendarMap[key].dayHours.push(hour);
    }

    // Night hours: 21–24 and 0–8 belong to the "previous" day
    if (hour >= 21 || hour < 8) {
      const nightKeyDate = new Date(date);
      if (hour < 8) nightKeyDate.setDate(nightKeyDate.getDate() - 1);
      const nightKey = nightKeyDate.toLocaleDateString("en-CA");

      if (!calendarMap[nightKey]) {
        calendarMap[nightKey] = { dayHours: [], nightHours: [] };
      }
      if (i.green) {
        calendarMap[nightKey].nightHours.push(hour);
      }
    }
  });

  const keys = Object.keys(calendarMap).sort();

  // Your original code used slice(1, 8) – skip first, then next 7 days
  const selected = keys.slice(1, 8);

  const result: CalendarDay[] = selected.map((dateStr) => {
    const entry = calendarMap[dateStr];
    const dayHours = entry?.dayHours ?? [];
    const nightHours = entry?.nightHours ?? [];

    const [year, month, day] = dateStr.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    const weekdayShort = localDate.toLocaleDateString(undefined, {
      weekday: "short",
    });

    return {
      isoDate: dateStr,
      weekdayShort,
      dayRanges: hoursToRanges(dayHours),
      nightRanges: hoursToRanges(nightHours),
      dayIsGood: dayHours.length >= 5,
      nightIsGood: nightHours.length >= 5,
    };
  });

  return result;
}

// Helper for "now" truncated to the hour, in MT
export function getNowTruncatedToHourInMT(): Date {
  const now = new Date();
  const mtString = now.toLocaleString("en-US", {
    timeZone: "America/Denver",
  });
  const mt = new Date(mtString);
  mt.setMinutes(0, 0, 0);
  return mt;
}