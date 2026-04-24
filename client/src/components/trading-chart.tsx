import { useEffect, useRef, useCallback } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradingChartProps {
  data: CandleData[];
  height?: number;
  coinColor?: string;
  chartType?: "candlestick" | "area";
  priceFormatter?: (price: number) => string;
}

export function TradingChart({
  data,
  height = 360,
  coinColor = "#F0B90B",
  chartType = "candlestick",
  priceFormatter,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const buildChart = useCallback(() => {
    if (!containerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(132, 142, 156, 0.9)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 3 },
        horzLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "rgba(132, 142, 156, 0.9)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    if (priceFormatter) {
      chart.applyOptions({ localization: { priceFormatter } });
    }

    let series: ISeriesApi<any>;

    if (chartType === "candlestick") {
      series = chart.addCandlestickSeries({
        upColor: "#0ecb81",
        downColor: "#f6465d",
        borderVisible: false,
        wickUpColor: "#0ecb81",
        wickDownColor: "#f6465d",
      });
    } else {
      series = chart.addAreaSeries({
        lineColor: coinColor,
        topColor: `${coinColor}30`,
        bottomColor: `${coinColor}00`,
        lineWidth: 2,
      });
    }

    const sorted = [...data]
      .sort((a, b) => a.time - b.time)
      .filter((d, i, arr) => i === 0 || d.time !== arr[i - 1].time);

    if (sorted.length > 0) {
      if (chartType === "area") {
        series.setData(sorted.map((d) => ({ time: d.time as Time, value: d.close })));
      } else {
        series.setData(sorted.map((d) => ({ ...d, time: d.time as Time })));
      }
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, height, coinColor, chartType, priceFormatter]);

  useEffect(() => {
    const cleanup = buildChart();
    cleanupRef.current = cleanup ?? null;
    return () => {
      cleanup?.();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [buildChart]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
