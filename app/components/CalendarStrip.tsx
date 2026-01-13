"use client";

import { FC } from "react";
import { CalendarDay } from "../api/weis/types";

interface CalendarStripProps {
  days: CalendarDay[];
}

const CalendarStrip: FC<CalendarStripProps> = ({ days }) => {
  return (
    <div id="calendarContainer" style={{ display: "flex", gap: 10 }}>
      <div id="calendarPlainStrip">
        <h3 style={{ marginBottom: 8, paddingRight: 5 }}>&nbsp;</h3>
        {days.map((d) => (
          <div key={d.isoDate} className="calendar-plain">
            {d.weekdayShort}
          </div>
        ))}
      </div>

      <div id="calendarDayStrip">
        <h3 style={{ marginBottom: 8, paddingRight: 5 }}>Day</h3>
        {days.map((d) => (
          <div
            key={d.isoDate + "-day"}
            className="calendar-day"
            style={{
              backgroundColor: d.dayIsGood ? "#FFEB3B" : "#B0BEC5",
            }}
          >
            {d.dayRanges}
          </div>
        ))}
      </div>

      <div id="calendarNightStrip">
        <h3 style={{ marginBottom: 8, paddingRight: 5 }}>Night</h3>
        {days.map((d) => (
          <div
            key={d.isoDate + "-night"}
            className="calendar-night"
            style={{
              backgroundColor: d.nightIsGood ? "#81D4FA" : "#B0BEC5",
            }}
          >
            {d.nightRanges}
          </div>
        ))}
      </div>
    </div>
  );
};


export default CalendarStrip;
