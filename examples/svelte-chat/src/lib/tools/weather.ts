import { tool } from "ai";
import { z } from "zod";

/**
 * Get current weather and 7-day forecast for a city using Open-Meteo API.
 * Free, no API key required.
 * https://open-meteo.com/
 */
export const getWeather = tool({
  description:
    "Get current weather conditions and a 7-day forecast for a given city. Returns temperature, humidity, wind speed, weather conditions, and daily forecasts.",
  inputSchema: z.object({
    city: z
      .string()
      .describe("City name (e.g., 'New York', 'London', 'Tokyo')"),
  }),
  execute: async ({ city }) => {
    // Step 1: Geocode the city name to coordinates
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

    // Step 2: Get weather data
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

    const weatherDescription = describeWeatherCode(
      weather.current.weather_code,
    );

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
        condition: weatherDescription,
      },
      forecast,
    };
  },
});

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
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] ?? "Unknown";
}
