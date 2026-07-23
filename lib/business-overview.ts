import "server-only";

import {
  calculateCashOnHand,
  calculateTakeHome,
  STOCK_PURCHASES_CATEGORY,
} from "@/lib/cash";
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
  /** Running costs this month, excluding stock purchases. */
  operatingExpenses: number;
  netCashFlow: number;
  openingCash: number;
  cashOnHand: number;
  tracksInventory: boolean;
  /** What the sold stock cost you this month. */
  costOfGoods: number;
  /** Money left from sales after stock cost, before other expenses. */
  salesProfit: number;
  /** Sales profit minus operating expenses (not stock purchases). */
  estimatedTakeHome: number;
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
  const costOfGoods = Math.round(current.revenue * 0.62);
  const salesProfit = current.revenue - costOfGoods;
  const stockPurchases = 2140;
  const operatingExpenses = Math.max(current.expenses - stockPurchases, 0);
  const openingCash = 1200;
  return {
    source: "mock",
    revenue: current.revenue,
    expenses: current.expenses,
    operatingExpenses,
    netCashFlow: current.revenue - current.expenses,
    openingCash,
    cashOnHand: calculateCashOnHand(openingCash, current.revenue, current.expenses),
    tracksInventory: true,
    costOfGoods,
    salesProfit,
    estimatedTakeHome: calculateTakeHome(
      current.revenue,
      costOfGoods,
      operatingExpenses,
    ),
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

  const [
    businessResult,
    salesResult,
    expensesResult,
    allSalesResult,
    allExpensesResult,
    stockResult,
    ordersResult,
    itemsResult,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("opening_cash, tracks_inventory")
      .eq("id", businessId)
      .single(),
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
      .from("sales")
      .select("total")
      .eq("business_id", businessId)
      .eq("status", "completed"),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", businessId),
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
      .select(
        "quantity, unit_price, products!inner(name, business_id, cost_price), sales!inner(status, completed_at)",
      )
      .eq("products.business_id", businessId)
      .eq("sales.status", "completed"),
  ]);

  const firstError = [
    businessResult.error,
    salesResult.error,
    expensesResult.error,
    allSalesResult.error,
    allExpensesResult.error,
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
  let operatingExpenses = 0;
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
    if (category !== STOCK_PURCHASES_CATEGORY) {
      operatingExpenses += Number(expense.amount);
    }
  }

  const productTotals = new Map<string, number>();
  const currentKey = months.at(-1)!.key;
  let costOfGoods = 0;
  let salesProfit = 0;

  for (const item of itemsResult.data ?? []) {
    const relation = Array.isArray(item.products) ? item.products[0] : item.products;
    const sale = Array.isArray(item.sales) ? item.sales[0] : item.sales;
    if (!relation?.name) continue;
    productTotals.set(
      relation.name,
      (productTotals.get(relation.name) ?? 0) + Number(item.quantity),
    );

    if (!sale?.completed_at) continue;
    if (monthKey(new Date(sale.completed_at)) !== currentKey) continue;

    const quantity = Number(item.quantity);
    const lineRevenue = quantity * Number(item.unit_price);
    const lineCost = quantity * Number(relation.cost_price ?? 0);
    costOfGoods += lineCost;
    salesProfit += lineRevenue - lineCost;
  }

  const bestSellerEntry = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const current = months.at(-1)!;
  const previous = months.at(-2)!;
  const openingCash = Number(businessResult.data?.opening_cash ?? 0);
  const tracksInventory = Boolean(businessResult.data?.tracks_inventory);
  const lifetimeSales = (allSalesResult.data ?? []).reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );
  const lifetimeExpenses = (allExpensesResult.data ?? []).reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  // Service businesses have no COGS from stock; sales profit is just revenue.
  if (!tracksInventory) {
    salesProfit = current.revenue;
    costOfGoods = 0;
  }

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
    operatingExpenses,
    netCashFlow: current.revenue - current.expenses,
    openingCash,
    cashOnHand: calculateCashOnHand(openingCash, lifetimeSales, lifetimeExpenses),
    tracksInventory,
    costOfGoods,
    salesProfit,
    estimatedTakeHome: calculateTakeHome(
      current.revenue,
      costOfGoods,
      operatingExpenses,
    ),
    previousRevenue: previous.revenue,
    lowStock: tracksInventory
      ? (stockResult.data ?? [])
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
          }))
      : [],
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
