import { NextResponse } from "next/server";
import {
  ProcessedRow,
  ProcessedWeisResponse,
  WeisApiRawResponse,
  StatusBox,
  GreenWindow,
  TableData,
} from "@/app/types/weis";
import { buildCalendar, getNowTruncatedToHourInMT, toMountainISO } from "./utils";

const SOURCE_URL = "https://weis-api.vercel.app/api/weis";

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const json = (await response.json()) as WeisApiRawResponse;

    const processed = processWeisData(json);
    return NextResponse.json<ProcessedWeisResponse>(processed);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch WEIS data", details: String(error) },
      { status: 500 }
    );
  }
}

// Core logic: your entire original data processing
function processWeisData(raw: WeisApiRawResponse): ProcessedWeisResponse {
  const { updated, rows } = raw;

  // Build ProcessedRow[]
  let dataRows: ProcessedRow[] = [];

  rows.forEach((row) => {
    const cleanRow: Record<string, string> = {};
    Object.keys(row).forEach((k) => {
      cleanRow[k.trim()] = row[k];
    });

    const mtlfVal = parseFloat(cleanRow["MTLF"]) || 0;
    const mtsfVal = parseFloat(cleanRow["MTSF"]) || 0;
    const mtwfVal = parseFloat(cleanRow["MTWF"]) || 0;

    if (!mtlfVal) return;

    const mtsf1_4 = mtsfVal * 1.4;
    const mtlfx = mtlfVal + mtsfVal * 0.4;
    const fraction = mtlfx !== 0 ? (mtsf1_4 + mtwfVal) / mtlfx : 0;
    const solarFraction = mtlfx !== 0 ? mtsf1_4 / mtlfx : 0;
    const windFraction = fraction - solarFraction;

    const rawInterval = cleanRow["Interval"];
    if (!rawInterval) return;

    const [datePart, timePart] = rawInterval.split(" ");
    const [month, day, year] = datePart.split("/").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    const mtDate = new Date(year, month - 1, day, hour, minute, second);
    mtDate.setHours(mtDate.getHours() - 1); // subtract one hour

    const mtString = toMountainISO(mtDate);

    const isNight = mtDate.getHours() >= 21 || mtDate.getHours() < 8;

    dataRows.push({
      rawInterval,
      mtlf: mtlfVal,
      mtsf: mtsfVal,
      mtwf: mtwfVal,
      mtsfScaled: mtsf1_4,
      mtlfx,
      fraction,
      solarFraction,
      windFraction,
      green: false, // placeholder; will set later
      mtIso: mtString,
      isNight,
    });
  });

  // Filter: today's midnight MT through +7 days
  const nowMT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" })
  );
  const midnight = new Date(nowMT);
  midnight.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(
    midnight.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  dataRows = dataRows.filter((d) => {
    const t = new Date(d.mtIso).getTime();
    return t >= midnight.getTime() && t < sevenDaysLater.getTime();
  });

  if (dataRows.length === 0) {
    // Return an "empty" but valid payload
    return {
      updatedDisplay: formatUpdated(updated),
      statusBox: { status: "unknown", text: "Current grid status: Unknown" },
      greenWindow: {
        text: "Current green status unknown.",
        durationHours: 0,
        isCurrentlyGreen: null,
      },
      calendar: [],
      chart: {
        labels: [],
        solarStack: [],
        windStack: [],
        fractionLine: [],
        fractionColors: [],
      },
      table: { headers: [], rows: [] },
    };
  }

  // Sort by time
  dataRows.sort(
    (a, b) => new Date(a.mtIso).getTime() - new Date(b.mtIso).getTime()
  );

  // Average fraction
  const fractionAvg =
    dataRows.reduce((sum, d) => sum + d.fraction, 0) / dataRows.length;
  const threshold = Math.min(fractionAvg, 0.45);

  // Determine green flag and build intervals
  const nowTruncated = getNowTruncatedToHourInMT();
  const nowTime = nowTruncated.getTime();

  const intervals: { time: number; date: Date; green: boolean }[] = [];
  let currentGreen: boolean | null = null;

  dataRows = dataRows.map((d) => {
    const green = d.fraction > threshold;
    const date = new Date(d.mtIso);
    date.setMinutes(0, 0, 0);
    const time = date.getTime();

    intervals.push({ time, date, green });

    if (time === nowTime) {
      currentGreen = green;
    }

    return { ...d, green };
  });

  const statusBox = buildStatusBox(currentGreen);
  const greenWindow = buildGreenWindow(intervals, nowTime, currentGreen);

  const calendar = buildCalendar(intervals);
  const chart = buildChartData(dataRows);
  const table = buildTable(dataRows, threshold);

  return {
    updatedDisplay: formatUpdated(updated),
    statusBox,
    greenWindow,
    calendar,
    chart,
    table,
  };
}

