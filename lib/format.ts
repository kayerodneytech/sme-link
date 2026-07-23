export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-ZW", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
