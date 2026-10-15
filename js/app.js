//  1. STORAGE KEYS AND DEFAULT SETTINGS

const STORAGE_KEYS = {
  profile: "h2o49ja_profile",
  logs: "h2o49ja_logs"
};

const DEFAULT_GOAL = 2000;

  //  2. SELECT HTML ELEMENTS

const elements = {
  userName: document.getElementById("user-name"),
  profileInitial: document.getElementById("profile-initial"),
  currentDate: document.getElementById("current-date"),

  progressCircle: document.getElementById("progress-circle"),
  progressPercentage: document.getElementById("progress-percentage"),

  waterConsumed: document.getElementById("water-consumed"),
  dailyGoal: document.getElementById("daily-goal"),
  waterRemaining: document.getElementById("water-remaining"),

  waterButtons: document.querySelectorAll("[data-water-amount]"),
  customWaterForm: document.getElementById("custom-water-form"),
  customWaterAmount: document.getElementById("custom-water-amount"),
  waterFeedback: document.getElementById("water-feedback"),

  currentStreak: document.getElementById("current-streak"),
  bestStreak: document.getElementById("best-streak"),
  streakMessage: document.getElementById("streak-message"),
  weeklyCalendar: document.getElementById("weekly-calendar"),

  waterHistory: document.getElementById("water-history"),
  activityCount: document.getElementById("activity-count")
};


/* ==========================================
   3. DATE AND FORMATTING HELPERS
========================================== */

// Get the date using the user's local timezone.
// This avoids using UTC dates for daily tracking.
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// Format numbers with commas.
// Example: 2000 becomes 2,000.
function formatNumber(number) {
  return new Intl.NumberFormat("en-NG").format(number);
}


// Convert a date into a readable format.
function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}


// Format a time such as 10:45 AM.
function formatTime(date) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}


// Get the greeting based on the current local time.
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}


// Create an element safely using textContent.
// This avoids inserting user-provided text as HTML.
function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text;

  return element;
}
  //  4. LOCAL STORAGE FUNCTIONS
