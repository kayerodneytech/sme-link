export type SaleLine = {
  quantity: number;
  unitPrice: number;
};

export function calculateSaleTotal(lines: SaleLine[]) {
  return roundMoney(
    lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
  );
}

export function calculateNetCashFlow(revenue: number, expenses: number) {
  return roundMoney(revenue - expenses);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
