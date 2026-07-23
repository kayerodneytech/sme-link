import { roundMoney } from "./calculations";

/** What one piece cost when a whole pack was bought together. */
export function unitCostFromPack(piecesInPack: number, paidForPack: number) {
  if (!Number.isFinite(piecesInPack) || piecesInPack <= 0) return 0;
  if (!Number.isFinite(paidForPack) || paidForPack < 0) return 0;
  return roundMoney(paidForPack / piecesInPack);
}

/** Money left on one piece after what it cost you. */
export function profitPerPiece(sellEachFor: number, unitCost: number) {
  return roundMoney(sellEachFor - unitCost);
}

export function profitOnQuantity(
  quantity: number,
  sellEachFor: number,
  unitCost: number,
) {
  return roundMoney(quantity * profitPerPiece(sellEachFor, unitCost));
}
