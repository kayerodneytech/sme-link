/** Map app labels to ISO codes Intl understands (ZiG → ZWG). */
const INTL_CURRENCY_ALIASES: Record<string, string> = {
  ZIG: "ZWG",
};

export function formatMoney(value: number, currency = "USD") {
  const code = currency.trim().toUpperCase() || "USD";
  const intlCode = INTL_CURRENCY_ALIASES[code] ?? code;
  try {
    return new Intl.NumberFormat("en-ZW", {
      style: "currency",
      currency: intlCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("en-ZW", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${code}`;
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