function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
      return fallback;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Could not read ${key}:`, error);

    return fallback;
  }
}


function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));

    return true;
  } catch (error) {
    console.error(`Could not save ${key}:`, error);

    return false;
  }
}

  //  5. LOAD PROFILE AND WATER HISTORY
// A profile is created by the onboarding page.
// Until that page is implemented, use safe defaults.

let profile = readStorage(STORAGE_KEYS.profile, {});

let logs = readStorage(STORAGE_KEYS.logs, {});


// Make sure stored values have the expected structure.
if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
  profile = {};
}

if (!logs || typeof logs !== "object" || Array.isArray(logs)) {
  logs = {};
}


// Get the user's configured goal, or use the default.
function getDailyGoal() {
  const goal = Number(profile.dailyGoal);

  if (Number.isFinite(goal) && goal > 0) {
    return Math.round(goal);
  }

  return DEFAULT_GOAL;
}


// Get today's date key.
function getTodayKey() {
  return getLocalDateKey();
}


// Get a day's total water intake.
function getTotalForDay(dateKey) {
  const day = logs[dateKey];

  if (!day || !Array.isArray(day.entries)) {
    return 0;
  }

  return day.entries.reduce((total, entry) => {
    const amount = Number(entry.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return total;
    }

    return total + amount;
  }, 0);
}


// Get today's water entries.
function getTodayEntries() {
  const day = logs[getTodayKey()];

  if (!day || !Array.isArray(day.entries)) {
    return [];
  }

  return day.entries;
}

  //  H2O49ja WEATHER INTEGRATION
  //  Open-Meteo API


async function loadWeather() {
  const profile = readStorage("h2o49ja_profile", {});

  const location = profile.location?.trim();

  const weatherElements = {
    icon: document.getElementById("weather-icon"),
    temperature: document.getElementById("weather-temperature"),
    condition: document.getElementById("weather-condition"),
    location: document.getElementById("weather-location"),
    tip: document.getElementById("weather-tip"),
    updated: document.getElementById("weather-updated")
  };

  // Make sure the weather card exists on this page
  if (!weatherElements.temperature || !weatherElements.location) {
    return;
  }

  if (!location) {
    weatherElements.location.textContent = "Set your location in Settings";
    weatherElements.condition.textContent = "Weather unavailable";
    weatherElements.temperature.textContent = "--°C";
    weatherElements.tip.textContent = 
      "Add your city or town to see local weather.";
    return;
  }

  weatherElements.location.textContent = `Checking ${location}...`;
  weatherElements.condition.textContent = "Loading weather";
  weatherElements.temperature.textContent = "--°C";

  try {
    // Step 1: Convert the user's city into coordinates
    const geocodingURL = new URL(
      "https://geocoding-api.open-meteo.com/v1/search"
    );

    geocodingURL.search = new URLSearchParams({
      name: location,
      count: "10",
      language: "en",
      format: "json"
    });

    const geocodingResponse = await fetch(geocodingURL);

    if (!geocodingResponse.ok) {
      throw new Error("Could not find the location.");
    }

    const geocodingData = await geocodingResponse.json();

    const results = geocodingData.results || [];

    // Prefer a Nigerian result when the city name is ambiguous
    const place =
      results.find((item) => item.country_code === "NG") ||
      results[0];

    if (!place) {
      throw new Error("Location not found. Check your city name.");
    }

    // Step 2: Get current weather for the coordinates
    const weatherURL = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    weatherURL.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day",
      timezone: "auto"
    });

    const weatherResponse = await fetch(weatherURL);

    if (!weatherResponse.ok) {
      throw new Error("Weather service is temporarily unavailable.");
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    if (!current) {
      throw new Error("Current weather data is unavailable.");
    }

    // Translate weather codes into readable conditions
    const conditions = {
      0: ["Clear sky", "☀️"],
      1: ["Mainly clear", "🌤️"],
      2: ["Partly cloudy", "⛅"],
      3: ["Overcast", "☁️"],
      45: ["Foggy", "🌫️"],
      48: ["Foggy", "🌫️"],
      51: ["Light drizzle", "🌦️"],
      53: ["Drizzle", "🌦️"],
      55: ["Heavy drizzle", "🌧️"],
      61: ["Light rain", "🌦️"],
      63: ["Rain", "🌧️"],
      65: ["Heavy rain", "🌧️"],
      71: ["Light snowfall", "🌨️"], 
      73: ["Snowfall", "🌨️"],
      75: ["Heavy snowfall", "❄️"],
      80: ["Rain showers", "🌦️"],
      81: ["Rain showers", "🌧️"],
      82: ["Heavy rain showers", "⛈️"],
      95: ["Thunderstorm", "⛈️"],
      96: ["Thunderstorm with hail", "⛈️"],
      99: ["Thunderstorm with heavy hail", "⛈️"]
    };

    const [condition, icon] = conditions[current.weather_code] ||
      ["Current conditions", "🌤️"];

    const temperature = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);

    weatherElements.temperature.textContent = `${temperature}°C`;
    weatherElements.condition.textContent = condition;
    weatherElements.icon.textContent = icon;

    weatherElements.location.textContent = [
      place.name,
      place.admin1,
      place.country
    ].filter(Boolean).join(", ");

    // Give a simple tip without presenting it as medical advice
    if (temperature >= 32) {
      weatherElements.tip.textContent =
        "It's hot today. Keep water nearby and drink regularly.";
    } else if (temperature >= 27) {
      weatherElements.tip.textContent =
        "It's a warm day. Remember to drink water regularly.";
    } else {
      weatherElements.tip.textContent =
        "Keep up your regular hydration habit throughout the day.";
    }

    if (weatherElements.updated) {
      weatherElements.updated.textContent =
        `Feels like ${feelsLike}°C · Weather updated ${new Date().toLocaleTimeString(
          [],
          { hour: "numeric", minute: "2-digit" }
        )}`;
    }

  } catch (error) {
    console.error("Weather loading failed:", error);

    weatherElements.temperature.textContent = "--°C";
    weatherElements.condition.textContent = "Weather unavailable";
    weatherElements.location.textContent = location;
    weatherElements.tip.textContent =
      "Check your connection or city name, then refresh the page.";
  }
}

// Load weather after the dashboard initializes
loadWeather();


  //  6. DASHBOARD GREETING AND DATE


function renderGreeting() {
  const name =
    typeof profile.name === "string"
      ? profile.name.trim()
      : "";

  const firstName = name ? name.split(/\s+/)[0] : "there";

  elements.userName.textContent = firstName;
  elements.profileInitial.textContent =
    firstName.charAt(0).toUpperCase() || "U";

  // Replace the static greeting without affecting the saved name.
  const heading = elements.userName.parentElement;

  if (heading) {
    heading.firstChild.textContent = `${getGreeting()}, `;
  }

  elements.currentDate.textContent = formatDate(new Date());
}

  //  7. DAILY WATER PROGRESS

function renderHydrationProgress() {
  const goal = getDailyGoal();
  const consumed = getTotalForDay(getTodayKey());

  const remaining = Math.max(0, goal - consumed);

  // Cap visual progress at 100%.
  // The actual consumed amount may exceed the goal.
  const percentage = Math.min(
    100,
    Math.round((consumed / goal) * 100)
  );

  elements.waterConsumed.textContent = formatNumber(consumed);
  elements.dailyGoal.textContent = formatNumber(goal);
  elements.waterRemaining.textContent = formatNumber(remaining);

  elements.progressPercentage.textContent = `${percentage}%`;

  elements.progressCircle.style.setProperty(
    "--progress",
    `${percentage}%`
  );

  elements.progressCircle.setAttribute(
    "aria-valuenow",
    percentage
  );

  // Update the feedback text for the daily goal.
  if (consumed >= goal) {
    elements.waterFeedback.textContent =
      "Daily goal reached! Great job staying consistent.";
  } else {
    elements.waterFeedback.textContent = "";
  }
}

  //  8. SAVE A WATER ENTRY
function addWater(amount) {
  const waterAmount = Number(amount);

  // Validate the amount before saving it.
  if (
    !Number.isFinite(waterAmount) ||
    !Number.isInteger(waterAmount) ||
    waterAmount < 1 ||
    waterAmount > 5000
  ) {
    elements.waterFeedback.textContent =
      "Enter a whole number between 1 and 5,000 ml.";

    return;
  }

  const today = getTodayKey();

  // Create today's record when necessary.
  if (!logs[today] || !Array.isArray(logs[today].entries)) {
    logs[today] = {
      entries: [],
      goal: getDailyGoal()
    };
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: waterAmount,
    timestamp: new Date().toISOString()
  };

  logs[today].entries.push(entry);

  // Save before updating the visible dashboard.
  if (!writeStorage(STORAGE_KEYS.logs, logs)) {
    // Roll back the in-memory entry if saving failed.
    logs[today].entries.pop();

    elements.waterFeedback.textContent =
      "Unable to save your water entry. Check your browser storage.";

    return;
  }

  elements.waterFeedback.textContent =
    `${formatNumber(waterAmount)} ml added successfully.`;

  // Clear the custom amount field.
  elements.customWaterAmount.value = "";

  // Refresh all affected dashboard sections.
  renderHydrationProgress();
  renderRecentActivity();
  renderStreaks();
  renderWeeklyCalendar();
}

  //  9. QUICK-ADD BUTTONS

elements.waterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const amount = Number(button.dataset.waterAmount);

    addWater(amount);
  });
});

  //  10. CUSTOM WATER FORM

elements.customWaterForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(elements.customWaterAmount.value);

  addWater(amount);
});

  //  11. RECENT WATER ACTIVITY
function renderRecentActivity() {
  const entries = getTodayEntries();

  // Newest entries should appear first.
  const sortedEntries = [...entries].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  elements.waterHistory.replaceChildren();

  elements.activityCount.textContent =
    `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  // Display a friendly empty state when there are no entries.
  if (sortedEntries.length === 0) {
    const emptyState = createElement("div", "empty-state");

    emptyState.append(
      createElement("span", "", "💧"),
      createElement("p", "", "No water logged yet today."),
      createElement("p", "", "Your water entries will appear here.")
    );

    elements.waterHistory.appendChild(emptyState);

    return;
  }

  const list = createElement("div", "water-history-list");

  sortedEntries.forEach((entry) => {
    const row = createElement("div", "water-entry");

    const icon = createElement("span", "water-entry-icon", "💧");
    icon.setAttribute("aria-hidden", "true");

    const details = createElement("div", "water-entry-details");

    const title = createElement(
      "p",
      "",
      `${formatNumber(entry.amount)} ml of water`
    );

    const timestamp = new Date(entry.timestamp);

    const timeText = createElement(
      "p",
      "",
      Number.isNaN(timestamp.getTime())
        ? "Time unavailable"
        : formatTime(timestamp)
    );

    const amount = createElement(
      "span",
      "water-entry-amount",
      `+${formatNumber(entry.amount)} ml`
    );

    details.append(title, timeText);
    row.append(icon, details, amount);
    list.appendChild(row);
  });

  elements.waterHistory.appendChild(list);
}

  //  12. STREAK CALCULATIONS

