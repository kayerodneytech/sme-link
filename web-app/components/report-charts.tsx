"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const monthly = [
  { month: "Jan", revenue: 4100, expenses: 2700 },
  { month: "Feb", revenue: 5200, expenses: 3100 },
  { month: "Mar", revenue: 4700, expenses: 2950 },
  { month: "Apr", revenue: 6900, expenses: 3600 },
  { month: "May", revenue: 7200, expenses: 3900 },
  { month: "Jun", revenue: 8450, expenses: 4120 },
];

const categories = [
  { name: "Stock", value: 2140, color: "#16324F" },
  { name: "Rent", value: 650, color: "#0F766E" },
  { name: "Transport", value: 540, color: "#D97706" },
  { name: "Utilities", value: 430, color: "#6B8EAD" },
  { name: "Other", value: 360, color: "#B8C4CE" },
];

export function CashFlowBars() {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ left: -18, right: 0 }}><CartesianGrid stroke="#edf0f3" strokeDasharray="4 4" vertical={false} /><XAxis axisLine={false} dataKey="month" fontSize={11} tickLine={false} /><YAxis axisLine={false} fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} /><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} /><Bar dataKey="revenue" fill="#0F766E" radius={[5, 5, 0, 0]} /><Bar dataKey="expenses" fill="#D9E0E6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function ExpensePie() {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" innerRadius={58} nameKey="name" outerRadius={92} paddingAngle={3}>{categories.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Pie><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer></div>;
}
