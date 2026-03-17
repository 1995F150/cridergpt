

## Plan: Sensor-Powered Features + Weather via GPS + AI Sensor Context

### What phones can actually sense

To set expectations: **no phone has a built-in room temperature sensor** accessible via browser or even Capacitor. Phones have an internal thermometer for battery/CPU protection, but it's not exposed to apps. However, we can get **local weather temperature using GPS coordinates + a free weather API** — which gives the same practical result.

Here's the full picture of what we can add:

| Feature | Source | How |
|---|---|---|
| **Local Temperature / Weather** | GPS → OpenWeatherMap API | Free API, no key needed for basic use |
| **Ambient Light Level** | `AmbientLightSensor` API | Detect brightness (limited browser support) |
| **Proximity Detection** | `ProximitySensor` API | Phone near face/object (very limited support) |
| **Barometric Pressure** | Capacitor native only | Altitude estimation, weather prediction |
| **Magnetometer / Compass** | Already in gyroscope hook | Compass heading via `deviceorientation` alpha |
| **Step Counter / Pedometer** | Capacitor native only | Health/fitness tracking |

### What we'll build

**1. Weather/Temperature card on Sensor Dashboard**
- Use the existing GPS hook to get lat/lng
- Call Open-Meteo API (free, no API key needed) to fetch current temperature, humidity, wind speed, and conditions
- New `useWeather` hook that takes GPS coordinates and returns weather data
- Display as a new card in the Sensor Dashboard

**2. Hook sensor data into CriderGPT AI context**
- Create a `useSensorContext` hook that collects all active sensor data into a summary string
- Inject this as additional context when sending messages to `chat-with-ai`
- CriderGPT can then say things like "I see you're at 38.5°N, it's 72°F outside, your battery is at 45%"
- Update `sendMessageWithAI` in `useChat.ts` to include `sensor_context`
- Update the edge function's system prompt to acknowledge sensor data

**3. Ambient Light Sensor card** (browser support: Chrome on Android)
- New `useAmbientLight` hook using the `AmbientLightSensor` API
- Shows current light level in lux on the dashboard

**4. Add more sensor-driven feature ideas to the dashboard**
- Speed tracker (already have GPS speed) — show a speedometer-style display
- Shake detection from accelerometer — "shake to clear chat" or "shake to get a random fact"
- Compass visualization using gyroscope alpha data

### Files to create/modify

| File | Action |
|---|---|
| `src/hooks/useWeather.ts` | **Create** — fetch weather from Open-Meteo using GPS coords |
| `src/hooks/useSensorContext.ts` | **Create** — aggregate all sensor data for AI context |
| `src/hooks/useSensors.ts` | **Modify** — add `useAmbientLight` hook |
| `src/components/SensorDashboard.tsx` | **Modify** — add Weather card, Light card, speedometer |
| `src/hooks/useChat.ts` | **Modify** — pass sensor context to AI |
| `supabase/functions/chat-with-ai/index.ts` | **Modify** — accept and use sensor_context in system prompt |

### Weather API (no key needed)

```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true
```

Returns temperature in °C (we'll convert to °F), wind speed, and weather code — completely free, no signup.

