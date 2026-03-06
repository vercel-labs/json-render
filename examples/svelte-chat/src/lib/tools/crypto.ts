import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Helpers
// =============================================================================

function handleFetchError(res: Response, coinId: string) {
  if (res.status === 404) {
    return { error: `Cryptocurrency not found: ${coinId}` };
  }
  if (res.status === 429) {
    return { error: "CoinGecko rate limit exceeded. Try again in a minute." };
  }
  return { error: `Failed to fetch crypto data: ${res.statusText}` };
}

function sampleTimeSeries(
  prices: [number, number][],
  maxPoints: number,
): Array<{ date: string; price: number }> {
  const step = Math.max(1, Math.floor(prices.length / maxPoints));
  return prices
    .filter((_, i) => i % step === 0)
    .map(([timestamp, price]) => ({
      date: new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.round(price * 100) / 100,
    }));
}

// =============================================================================
// getCryptoPrice — current market data + 7-day sparkline
// =============================================================================

/**
 * Get cryptocurrency market data from CoinGecko.
 * Free public API, no API key required.
 * https://docs.coingecko.com/reference/introduction
 */
export const getCryptoPrice = tool({
  description:
    "Get current price, market cap, 24h change, and 7-day sparkline for a cryptocurrency. For longer price history (30d, 90d, 365d), use getCryptoPriceHistory instead.",
  inputSchema: z.object({
    coinId: z
      .string()
      .describe(
        "CoinGecko coin ID (e.g., 'bitcoin', 'ethereum', 'solana', 'dogecoin', 'cardano')",
      ),
  }),
  execute: async ({ coinId }) => {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return handleFetchError(res, coinId);

    const data = (await res.json()) as {
      id: string;
      symbol: string;
      name: string;
      market_data: {
        current_price: { usd: number };
        market_cap: { usd: number };
        total_volume: { usd: number };
        price_change_percentage_24h: number;
        price_change_percentage_7d: number;
        price_change_percentage_30d: number;
        high_24h: { usd: number };
        low_24h: { usd: number };
        ath: { usd: number };
        ath_date: { usd: string };
        circulating_supply: number;
        total_supply: number | null;
        sparkline_7d: { price: number[] };
      };
      market_cap_rank: number;
    };

    const md = data.market_data;

    // Convert sparkline (hourly array) to dated points
    const now = Date.now();
    const sparkline = md.sparkline_7d.price;
    const step = Math.max(1, Math.floor(sparkline.length / 14));
    const sparklineData = sparkline
      .filter((_, i) => i % step === 0)
      .map((price, i) => {
        const hourIndex = i * step;
        const ts = now - (sparkline.length - hourIndex) * 3600_000;
        return {
          date: new Date(ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          price: Math.round(price * 100) / 100,
        };
      });

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      rank: data.market_cap_rank,
      price: md.current_price.usd,
      marketCap: md.market_cap.usd,
      volume24h: md.total_volume.usd,
      change24h: Math.round(md.price_change_percentage_24h * 100) / 100,
      change7d: Math.round(md.price_change_percentage_7d * 100) / 100,
      change30d: Math.round(md.price_change_percentage_30d * 100) / 100,
      high24h: md.high_24h.usd,
      low24h: md.low_24h.usd,
      allTimeHigh: md.ath.usd,
      allTimeHighDate: md.ath_date.usd,
      circulatingSupply: md.circulating_supply,
      totalSupply: md.total_supply,
      sparkline7d: sparklineData,
    };
  },
});

// =============================================================================
// getCryptoPriceHistory — flexible date range price history
// =============================================================================

export const getCryptoPriceHistory = tool({
  description:
    "Get historical price data for a cryptocurrency over a specified number of days (e.g., 30, 90, 365). Returns date-labeled data points suitable for charting.",
  inputSchema: z.object({
    coinId: z
      .string()
      .describe("CoinGecko coin ID (e.g., 'bitcoin', 'ethereum', 'solana')"),
    days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .describe("Number of days of history to fetch (e.g., 30, 90, 365)"),
  }),
  execute: async ({ coinId, days }) => {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return handleFetchError(res, coinId);

    const data = (await res.json()) as {
      prices: [number, number][];
    };

    const priceHistory = sampleTimeSeries(data.prices, 20);

    return {
      coinId,
      days,
      priceHistory,
    };
  },
});