function formatUpdated(updated: string): string {
  const dt = new Date(updated);
  const mtString = dt.toLocaleString("en-US", {
    timeZone: "America/Denver",
  });
  return `Last updated from SPP WEIS: ${mtString}`;
}

function buildStatusBox(currentGreen: boolean | null): StatusBox {
  if (currentGreen === true) {
    return {
      status: "green",
      text: "Current grid status: Clean and GREEN!",
    };
  } else if (currentGreen === false) {
    return {
      status: "carbon",
      text: "Current grid status: Carbon-Heavy",
    };
  }
  return {
    status: "unknown",
    text: "Current grid status: Unknown",
  };
}

function buildGreenWindow(
  intervals: { time: number; date: Date; green: boolean }[],
  nowTime: number,
  currentGreen: boolean | null
): GreenWindow {
  if (currentGreen === null) {
    return {
      text: "Current green status unknown.",
      durationHours: 0,
      isCurrentlyGreen: null,
    };
  }

  let duration = 0;

  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i].time === nowTime) {
      // If currently green, count consecutive green ahead
      if (currentGreen === true) {
        for (let j = i; j < intervals.length && intervals[j].green; j++) {
          duration++;
        }
        const text = `Green for the next ${duration} hour${
          duration !== 1 ? "s" : ""
        }`;
        return { text, durationHours: duration, isCurrentlyGreen: true };
      }

      // If currently carbon-heavy, count consecutive non-green ahead
      if (currentGreen === false) {
        for (let j = i; j < intervals.length && !intervals[j].green; j++) {
          duration++;
        }
        const text = `Grid will be green in ${duration} hour${
          duration !== 1 ? "s" : ""
        }`;
        return { text, durationHours: duration, isCurrentlyGreen: false };
      }
    }
  }

  return {
    text: "Current green status unknown.",
    durationHours: 0,
    isCurrentlyGreen: null,
  };
}

function buildChartData(
  dataRows: ProcessedRow[]
): import("./types").ForecastChartData {
  const labels: string[] = [];
  const solarStack: number[] = [];
  const windStack: number[] = [];
  const fractionLine: number[] = [];
  const fractionColors: string[] = [];

  dataRows.forEach((d) => {
    labels.push(d.mtIso);

    const solarFraction = d.solarFraction;
    const windFraction = d.windFraction;
    const fraction = d.fraction;

    const clamped = Math.max(0, Math.min(fraction, 1));
    const lightness = 5 + clamped * 55;
    const color = `hsl(120, 100%, ${lightness}%)`;

    solarStack.push(isNaN(solarFraction) ? 0 : solarFraction);
    windStack.push(isNaN(windFraction) ? 0 : windFraction);
    fractionLine.push(isNaN(fraction) ? 0 : fraction);
    fractionColors.push(color);
  });

  return {
    labels,
    solarStack,
    windStack,
    fractionLine,
    fractionColors,
  };
}

function buildTable(
  dataRows: ProcessedRow[],
  threshold: number
): TableData {
  const headers = [
    "Interval",
    "MTLF",
    "MTSF",
    "MTWF",
    "MTSF*1.4",
    "MTLFX",
    "Fraction",
    "Solar Fraction",
    "Wind Fraction",
    "Green",
    "MT Time",
  ];

  const rows: string[][] = dataRows.map((d) => {
    const green = d.fraction > threshold ? "1" : "0";
    return [
      d.rawInterval,
      d.mtlf.toFixed(2),
      d.mtsf.toFixed(2),
      d.mtwf.toFixed(2),
      d.mtsfScaled.toFixed(2),
      d.mtlfx.toFixed(2),
      d.fraction.toFixed(2),
      d.solarFraction.toFixed(2),
      d.windFraction.toFixed(2),
      green,
      d.mtIso,
    ];
  });

  return { headers, rows };
}