// Convert YYYY-MM-DD into a UTC day number.
// Using UTC day numbers avoids daylight-saving
// and 23/25-hour day calculation errors.
function dateKeyToDayNumber(dateKey) {
  const parts = dateKey.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return NaN;
  }

  return Math.floor(
    Date.UTC(parts[0], parts[1] - 1, parts[2]) /
      86400000
  );
}


// Determine whether a day reached its recorded goal.
function didCompleteGoal(dateKey) {
  const day = logs[dateKey];

  if (!day || !Array.isArray(day.entries)) {
    return false;
  }

  const consumed = getTotalForDay(dateKey);

  // Use the goal recorded for that day where available.
  // This helps preserve historical completion if a
  // user's daily goal changes later.
  const savedGoal = Number(day.goal);

  const goal =
    Number.isFinite(savedGoal) && savedGoal > 0
      ? savedGoal
      : getDailyGoal();

  return consumed >= goal;
}


// Get all completed dates in chronological order.
function getCompletedDayNumbers() {
  return Object.keys(logs)
    .filter(didCompleteGoal)
    .map(dateKeyToDayNumber)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}


// Calculate the longest consecutive completed streak.
function calculateBestStreak() {
  const completedDays = getCompletedDayNumbers();

  if (completedDays.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let i = 1; i < completedDays.length; i++) {
    const difference = completedDays[i] - completedDays[i - 1];

    if (difference === 1) {
      current++;
    } else if (difference > 1) {
      current = 1;
    } else {
      continue;
    }

    best = Math.max(best, current);
  }

  return best;
}


