"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPerformance } from "@/lib/business-overview";

export function DashboardChart({ data }: { data: MonthlyPerformance[] }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -22, right: 4, top: 8 }}>
          <defs>
            <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf0f3" strokeDasharray="4 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="month"
            fontSize={11}
            tick={{ fill: "#667085" }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={11}
            tick={{ fill: "#667085" }}
            tickFormatter={(value) => `$${value / 1000}k`}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #DDE3EA",
              borderRadius: 10,
              boxShadow: "0 8px 28px rgba(22,50,79,.1)",
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`]}
          />
          <Area
            dataKey="revenue"
            fill="url(#revenue)"
            stroke="#0F766E"
            strokeWidth={2.5}
            type="monotone"
          />
          <Area
            dataKey="expenses"
            fill="transparent"
            stroke="#D97706"
            strokeDasharray="5 5"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
