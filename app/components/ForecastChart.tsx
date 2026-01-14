"use client";

import { FC, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";

ChartJS.register(
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement
);

import { Chart } from "react-chartjs-2";
import { Bar } from "react-chartjs-2";
import { ForecastChartData } from "../types/weis";

interface ForecastChartProps {
  data: ForecastChartData;
  calendarWidthPx: number; // computed same logic as before
}

const ForecastChart: FC<ForecastChartProps> = ({ data, calendarWidthPx }) => {
  const chartRef = useRef<ChartJS<"bar"> | null>(null);

  const { labels, solarStack, windStack, fractionLine, fractionColors } = data;

  const yellow = "rgba(255, 235, 59, 0.7)";
  const blue = "rgba(129, 212, 250, 0.7)";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Solar Fraction",
        data: solarStack,
        backgroundColor: yellow,
        borderColor: yellow,
        borderWidth: 5,
        stack: "clean",
      },
      {
        label: "Wind Fraction",
        data: windStack,
        backgroundColor: blue,
        borderColor: blue,
        borderWidth: 5,
        stack: "clean",
      },
      {
        label: "Green Fraction",
        type: "line" as const,
        order: 99,
        data: fractionLine,
        borderWidth: 5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        borderColor: "hsl(120, 100%, 40%)",
        segment: {
          borderColor: (ctx: any) => {
            const i = ctx.p0DataIndex;
            return fractionColors[i] || "hsl(120, 100%, 40%)";
          },
        },
      },
    ],
  };

  const options = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          title: (tooltipItems: any[]) => {
            const raw = tooltipItems[0].label as string;
            const [datePart, timePart] = raw.split("T");
            const [year, month, day] = datePart.split("-");
            const hour = parseInt(timePart.split(":")[0], 10);

            const monthNames = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            const monthLabel = monthNames[parseInt(month, 10) - 1];
            const dayLabel = parseInt(day, 10);

            const formattedHour =
              hour === 0
                ? "12 AM"
                : hour < 12
                ? `${hour} AM`
                : hour === 12
                ? "12 PM"
                : `${hour - 12} PM`;

            return `${monthLabel} ${dayLabel}, ${formattedHour}`;
          },
          label: (context: any) => {
            const label = context.dataset.label || "";
            const value = context.raw as number;
            return `${label}: ${Math.round(value * 100)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "Date",
          color: "#000000",
          font: {
            family: "Segoe UI, Arial, sans-serif",
            weight: "normal" as const,
          },
        },
        ticks: {
          color: "#000000",
          font: {
            family: "Segoe UI, Arial, sans-serif",
            weight: "normal" as const,
          },
          callback: function (value: any, index: number, ticks: any) {
            const chart = (this as any).chart;
            if (index % 24 === 12) {
              const raw = chart.data.labels[index] as string;
              const [year, month, day] = raw.split("T")[0].split("-");
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(
                day,
                10
              )}`;
            }
            return "";
          },
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { color: "rgba(255,255,255,0.15)" },
      },
      y: {
        stacked: true,
        min: 0,
        max: 1,
        title: {
          display: true,
          text: "Percent Clean",
          color: "#000000",
          font: {
            family: "Segoe UI, Arial, sans-serif",
            weight: "normal" as const,
          },
        },
        ticks: {
          color: "#000000",
          font: {
            family: "Segoe UI, Arial, sans-serif",
            weight: "normal" as const,
          },
          callback: (value: number | string) =>
            Math.round(Number(value) * 100) + "%",
        },
        grid: { color: "rgba(255,255,255,0.15)" },
      },
    },
  };

  const style = {
    width: calendarWidthPx,
    height: 300,
  };

  return (
    <div style={style}>
      <Chart ref={chartRef} type="bar" data={chartData} options={options} />
    </div>
  );
};

export default ForecastChart;
