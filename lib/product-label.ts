/** Format a product size for lists and receipts, e.g. 500ml or 1.5L */
export function formatProductSize(
  sizeValue?: number | null,
  sizeUnit?: string | null,
) {
  if (sizeValue == null || sizeValue <= 0 || !sizeUnit) return "";
  const amount = Number.isInteger(sizeValue)
    ? String(sizeValue)
    : String(Number(sizeValue.toFixed(3)).toString());
  return `${amount}${sizeUnit}`;
}

/** Product name with size, e.g. Pepsi 500ml */
export function productLabel(
  name: string,
  sizeValue?: number | null,
  sizeUnit?: string | null,
) {
  const size = formatProductSize(sizeValue, sizeUnit);
  return size ? `${name} ${size}` : name;
}

export const SIZE_UNITS = [
  { value: "ml", label: "ml (millilitres)" },
  { value: "L", label: "L (litres)" },
  { value: "g", label: "g (grams)" },
  { value: "kg", label: "kg (kilograms)" },
] as const;
