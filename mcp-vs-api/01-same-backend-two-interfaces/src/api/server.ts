/**
 * Plain REST interface over weatherService — "a contract: a set of HTTP
 * endpoints, request/response shapes, and auth mechanisms," as the post
 * puts it. The caller is a human developer who read this file (or docs
 * generated from it) and writes deterministic code against a known URL.
 *
 * Try it:
 *   npm run build && npm run api
 *   curl "http://localhost:3000/weather?city=Delhi"
 */

import express from "express";
import { CityNotFoundError, getWeather } from "../service/weatherService.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/weather", (req, res) => {
  const city = req.query.city;
  if (typeof city !== "string" || city.trim() === "") {
    res.status(400).json({ error: "Query parameter 'city' is required." });
    return;
  }

  try {
    res.json(getWeather(city));
  } catch (error) {
    if (error instanceof CityNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Unexpected server error." });
  }
});

app.listen(PORT, () => {
  console.log(`REST weather API listening on http://localhost:${PORT}`);
  console.log(`Try: curl "http://localhost:${PORT}/weather?city=Delhi"`);
});
