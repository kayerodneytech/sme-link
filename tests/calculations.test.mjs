import assert from "node:assert/strict";
import test from "node:test";

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateSaleTotal(lines) {
  return roundMoney(
    lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
  );
}

function calculateNetCashFlow(revenue, expenses) {
  return roundMoney(revenue - expenses);
}

test("sale total includes all quantities and prices", () => {
  assert.equal(
    calculateSaleTotal([
      { quantity: 2, unitPrice: 6.5 },
      { quantity: 3, unitPrice: 1.75 },
    ]),
    18.25,
  );
});

test("cash flow subtracts expenses from revenue", () => {
  assert.equal(calculateNetCashFlow(8450, 4120), 4330);
});

test("money is rounded to two decimal places", () => {
  assert.equal(calculateSaleTotal([{ quantity: 3, unitPrice: 1.005 }]), 3.01);
});

function splitVatInclusive(total, vatRegistered, vatRate = 15) {
  const gross = roundMoney(total);
  if (!vatRegistered || vatRate <= 0) {
    return { net: gross, vat: 0, gross, rate: vatRate };
  }
  const vat = roundMoney((gross * vatRate) / (100 + vatRate));
  const net = roundMoney(gross - vat);
  return { net, vat, gross, rate: vatRate };
}

function calculateChange(totalDue, cashReceived) {
  return roundMoney(cashReceived - totalDue);
}

test("VAT line is zero when the business is not registered", () => {
  assert.deepEqual(splitVatInclusive(115, false, 15), {
    net: 115,
    vat: 0,
    gross: 115,
    rate: 15,
  });
});

test("VAT-inclusive totals split net and tax", () => {
  assert.deepEqual(splitVatInclusive(115, true, 15), {
    net: 100,
    vat: 15,
    gross: 115,
    rate: 15,
  });
});

test("cash change is the amount returned to the customer", () => {
  assert.equal(calculateChange(42.5, 50), 7.5);
});
