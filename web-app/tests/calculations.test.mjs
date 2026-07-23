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
