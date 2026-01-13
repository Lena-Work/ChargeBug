// app/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import ForecastChart from "./components/ForecastChart";
import CalendarStrip from "./components/CalendarStrip";
import { ProcessedWeisResponse } from "./app/types/weis";

export default function HomePage() {
  const [data, setData] = useState<ProcessedWeisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/weis");
        if (!res.ok) {
          throw new Error(`Status: ${res.status}`);
        }
        const json = (await res.json()) as ProcessedWeisResponse;
        setData(json);
      } catch (err: any) {
        setError(String(err));
      }
    };
    load();
  }, []);

  const calendarWidthPx = useMemo(() => {
    if (!data) return 900;
    const renderedDayCount = data.calendar.length;

    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 600;

    const BOX_WIDTH = isMobile ? window.innerWidth * 0.19 : 102;
    const BOX_GAP = 10;
    const HEADER_WIDTH = 60;

    return renderedDayCount > 0
      ? HEADER_WIDTH + renderedDayCount * (BOX_WIDTH + BOX_GAP)
      : 900;
  }, [data]);

  if (error) {
    return (
      <main style={{ padding: 16 }}>
        <div id="lastUpdated">Download failed. {error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 16 }}>
        <div id="statusBox">Loading forecast status...</div>
      </main>
    );
  }

  const { statusBox, greenWindow, updatedDisplay, calendar, chart, table } =
    data;

  const statusBackground =
    statusBox.status === "green"
      ? "var(--green, #609343)"
      : statusBox.status === "carbon"
      ? "#FF7979"
      : "var(--gray-light, #CCCCCC)";

  const greenWindowBackground =
    greenWindow.isCurrentlyGreen === true ? "#609343" : "#F7F7F7";

  return (
    <main style={{ padding: 16 }}>
      {/* Status box */}
      <div
        id="statusBox"
        style={{
          backgroundColor: statusBackground,
          padding: "8px 12px",
          marginBottom: 8,
          color: "#000",
        }}
      >
        {statusBox.text}
      </div>

      {/* Green window + next green hour (if you later add it) */}
      <div
        id="greenWindow"
        style={{
          backgroundColor: greenWindowBackground,
          padding: "8px 12px",
          marginBottom: 8,
        }}
      >
        {greenWindow.text}
      </div>

      <div id="nextGreenHour">
        {/* If you later compute nextGreenHour on backend, render it here */}
      </div>

      {/* Calendar + chart */}
      <div id="scrollWrapper" style={{ overflowX: "auto" }}>
        <CalendarStrip days={calendar} />
        <ForecastChart data={chart} calendarWidthPx={calendarWidthPx} />
      </div>

      {/* Last updated */}
      <div id="lastUpdated" style={{ marginTop: 8 }}>
        {updatedDisplay}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setShowTable((v) => !v)}
        style={{ marginBottom: 12, marginTop: 12 }}
      >
        Show/Hide Data Table
      </button>

      {/* Data table */}
      {showTable && (
        <table id="csvTable" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th
                  key={h}
                  style={{ border: "1px solid #ccc", padding: "4px 8px" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => {
              const mtIso = row[row.length - 1];
              const hour = new Date(mtIso).getHours();
              const isNight = hour >= 21 || hour < 8;

              return (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: isNight ? "#eee" : "transparent",
                  }}
                >
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      style={{
                        border: "1px solid #ccc",
                        padding: "4px 8px",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
