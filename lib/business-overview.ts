import "server-only";

import {
  expenseBreakdown,
  expenses as mockExpenses,
  monthlyPerformance,
  orders as mockOrders,
  products as mockProducts,
  sales as mockSales,
} from "@/lib/sample-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type MonthlyPerformance = {
  key: string;
  month: string;
  revenue: number;
  expenses: number;
};

export type BusinessOverview = {
  source: "mock" | "supabase";
  revenue: number;
  expenses: number;
  netCashFlow: number;
  previousRevenue: number;
  lowStock: {
    id: string;
    name: string;
    stock: number;
    threshold: number;
    unit: string;
  }[];
  openOrders: number;
  bestSeller: { name: string; quantity: number } | null;
  monthly: MonthlyPerformance[];
  expenseCategories: { name: string; value: number }[];
  recentActivity: {
    id: string;
    label: string;
    detail: string;
    value: number;
    kind: "sale" | "expense";
  }[];
};

function mockOverview(): BusinessOverview {
  const current = monthlyPerformance.at(-1)!;
  const previous = monthlyPerformance.at(-2)!;
  return {
    source: "mock",
    revenue: current.revenue,
    expenses: current.expenses,
    netCashFlow: current.revenue - current.expenses,
    previousRevenue: previous.revenue,
    lowStock: mockProducts
      .filter((product) => product.stock <= product.threshold)
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        threshold: product.threshold,
        unit: "items",
      })),
    openOrders: mockOrders.filter((order) =>
      ["Pending", "Confirmed"].includes(order.status),
    ).length,
    bestSeller: { name: "Maize meal 10kg", quantity: 126 },
    monthly: monthlyPerformance,
    expenseCategories: expenseBreakdown,
    recentActivity: [
      ...mockSales.slice(0, 2).map((sale) => ({
        id: sale.id,
        label: `Sale ${sale.id}`,
        detail: sale.customer,
        value: sale.total,
        kind: "sale" as const,
      })),
      ...mockExpenses.slice(0, 1).map((expense) => ({
        id: expense.id,
        label: expense.description,
        detail: expense.category,
        value: expense.amount,
        kind: "expense" as const,
      })),
    ],
  };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1),
    );
    return {
      key: monthKey(date),
      month: date.toLocaleDateString("en", {
        month: "short",
        timeZone: "UTC",
      }),
      revenue: 0,
      expenses: 0,
    };
  });
}

export async function getBusinessOverview(): Promise<BusinessOverview> {
  if (!hasSupabaseConfig()) return mockOverview();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to view business information.");

  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();
  if (membershipError) throw membershipError;

  const businessId = membership.business_id;
  const months = lastSixMonths();
  const periodStart = `${months[0].key}-01T00:00:00.000Z`;

  const [salesResult, expensesResult, stockResult, ordersResult, itemsResult] =
    await Promise.all([
      supabase
        .from("sales")
        .select("id, sale_number, total, completed_at")
        .eq("business_id", businessId)
        .eq("status", "completed")
        .gte("completed_at", periodStart)
        .order("completed_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, description, amount, expense_date, expense_categories(name)")
        .eq("business_id", businessId)
        .gte("expense_date", periodStart.slice(0, 10))
        .order("expense_date", { ascending: false }),
      supabase
        .from("product_stock")
        .select("id, name, quantity_on_hand, reorder_level, unit")
        .eq("business_id", businessId)
        .eq("is_archived", false),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["pending", "confirmed"]),
      supabase
        .from("sale_items")
        .select("quantity, products!inner(name, business_id), sales!inner(status)")
        .eq("products.business_id", businessId)
        .eq("sales.status", "completed"),
    ]);

  const firstError = [
    salesResult.error,
    expensesResult.error,
    stockResult.error,
    ordersResult.error,
    itemsResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  for (const sale of salesResult.data ?? []) {
    if (!sale.completed_at) continue;
    const month = months.find((item) => item.key === monthKey(new Date(sale.completed_at)));
    if (month) month.revenue += Number(sale.total);
  }

  const categoryTotals = new Map<string, number>();
  for (const expense of expensesResult.data ?? []) {
    const month = months.find(
      (item) => item.key === String(expense.expense_date).slice(0, 7),
    );
    if (month) month.expenses += Number(expense.amount);
    const relation = Array.isArray(expense.expense_categories)
      ? expense.expense_categories[0]
      : expense.expense_categories;
    const category = relation?.name ?? "Other";
    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + Number(expense.amount),
    );
  }

  const productTotals = new Map<string, number>();
  for (const item of itemsResult.data ?? []) {
    const relation = Array.isArray(item.products) ? item.products[0] : item.products;
    if (!relation?.name) continue;
    productTotals.set(
      relation.name,
      (productTotals.get(relation.name) ?? 0) + Number(item.quantity),
    );
  }
  const bestSellerEntry = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const current = months.at(-1)!;
  const previous = months.at(-2)!;
  const currentKey = current.key;
  const recentSales = (salesResult.data ?? []).slice(0, 3).map((sale) => ({
    id: sale.id,
    label: `Sale #${sale.sale_number}`,
    detail: sale.completed_at
      ? new Date(sale.completed_at).toLocaleDateString("en-ZW")
      : "Completed sale",
    value: Number(sale.total),
    kind: "sale" as const,
  }));
  const recentExpenses = (expensesResult.data ?? []).slice(0, 3).map((expense) => ({
    id: expense.id,
    label: expense.description,
    detail: new Date(expense.expense_date).toLocaleDateString("en-ZW"),
    value: Number(expense.amount),
    kind: "expense" as const,
  }));

  return {
    source: "supabase",
    revenue: current.revenue,
    expenses: current.expenses,
    netCashFlow: current.revenue - current.expenses,
    previousRevenue: previous.revenue,
    lowStock: (stockResult.data ?? [])
      .filter(
        (product) =>
          Number(product.quantity_on_hand) <= Number(product.reorder_level),
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: Number(product.quantity_on_hand),
        threshold: Number(product.reorder_level),
        unit: product.unit ?? "items",
      })),
    openOrders: ordersResult.count ?? 0,
    bestSeller: bestSellerEntry
      ? { name: bestSellerEntry[0], quantity: bestSellerEntry[1] }
      : null,
    monthly: months,
    expenseCategories: [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    recentActivity: [...recentSales, ...recentExpenses].slice(0, 5),
  };
}
