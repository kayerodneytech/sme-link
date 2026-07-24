import {
  fetchUsdExchangeRates,
  toAppCurrency,
  toMarketCurrency,
} from "@/lib/exchange-rates";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currencies = (searchParams.get("currencies") ?? "")
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    const snapshot = await fetchUsdExchangeRates();
    const needed = new Set(
      ["USD", ...currencies].map((code) => toMarketCurrency(code)),
    );

    const rates: Record<string, number> = { USD: 1 };
    for (const marketCode of needed) {
      const value = snapshot.rates[marketCode];
      if (typeof value === "number") {
        rates[toAppCurrency(marketCode)] = value;
        rates[marketCode] = value;
      }
    }

    // Always expose ZIG when ZWG is present (ZiG ↔ ZWG).
    if (snapshot.rates.ZWG != null) {
      rates.ZIG = snapshot.rates.ZWG;
      rates.ZWG = snapshot.rates.ZWG;
    }

    const missing = currencies.filter((code) => {
      const market = toMarketCurrency(code);
      return rates[code] == null && rates[market] == null;
    });

    return NextResponse.json({
      base: "USD",
      rates,
      updatedAt: snapshot.updatedAt,
      provider: snapshot.provider,
      missing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Exchange rates could not be loaded.",
      },
      { status: 502 },
    );
  }
}
