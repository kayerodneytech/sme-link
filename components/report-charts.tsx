"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyPerformance } from "@/lib/business-overview";

const colors = ["#16324F", "#0F766E", "#D97706", "#6B8EAD", "#B8C4CE"];

export function CashFlowBars({ data }: { data: MonthlyPerformance[] }) {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -18, right: 0 }}><CartesianGrid stroke="#edf0f3" strokeDasharray="4 4" vertical={false} /><XAxis axisLine={false} dataKey="month" fontSize={11} tickLine={false} /><YAxis axisLine={false} fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} /><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} /><Bar dataKey="revenue" fill="#0F766E" name="Money in" radius={[5, 5, 0, 0]} /><Bar dataKey="expenses" fill="#D9E0E6" name="Money out" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function ExpensePie({ data }: { data: { name: string; value: number }[] }) {
  const categories = data.map((entry, index) => ({
    ...entry,
    color: colors[index % colors.length],
  }));
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" innerRadius={58} nameKey="name" outerRadius={92} paddingAngle={3}>{categories.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Pie><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer></div>;
}
