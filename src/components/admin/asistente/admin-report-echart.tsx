"use client";

import * as React from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

type AdminReportEchartProps = {
  option: EChartsOption;
  height: number;
  ariaLabel: string;
};

export function AdminReportEchart({
  option,
  height,
  ariaLabel,
}: Readonly<AdminReportEchartProps>) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<ReturnType<typeof echarts.init> | null>(null);
  const optionRef = React.useRef(option);
  optionRef.current = option;

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = echarts.init(host, undefined, {
      renderer: "canvas",
      height,
      width: Math.max(host.clientWidth, 1),
    });
    chartRef.current = chart;

    const paint = () => {
      if (chart.isDisposed()) return;
      const width = Math.max(
        Math.round(host.getBoundingClientRect().width),
        host.clientWidth,
      );
      if (width < 8) return;
      chart.setOption(optionRef.current, { notMerge: true });
      chart.resize({ width, height });
    };

    paint();
    const frame = window.requestAnimationFrame(paint);
    const observer = new ResizeObserver(paint);
    observer.observe(host);
    window.addEventListener("resize", paint);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", paint);
      chart.dispose();
      chartRef.current = null;
    };
  }, [height]);

  React.useEffect(() => {
    const chart = chartRef.current;
    const host = hostRef.current;
    if (!chart || chart.isDisposed() || !host) return;
    const width = Math.max(
      Math.round(host.getBoundingClientRect().width),
      host.clientWidth,
    );
    chart.setOption(option, { notMerge: true });
    if (width >= 8) chart.resize({ width, height });
  }, [option, height]);

  return (
    <div
      ref={hostRef}
      aria-label={ariaLabel}
      className="relative w-full min-w-0 overflow-hidden"
      style={{ height, width: "100%", minHeight: height }}
    />
  );
}
