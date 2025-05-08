// Städte suchen
async function searchCities() {
    const searchInput = document.getElementById("citySearch").value.trim();
    const cityResults = document.getElementById("cityResults");
  
    if (searchInput.length < 2) {
      cityResults.innerHTML = "";
      return;
    }
  
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchInput)}&count=10&language=de&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geocoding API-Fehler: Status ${response.status}`);
      const data = await response.json();
  
      if (!data.results || data.results.length === 0) {
        cityResults.innerHTML = "<li class='list-group-item'>Keine Städte gefunden</li>";
        return;
      }
  
      cityResults.innerHTML = data.results.map(city => `
        <li class="list-group-item" onclick="selectCity(${city.latitude}, ${city.longitude}, '${city.timezone}', '${city.name}')">
          ${city.name}, ${city.country || ""}
        </li>
      `).join("");
    } catch (err) {
      cityResults.innerHTML = `<li class="list-group-item">Fehler: ${err.message}</li>`;
      console.error("Geocoding-Fehler:", err);
    }
  }
  
  // Stadt auswählen
  function selectCity(lat, lon, timezone, cityName) {
    document.getElementById("citySearch").value = cityName;
    document.getElementById("cityResults").innerHTML = "";
    getWeather(lat, lon, timezone, cityName);
  }
  
  // Wetter abrufen
  async function getWeather(lat, lon, timezone, cityName) {
    const weatherDiv = document.getElementById("weather");
    const activityDiv = document.getElementById("activity");
  
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=temperature_2m,weathercode,wind_gusts_10m,relativehumidity_2m,precipitation_probability&current_weather=true&timezone=${timezone}`;
      console.log("API-URL:", url); // Debugging
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API-Fehler: Status ${response.status} - ${await response.text()}`);
      const data = await response.json();
      console.log("API-Daten:", data); // Debugging
  
      const current = data.current_weather;
      const hourly = data.hourly;
      const daily = data.daily;
  
      const weatherCodeToInfo = (code, isDay) => {
        const dayNight = isDay ? "day" : "night";
        const icons = {
          0: { text: "Klar", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/113.png`, bgClass: "clear" },
          1: { text: "Teilweise bewölkt", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/116.png`, bgClass: "cloudy" },
          2: { text: "Bewölkt", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/119.png`, bgClass: "cloudy" },
          3: { text: "Bedeckt", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/122.png`, bgClass: "cloudy" },
          45: { text: "Nebel", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/143.png`, bgClass: "fog" },
          61: { text: "Leichter Regen", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/353.png`, bgClass: "rain" },
          63: { text: "Regen", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/308.png`, bgClass: "rain" },
          65: { text: "Starker Regen", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/311.png`, bgClass: "rain" },
          71: { text: "Leichter Schnee", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/326.png`, bgClass: "snow" },
          73: { text: "Schnee", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/329.png`, bgClass: "snow" },
          75: { text: "Starker Schnee", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/332.png`, bgClass: "snow" },
        };
        return icons[code] || { text: "Unbekannt", icon: `https://cdn.weatherapi.com/weather/64x64/${dayNight}/113.png`, bgClass: "clear" };
      };
  
      const info = weatherCodeToInfo(current.weathercode, current.is_day);
  
      // Dynamische Hintergrundfarbe anpassen
      if (current.temperature > 25) {
        document.body.style.background = "linear-gradient(to bottom, #2980B9, #1F618D)"; // Dunkleres Hellblau für heiß
      } else if ([1, 2, 3].includes(current.weathercode)) {
        document.body.style.background = "linear-gradient(to bottom, #7F8C8D, #5D6D7E)"; // Dunkleres Grau für bewölkt
      } else if (info.bgClass === "rain") {
        document.body.style.background = "linear-gradient(to bottom, #2E4057, #1A252F)"; // Dunkleres Blau-Grün für Regen
      } else if (info.bgClass === "snow") {
        document.body.style.background = "linear-gradient(to bottom, #A9B7B7, #839192)"; // Dunkleres Weiß-Grau für Schnee
      } else if (info.bgClass === "fog") {
        document.body.style.background = "linear-gradient(to bottom, #839192, #5D6D7E)"; // Dunkleres Grau für Nebel
      } else {
        document.body.style.background = "linear-gradient(to bottom, #2980B9, #1F618D)"; // Standard: Dunkles Blau
      }
  
      const now = new Date();
      const currentHourIndex = hourly.time.findIndex(t => {
        const hourTime = new Date(t);
        return hourTime.getUTCHours() === now.getUTCHours() && hourTime.getUTCDate() === now.getUTCDate();
      });
  
      if (currentHourIndex === -1) {
        throw new Error("Aktuelle Stunde nicht in den stündlichen Daten gefunden");
      }
  
      weatherDiv.innerHTML = `
        <div class="card-body">
          <div class="current-weather text-center">
            <h2 class="card-title">${cityName}</h2>
            <p class="temperature">${Math.round(current.temperature)}°</p>
            <p class="condition">${info.text}</p>
            <p>H: ${Math.round(daily.temperature_2m_max[0])}° T: ${Math.round(daily.temperature_2m_min[0])}°</p>
          </div>
          <p class="weather-description text-center">
            ${info.text} den ganzen Tag. Windböen bis ${current.windgusts_10m || 'N/A'} km/h.
          </p>
          <div class="weather-details">
            <p>Luftfeuchtigkeit: ${hourly.relativehumidity_2m[currentHourIndex] || 'N/A'}%</p>
            <p>Niederschlag: ${hourly.precipitation_probability[currentHourIndex] || 'N/A'}%</p>
          </div>
          <h3>Stündlich</h3>
          <div class="hourly-forecast">
            ${hourly.time.slice(currentHourIndex, currentHourIndex + 6).map((t, i) => {
              const w = weatherCodeToInfo(hourly.weathercode[currentHourIndex + i], current.is_day);
              const hour = new Date(t).getHours();
              return `
                <div class="hour">
                  <p>${i === 0 ? "Jetzt" : `${hour} Uhr`}</p>
                  <img src="${w.icon}" alt="${w.text}">
                  <p>${Math.round(hourly.temperature_2m[currentHourIndex + i])}°</p>
                </div>
              `;
            }).join("")}
          </div>
          <h3>Wochenvorhersage</h3>
          <div class="daily-forecast">
            ${daily.time.slice(0, 4).map((t, i) => {
              const d = new Date(t);
              const w = weatherCodeToInfo(daily.weathercode[i], 1);
              const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
              const name = i === 0 ? "Heute" : days[d.getDay()];
              return `
                <div class="day">
                  <p>${name}</p>
                  <img src="${w.icon}" alt="${w.text}">
                  <p>${Math.round(daily.temperature_2m_min[i])}°</p>
                  <div class="temp-bar" style="width: ${(daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) * 5}px;"></div>
                  <p>${Math.round(daily.temperature_2m_max[i])}°</p>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
  
      activityDiv.innerHTML = `
        <div class="card-body">
          <p class="card-text text-center">Vorschlag: ${suggestActivity(info.text)}</p>
        </div>
      `;
    } catch (err) {
      weatherDiv.innerHTML = `<div class="card-body"><p class="card-text text-center">Fehler: ${err.message}</p></div>`;
      console.error("Wetterfehler:", err);
    }
  }
  
  function suggestActivity(weather) {
    if (weather.includes("Regen") || weather.includes("Schnee")) return "Besuche ein Museum oder Café.";
    if (weather.includes("Klar") || weather.includes("Teilweise")) return "Geh spazieren oder picknicken.";
    return "Probiere etwas Neues!";
  }