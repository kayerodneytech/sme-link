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

/** Split a VAT-inclusive total into net and VAT. When VAT is off, VAT is 0. */
export function splitVatInclusive(
  total: number,
  vatRegistered: boolean,
  vatRate = 15,
) {
  const gross = roundMoney(total);
  if (!vatRegistered || vatRate <= 0) {
    return { net: gross, vat: 0, gross, rate: vatRate };
  }

  const vat = roundMoney((gross * vatRate) / (100 + vatRate));
  const net = roundMoney(gross - vat);
  return { net, vat, gross, rate: vatRate };
}

export function calculateChange(totalDue: number, cashReceived: number) {
  return roundMoney(cashReceived - totalDue);
}
