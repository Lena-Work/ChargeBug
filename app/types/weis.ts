// app/api/weis/types.ts

export interface RawWeisRow {
  [key: string]: string;
}

export interface WeisApiRawResponse {
  updated: string; // ISO from remote API
  rows: RawWeisRow[];
}

// Processed interval row
export interface ProcessedRow {
  rawInterval: string;  // original "MM/DD/YYYY HH:MM:SS"
  mtlf: number;
  mtsf: number;
  mtwf: number;
  mtsfScaled: number;
  mtlfx: number;
  fraction: number;
  solarFraction: number;
  windFraction: number;
  green: boolean;
  mtIso: string;        // "YYYY-MM-DDTHH:mm:ss" in MT
  isNight: boolean;
}

// For status box at top
export type GridStatus = "green" | "carbon" | "unknown";

export interface StatusBox {
  status: GridStatus;
  text: string;
}

// Green window message
export interface GreenWindow {
  text: string;
  durationHours: number;
  isCurrentlyGreen: boolean | null;
}

// Calendar per day
export interface CalendarDay {
  isoDate: string;        // "YYYY-MM-DD" in MT
  weekdayShort: string;   // "Mon", "Tue", etc.
  dayRanges: string;      // "8A–12P, 1P–3P"
  nightRanges: string;
  dayIsGood: boolean;
  nightIsGood: boolean;
}

// Chart data for React chart
export interface ForecastChartData {
  labels: string[];         // mtIso timestamps
  solarStack: number[];
  windStack: number[];
  fractionLine: number[];
  fractionColors: string[]; // for the green fraction coloring
}

// Table header + row data
export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ProcessedWeisResponse {
  updatedDisplay: string; // "Last updated from SPP WEIS: ..."
  statusBox: StatusBox;
  greenWindow: GreenWindow;
  calendar: CalendarDay[];
  chart: ForecastChartData;
  table: TableData;
}
