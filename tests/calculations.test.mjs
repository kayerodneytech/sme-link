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

function unitCostFromPack(piecesInPack, paidForPack) {
  if (!Number.isFinite(piecesInPack) || piecesInPack <= 0) return 0;
  if (!Number.isFinite(paidForPack) || paidForPack < 0) return 0;
  return roundMoney(paidForPack / piecesInPack);
}

function profitPerPiece(sellEachFor, unitCost) {
  return roundMoney(sellEachFor - unitCost);
}

test("pack buying turns a crate price into cost per piece", () => {
  assert.equal(unitCostFromPack(50, 20), 0.4);
});

test("profit per piece is sell price minus what it cost you", () => {
  assert.equal(profitPerPiece(0.8, 0.4), 0.4);
});

function productLabel(name, sizeValue, sizeUnit) {
  if (sizeValue == null || sizeValue <= 0 || !sizeUnit) return name;
  const amount = Number.isInteger(sizeValue)
    ? String(sizeValue)
    : String(Number(sizeValue.toFixed(3)).toString());
  return `${name} ${amount}${sizeUnit}`;
}

test("product labels include size so same names stay distinct", () => {
  assert.equal(productLabel("Pepsi", 500, "ml"), "Pepsi 500ml");
  assert.equal(productLabel("Pepsi", 1, "L"), "Pepsi 1L");
});

function calculateCashOnHand(openingCash, salesTotal, expensesTotal) {
  return roundMoney(openingCash + salesTotal - expensesTotal);
}

function calculateTakeHome(salesRevenue, costOfGoods, operatingExpenses) {
  return roundMoney(salesRevenue - costOfGoods - operatingExpenses);
}

test("cash in hand starts with capital then adds sales and subtracts spending", () => {
  assert.equal(calculateCashOnHand(500, 200, 80), 620);
});

test("take-home ignores stock purchases by using COGS instead", () => {
  assert.equal(calculateTakeHome(200, 80, 40), 80);
});
