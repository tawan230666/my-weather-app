// OpenWeatherMap free-tier key. It is visible to anyone using a static site,
// so it is limited to the free plan. A production app would call the API
// through its own backend instead.
const apiKey = '5d842ba0a15630b65e9421fe07cd1ebe';
const HISTORY_KEY = 'weather-search-history';
const searchForm = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const weatherInfoContainer = document.querySelector('#weather-info-container');
const forecastContainer = document.querySelector('#forecast-container');
const forecastGrid = document.querySelector('#forecast-grid');
const searchHistory = document.querySelector('#search-history');

// Search history (last 5 cities), kept between visits when storage is available
let searchHistoryData = loadHistory();

function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(saved) ? saved.slice(0, 5) : [];
    } catch (_) {
        return [];
    }
}

function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistoryData)); } catch (_) {}
}

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const cityName = cityInput.value.trim();

    if (cityName) {
        getWeather(cityName);
        addToSearchHistory(cityName);
    } else {
        alert('กรุณาป้อนชื่อเมือง');
    }
});

// Show/hide search history
cityInput.addEventListener('focus', showSearchHistory);
cityInput.addEventListener('blur', () => {
    setTimeout(hideSearchHistory, 200);
});

cityInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
        showSearchHistory();
    } else {
        hideSearchHistory();
    }
});

async function getWeather(city) {
    weatherInfoContainer.innerHTML = `<p>กำลังโหลดข้อมูล... <span class="loading"></span></p>`;
    forecastContainer.style.display = 'none';

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=th`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('ไม่พบข้อมูลเมืองนี้');
        }
        const data = await response.json();
        displayWeather(data);
        getForecast(city);
        updateBackground(data);
    } catch (error) {
        weatherInfoContainer.innerHTML = `<p class="error">${error.message}</p>`;
        forecastContainer.style.display = 'none';
    }
}

async function getForecast(city) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=th`;

    try {
        const response = await fetch(forecastUrl);
        if (!response.ok) throw new Error('ไม่สามารถโหลดพยากรณ์อากาศได้');

        const data = await response.json();
        displayForecast(data);
    } catch (error) {
        console.error('Forecast error:', error);
    }
}

function displayWeather(data) {
    const { name, main, weather, wind } = data;
    const { temp, humidity, feels_like } = main;
    const { description, icon } = weather[0];
    const windSpeed = wind ? wind.speed : 0;

    const weatherHtml = `
                <h2>${name}</h2>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
                <p class="temp">${temp.toFixed(1)}°C</p>
                <p>${description}</p>
                <p>รู้สึกเหมือน: ${feels_like.toFixed(1)}°C</p>
                <p>ความชื้น: ${humidity}%</p>
                <p>ความเร็วลม: ${windSpeed.toFixed(1)} m/s</p>
            `;
    weatherInfoContainer.innerHTML = weatherHtml;
}

function displayForecast(data) {
    // The API returns 3-hour steps; keep one reading per day, closest to midday
    const byDay = new Map();
    data.list.forEach(item => {
        const day = item.dt_txt.slice(0, 10);
        const hour = Number(item.dt_txt.slice(11, 13));
        const current = byDay.get(day);
        if (!current || Math.abs(hour - 12) < Math.abs(Number(current.dt_txt.slice(11, 13)) - 12)) {
            byDay.set(day, item);
        }
    });
    const forecasts = [...byDay.values()].slice(0, 5);

    let forecastHtml = '';
    forecasts.forEach((forecast, index) => {
        const date = new Date(forecast.dt * 1000);
        const dayName = index === 0 ? 'วันนี้' : date.toLocaleDateString('th-TH', { weekday: 'short' });
        const temp = forecast.main.temp.toFixed(1);
        const icon = forecast.weather[0].icon;
        const description = forecast.weather[0].description;

        forecastHtml += `
                    <div class="forecast-item">
                        <div class="forecast-day">${dayName}</div>
                        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}">
                        <div class="forecast-temp">${temp}°C</div>
                        <div class="forecast-desc">${description}</div>
                    </div>
                `;
    });

    forecastGrid.innerHTML = forecastHtml;
    forecastContainer.style.display = 'block';
}

function updateBackground(data) {
    const now = new Date();
    const hour = now.getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    const temp = data.main.temp;
    const weatherMain = data.weather[0].main.toLowerCase();

    document.body.className = '';

    if (weatherMain.includes('rain')) {
        document.body.classList.add('rainy');
    } else if (weatherMain.includes('snow')) {
        document.body.classList.add('snowy');
    } else if (weatherMain.includes('cloud')) {
        document.body.classList.add(isDaytime ? 'cloudy-day' : 'cloudy-night');
    } else if (weatherMain.includes('clear')) {
        document.body.classList.add(isDaytime ? 'sunny-day' : 'sunny-night');
    }

    if (temp > 35) {
        document.body.classList.add('hot');
    } else if (temp < 10) {
        document.body.classList.add('cold');
    }
}

function addToSearchHistory(city) {
    searchHistoryData = searchHistoryData.filter(item => item.toLowerCase() !== city.toLowerCase());
    searchHistoryData.unshift(city);
    searchHistoryData = searchHistoryData.slice(0, 5);
    saveHistory();
}

function showSearchHistory() {
    if (searchHistoryData.length === 0) {
        searchHistory.style.display = 'none';
        return;
    }

    const query = cityInput.value.toLowerCase();
    const matches = searchHistoryData.filter(city => city.toLowerCase().includes(query));

    searchHistory.replaceChildren();
    if (matches.length === 0) {
        searchHistory.style.display = 'none';
        return;
    }

    // Build items with textContent so a saved city name can never inject HTML
    matches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'search-history-item';
        item.textContent = city;
        item.addEventListener('mousedown', () => selectHistoryItem(city));
        searchHistory.appendChild(item);
    });
    searchHistory.style.display = 'block';
}

function hideSearchHistory() {
    searchHistory.style.display = 'none';
}

function selectHistoryItem(city) {
    cityInput.value = city;
    hideSearchHistory();
    getWeather(city);
}

// Close search history when clicking outside
document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
        hideSearchHistory();
    }
});

// Default weather display
window.addEventListener('DOMContentLoaded', () => {
    // You can set a default city here if desired
    // getWeather('Bangkok');
});