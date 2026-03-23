/**
 * Tools for the ink-chat example.
 *
 * All tools use free, public APIs — no API keys required beyond the
 * AI Gateway key that is already configured.
 *
 * These match the tools in examples/chat for consistency across examples.
 */

import { tool, generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";

// =============================================================================
// Web Search (Perplexity Sonar via AI Gateway)
// =============================================================================

export const webSearch = tool({
  description:
    "Search the web for current information on any topic. Returns a synthesized answer based on real-time web data.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query — be specific and include relevant context for better results",
      ),
  }),
  execute: async ({ query }) => {
    try {
      const { text } = await generateText({
        model: gateway("perplexity/sonar"),
        prompt: query,
      });
      return { content: text };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// =============================================================================
// Weather (Open-Meteo — free, no API key)
// =============================================================================

function describeWeatherCode(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
  };
  return descriptions[code] ?? "Unknown";
}

export const getWeather = tool({
  description:
    "Get current weather conditions and a 7-day forecast for a given city. Returns temperature, humidity, wind speed, weather conditions, and daily forecasts.",
  inputSchema: z.object({
    city: z
      .string()
      .describe("City name (e.g., 'New York', 'London', 'Tokyo')"),
  }),
  execute: async ({ city }) => {
    try {
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geocodeRes = await fetch(geocodeUrl);

      if (!geocodeRes.ok) {
        return { error: `Failed to geocode city: ${city}` };
      }

      const geocodeData = (await geocodeRes.json()) as {
        results?: Array<{
          name: string;
          country: string;
          latitude: number;
          longitude: number;
          timezone: string;
        }>;
      };

      if (!geocodeData.results || geocodeData.results.length === 0) {
        return { error: `City not found: ${city}` };
      }

      const location = geocodeData.results[0]!;

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=${encodeURIComponent(location.timezone)}&forecast_days=7`;

      const weatherRes = await fetch(weatherUrl);

      if (!weatherRes.ok) {
        return { error: "Failed to fetch weather data" };
      }

      const weather = (await weatherRes.json()) as {
        current: {
          temperature_2m: number;
          relative_humidity_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
        };
        daily: {
          time: string[];
          weather_code: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
        };
      };

      const forecast = weather.daily.time.map((date, i) => ({
        date,
        day: new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "short",
        }),
        high: Math.round(weather.daily.temperature_2m_max[i]!),
        low: Math.round(weather.daily.temperature_2m_min[i]!),
        condition: describeWeatherCode(weather.daily.weather_code[i]!),
        precipitation: weather.daily.precipitation_sum[i]!,
      }));

      return {
        city: location.name,
        country: location.country,
        current: {
          temperature: Math.round(weather.current.temperature_2m),
          feelsLike: Math.round(weather.current.apparent_temperature),
          humidity: weather.current.relative_humidity_2m,
          windSpeed: Math.round(weather.current.wind_speed_10m),
          condition: describeWeatherCode(weather.current.weather_code),
        },
        forecast,
      };
    } catch (error) {
      return {
        error: `Weather fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// =============================================================================
// Hacker News (Firebase API — free, no API key)
// =============================================================================

export const getHackerNewsTop = tool({
  description:
    "Get the current top stories from Hacker News, including title, score, author, URL, and comment count.",
  inputSchema: z.object({
    count: z
      .number()
      .min(1)
      .max(30)
      .describe("Number of top stories to fetch (1-30)"),
  }),
  execute: async ({ count }) => {
    try {
      const topRes = await fetch(
        "https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty",
        { signal: AbortSignal.timeout(5000) },
      );

      if (!topRes.ok) {
        return { error: "Failed to fetch Hacker News top stories" };
      }

      const topIds = (await topRes.json()) as number[];
      const storyIds = topIds.slice(0, count);

      const stories = await Promise.all(
        storyIds.map(async (id) => {
          const storyRes = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!storyRes.ok) return null;

          const story = (await storyRes.json()) as {
            id: number;
            title: string;
            url?: string;
            score: number;
            by: string;
            time: number;
            descendants?: number;
          };

          return {
            title: story.title,
            url:
              story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
            score: story.score,
            author: story.by,
            comments: story.descendants ?? 0,
          };
        }),
      );

      return {
        stories: stories.filter(Boolean),
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Hacker News fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// =============================================================================
// GitHub (Public API — free, no API key, 60 req/hr)
// =============================================================================

const ghHeaders = { Accept: "application/vnd.github.v3+json" };

export const getGitHubRepo = tool({
  description:
    "Get information about a public GitHub repository including stars, forks, open issues, description, and language breakdown.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (e.g., 'vercel')"),
    repo: z.string().describe("Repository name (e.g., 'next.js')"),
  }),
  execute: async ({ owner, repo }) => {
    try {
      const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

      const [repoRes, languagesRes] = await Promise.all([
        fetch(repoUrl, { headers: ghHeaders }),
        fetch(`${repoUrl}/languages`, { headers: ghHeaders }),
      ]);

      if (!repoRes.ok) {
        if (repoRes.status === 404)
          return { error: `Not found: ${owner}/${repo}` };
        return { error: `Failed to fetch repo: ${repoRes.statusText}` };
      }

      const repoData = (await repoRes.json()) as {
        full_name: string;
        description: string | null;
        html_url: string;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        language: string | null;
        license: { spdx_id: string } | null;
        topics: string[];
      };

      const languages: Record<string, number> = languagesRes.ok
        ? ((await languagesRes.json()) as Record<string, number>)
        : {};

      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
      const languageBreakdown = Object.entries(languages)
        .map(([lang, bytes]) => ({
          language: lang,
          percentage:
            totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 6);

      return {
        name: repoData.full_name,
        description: repoData.description,
        url: repoData.html_url,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        primaryLanguage: repoData.language,
        license: repoData.license?.spdx_id ?? "None",
        topics: repoData.topics,
        languages: languageBreakdown,
      };
    } catch (error) {
      return {
        error: `GitHub fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// =============================================================================
// Crypto (CoinGecko — free, no API key)
// =============================================================================

export const getCryptoPrice = tool({
  description:
    "Get current price, market cap, 24h change, and 7-day trend for a cryptocurrency.",
  inputSchema: z.object({
    coinId: z
      .string()
      .describe(
        "CoinGecko coin ID (e.g., 'bitcoin', 'ethereum', 'solana', 'dogecoin')",
      ),
  }),
  execute: async ({ coinId }) => {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404)
          return { error: `Cryptocurrency not found: ${coinId}` };
        if (res.status === 429)
          return {
            error: "CoinGecko rate limit exceeded. Try again in a minute.",
          };
        return { error: `Failed to fetch crypto data: ${res.statusText}` };
      }

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
          high_24h: { usd: number };
          low_24h: { usd: number };
        };
        market_cap_rank: number;
      };

      const md = data.market_data;

      return {
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        rank: data.market_cap_rank,
        price: md.current_price.usd,
        marketCap: md.market_cap.usd,
        volume24h: md.total_volume.usd,
        change24h: Math.round(md.price_change_percentage_24h * 100) / 100,
        change7d: Math.round(md.price_change_percentage_7d * 100) / 100,
        high24h: md.high_24h.usd,
        low24h: md.low_24h.usd,
      };
    } catch (error) {
      return {
        error: `Crypto fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// =============================================================================
// All tools (exported as a single record for streamText)
// =============================================================================

export const tools = {
  web_search: webSearch,
  get_weather: getWeather,
  get_hacker_news: getHackerNewsTop,
  get_github_repo: getGitHubRepo,
  get_crypto_price: getCryptoPrice,
};
