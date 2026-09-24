/**
 * The one piece of business logic in this demo. Both interfaces (REST in
 * ../api, MCP in ../mcp) call this exact function — nothing about the
 * lookup itself changes between them. That's the post's thesis made
 * literal: "MCP doesn't replace APIs, it sits on top of them."
 *
 * The upstream call is a local fixture rather than a live HTTP request so
 * this demo runs deterministically offline — swap `lookupUpstream` for a
 * real `fetch()` against any weather provider and nothing else in this
 * file, or either interface, needs to change.
 */

export interface WeatherResult {
  city: string;
  temperatureC: number;
  condition: string;
  observedAt: string;
}

const FIXTURE_DATA: Record<string, { temperatureC: number; condition: string }> = {
  delhi: { temperatureC: 34, condition: "Haze" },
  london: { temperatureC: 14, condition: "Light rain" },
  "new york": { temperatureC: 21, condition: "Clear" },
  tokyo: { temperatureC: 26, condition: "Partly cloudy" },
  bengaluru: { temperatureC: 24, condition: "Overcast" },
};

/**
 * Stands in for the upstream HTTP call to a real weather provider
 * (e.g. `GET https://api.weatherapi.com/v1/current.json?key=...&q=${city}`,
 * exactly as shown in the post). The API key would be read from an env var
 * here, server-side, in both the real version of this function and in the
 * real version of this demo — it is never passed to, or seen by, either
 * caller (REST client or LLM). That's the "credentials" row of the post's
 * comparison table: the server holds them, the caller/model doesn't.
 */
function lookupUpstream(city: string): { temperatureC: number; condition: string } | undefined {
  void process.env.WEATHER_API_KEY; // would be used here in a real HTTP call
  return FIXTURE_DATA[city.trim().toLowerCase()];
}

export class CityNotFoundError extends Error {
  constructor(city: string) {
    super(`No weather data for "${city}". Try one of: ${Object.keys(FIXTURE_DATA).join(", ")}`);
    this.name = "CityNotFoundError";
  }
}

export function getWeather(city: string): WeatherResult {
  const data = lookupUpstream(city);
  if (!data) {
    throw new CityNotFoundError(city);
  }
  return {
    city,
    temperatureC: data.temperatureC,
    condition: data.condition,
    observedAt: new Date().toISOString(),
  };
}
