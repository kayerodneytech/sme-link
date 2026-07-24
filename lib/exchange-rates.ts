import { roundMoney } from "./calculations";

/** App currency codes that differ from ISO 4217 market codes. */
const MARKET_ALIASES: Record<string, string> = {
  ZIG: "ZWG",
};

/** ISO codes that should display under the business-facing app label. */
const DISPLAY_ALIASES: Record<string, string> = {
  ZWG: "ZIG",
};

export function toMarketCurrency(code: string) {
  const upper = code.trim().toUpperCase();
  return MARKET_ALIASES[upper] ?? upper;
}

export function toAppCurrency(code: string) {
  const upper = code.trim().toUpperCase();
  return DISPLAY_ALIASES[upper] ?? upper;
}

export type ExchangeRateSnapshot = {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
  provider: string;
};

/**
 * Fetch latest USD-based rates from ExchangeRate-API's open endpoint.
 * No API key. Updates about once per day. Cache on the caller.
 * @see https://www.exchangerate-api.com/docs/free
 */
export async function fetchUsdExchangeRates(): Promise<ExchangeRateSnapshot> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 60 * 60 },
  });
  if (!response.ok) {
    throw new Error(`Exchange rate provider returned ${response.status}.`);
  }
  const payload = (await response.json()) as {
    result?: string;
    base_code?: string;
    time_last_update_utc?: string;
    rates?: Record<string, number>;
  };
  if (payload.result !== "success" || !payload.rates) {
    throw new Error("Exchange rate provider returned an unexpected response.");
  }

  return {
    base: "USD",
    rates: payload.rates,
    updatedAt: payload.time_last_update_utc ?? new Date().toUTCString(),
    provider: "open.er-api.com",
  };
}

/** How many units of `to` equal 1 unit of `from`. */
export function getRate(
  rates: Record<string, number>,
  from: string,
  to: string,
) {
  const fromCode = toMarketCurrency(from);
  const toCode = toMarketCurrency(to);
  if (fromCode === toCode) return 1;

  const fromPerUsd = rates[fromCode];
  const toPerUsd = rates[toCode];
  if (!fromPerUsd || !toPerUsd) return null;

  // rates are "units of currency per 1 USD"
  return toPerUsd / fromPerUsd;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
) {
  const rate = getRate(rates, from, to);
  if (rate == null) return null;
  return roundMoney(amount * rate);
}

export function formatRateLabel(
  rates: Record<string, number>,
  from: string,
  to: string,
) {
  const rate = getRate(rates, from, to);
  if (rate == null) return null;
  return `1 ${toAppCurrency(from)} = ${rate.toLocaleString("en-ZW", {
    maximumFractionDigits: 4,
  })} ${toAppCurrency(to)}`;
}