// Calculate the current streak.
// If today's goal is incomplete, yesterday's streak
// remains active until today ends.
function calculateCurrentStreak() {
  const today = getTodayKey();
  const todayNumber = dateKeyToDayNumber(today);

  const startDate = didCompleteGoal(today)
    ? todayNumber
    : todayNumber - 1;

  const completedDays = new Set(getCompletedDayNumbers());

  let streak = 0;
  let dateNumber = startDate;

  while (completedDays.has(dateNumber)) {
    streak++;
    dateNumber--;
  }

  return streak;
}
  //  13. DISPLAY STREAKS
function renderStreaks() {
  const current = calculateCurrentStreak();
  const best = calculateBestStreak();

  elements.currentStreak.textContent = current;
  elements.bestStreak.textContent = best;

  if (didCompleteGoal(getTodayKey())) {
    elements.streakMessage.textContent =
      "Today's goal is complete. Keep the habit going!";
  } else if (current > 0) {
    elements.streakMessage.textContent =
      "Your streak is still alive. Reach today's goal to continue it!";
  } else {
    elements.streakMessage.textContent =
      "Reach your daily goal to start your streak.";
  }
}
//    14. WEEKLY HYDRATION CALENDAR
function renderWeeklyCalendar() {
  elements.weeklyCalendar.replaceChildren();

  const today = new Date();

  // Find Monday of the current week.
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const dayOfWeek = monday.getDay();

  const daysSinceMonday = (dayOfWeek + 6) % 7;

  monday.setDate(monday.getDate() - daysSinceMonday);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);

    date.setDate(monday.getDate() + i);

    const dateKey = getLocalDateKey(date);
    const isToday = dateKey === getTodayKey();
    const completed = didCompleteGoal(dateKey);

    const day = createElement("div", "calendar-day");

    if (isToday) {
      day.classList.add("today");
    }

    if (completed) {
      day.classList.add("completed");
    }

    const dayName = createElement(
      "span",
      "calendar-day-name",
      dayNames[i]
    );

    const dayNumber = createElement(
      "span",
      "calendar-day-number",
      String(date.getDate())
    );

    day.setAttribute(
      "aria-label",
      `${dayNames[i]} ${date.getDate()}${
        completed ? ", daily goal completed" : ""
      }${isToday ? ", today" : ""}`
    );

    day.append(dayName, dayNumber);

    elements.weeklyCalendar.appendChild(day);
  }
}
//    15. CHECK PROFILE STATUS
function checkProfile() {
  const hasName =
    typeof profile.name === "string" &&
    profile.name.trim().length > 0;

  if (!hasName) {
    elements.userName.textContent = "there";
    elements.profileInitial.textContent = "U";

    // Onboarding page will be connected when
    // we implement the registration workflow.
    return;
  }

  renderGreeting();
}

//    16. INITIALIZE THE DASHBOARD
function initializeDashboard() {
  checkProfile();

  renderHydrationProgress();
  renderRecentActivity();
  renderStreaks();
  renderWeeklyCalendar();
}

// Start the dashboard.
initializeDashboard();


if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker
    .register("../service-worker.js")
    .then((registration)=>{
      console.log("H2049ja Service Worker Registered", registration.scope)
    })
    .catch ((error)=>{
      console.error("H2049ja Registration failed", error)

    })
      
    
    
  })



}