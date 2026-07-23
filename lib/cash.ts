import { roundMoney } from "./calculations";

export const STOCK_PURCHASES_CATEGORY = "Stock purchases";

/** Money still available: start + sales − everything spent. */
export function calculateCashOnHand(
  openingCash: number,
  salesTotal: number,
  expensesTotal: number,
) {
  return roundMoney(openingCash + salesTotal - expensesTotal);
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
