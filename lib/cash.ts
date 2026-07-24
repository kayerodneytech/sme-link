import { roundMoney } from "./calculations";

export const STOCK_PURCHASES_CATEGORY = "Stock purchases";

/** Suggested currencies shown as quick picks in settings / signup. */
export const SUPPORTED_CURRENCIES = ["USD", "ZIG", "ZAR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** A business can accept at most this many currencies. */
export const MAX_CURRENCIES = 3;

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidCurrencyCode(value: string) {
  return CURRENCY_CODE_PATTERN.test(normalizeCurrencyCode(value));
}

export type CashAccountBalance = {
  currency: string;
  openingBalance: number;
  salesTotal: number;
  expensesTotal: number;
  balance: number;
};

/** Money still available in one currency account. */
export function calculateCashOnHand(
  openingCash: number,
  salesTotal: number,
  expensesTotal: number,
) {
  return roundMoney(openingCash + salesTotal - expensesTotal);
}

export function buildCashAccountBalances(
  accounts: { currency: string; opening_balance: number }[],
  sales: { currency: string; total: number }[],
  expenses: { currency: string; amount: number }[],
): CashAccountBalance[] {
  const map = new Map<string, CashAccountBalance>();

  for (const account of accounts) {
    map.set(account.currency, {
      currency: account.currency,
      openingBalance: Number(account.opening_balance),
      salesTotal: 0,
      expensesTotal: 0,
      balance: Number(account.opening_balance),
    });
  }

  for (const sale of sales) {
    const entry = map.get(sale.currency);
    if (!entry) continue;
    entry.salesTotal = roundMoney(entry.salesTotal + Number(sale.total));
  }

  for (const expense of expenses) {
    const entry = map.get(expense.currency);
    if (!entry) continue;
    entry.expensesTotal = roundMoney(entry.expensesTotal + Number(expense.amount));
  }

  return [...map.values()].map((entry) => ({
    ...entry,
    balance: calculateCashOnHand(
      entry.openingBalance,
      entry.salesTotal,
      entry.expensesTotal,
    ),
  }));
}

/**
 * Profit after stock that was sold and other running costs.
 * Stock purchases are excluded here because that money bought inventory;
 * sold stock is counted through cost of goods instead.
 */
export function calculateTakeHome(
  salesRevenue: number,
  costOfGoods: number,
  operatingExpenses: number,
) {
  return roundMoney(salesRevenue - costOfGoods - operatingExpenses);
}
