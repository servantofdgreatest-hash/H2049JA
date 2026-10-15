"use strict";

// H2O49ja History Page

const LOGS_KEY = "h2o49ja_logs";
const PROFILE_KEY = "h2o49ja_profile";

// Get page elements
const elements = {
  todayTotal: document.getElementById("history-today-total"),
  dailyGoal: document.getElementById("history-daily-goal"),
  goalsCompleted: document.getElementById("history-goals-completed"),
  completionCaption: document.getElementById("history-completion-caption"),

  dateInput: document.getElementById("history-date"),
  previousButton: document.getElementById("previous-day"),
  nextButton: document.getElementById("next-day"),

  selectedTotal: document.getElementById("selected-day-total"),
  selectedGoal: document.getElementById("selected-day-goal"),
  progress: document.getElementById("history-progress"),
  progressFill: document.getElementById("history-progress-fill"),
  status: document.getElementById("selected-day-status"),

  entryCount: document.getElementById("history-entry-count"),
  entriesContainer: document.getElementById("history-entries")
};

// Use the same date format as the dashboard.
// This uses local time rather than UTC.
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Read saved data safely
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function getLogs() {
  return readStorage(LOGS_KEY, {});
}

function getProfile() {
  return readStorage(PROFILE_KEY, {});
}

function getCurrentGoal() {
  const goal = Number(getProfile().dailyGoal);
  return Number.isFinite(goal) && goal > 0 ? goal : 2000;
}

function getDayGoal(day) {
  const savedGoal = Number(day?.goal);

  return Number.isFinite(savedGoal) && savedGoal > 0
    ? savedGoal
    : getCurrentGoal();
}

function getDayTotal(day) {
  if (!Array.isArray(day?.entries)) return 0;

  return day.entries.reduce((total, entry) => {
    const amount = Number(entry.amount);

    return total + (
      Number.isFinite(amount) && amount > 0 ? amount : 0
    );
  }, 0);
}

function formatWater(amount) {
  return `${Math.round(amount).toLocaleString()} ml`;
}

function getAllCompletedDays() {
  const logs = getLogs();

  return Object.values(logs).filter((day) => {
    const goal = getDayGoal(day);
    return getDayTotal(day) >= goal;
  }).length;
}

// Summary cards
function renderSummary() {
  const logs = getLogs();
  const todayKey = getLocalDateKey();
  const today = logs[todayKey];

  elements.todayTotal.textContent = formatWater(getDayTotal(today));
  elements.dailyGoal.textContent = formatWater(getCurrentGoal());

  const completedDays = getAllCompletedDays();

  elements.goalsCompleted.textContent =
    `${completedDays} ${completedDays === 1 ? "day" : "days"}`;

  elements.completionCaption.textContent =
    completedDays === 0
      ? "Keep logging to build your record"
      : "Daily goals reached in your saved records";
}

// Format a date for a friendly message
function formatDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);

  return date.toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// Render one water entry safely
function createEntryElement(entry) {
  const item = document.createElement("article");
  item.className = "history-entry";

  const icon = document.createElement("div");
  icon.className = "history-entry-icon";
  icon.textContent = "💧";
  icon.setAttribute("aria-hidden", "true");

  const info = document.createElement("div");
  info.className = "history-entry-info";

  const title = document.createElement("h4");
  title.textContent = "Water intake";

  const time = document.createElement("p");

  const timestamp = new Date(entry.timestamp);

  time.textContent = Number.isNaN(timestamp.getTime())
    ? "Time unavailable"
    : timestamp.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });

  const amount = document.createElement("span");
  amount.className = "history-entry-amount";
  amount.textContent = `+${formatWater(Number(entry.amount) || 0)}`;

  info.append(title, time);
  item.append(icon, info, amount);

  return item;
}

// Empty state
function renderEmptyState(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "history-empty-state";

  const icon = document.createElement("div");
  icon.className = "history-empty-icon";
  icon.textContent = "💧";

  const title = document.createElement("h3");
  title.textContent = "No water entries yet";

  const description = document.createElement("p");
  description.textContent = message;

  wrapper.append(icon, title, description);

  elements.entriesContainer.replaceChildren(wrapper);
}

// Render the selected date
function renderSelectedDay() {
  const dateKey = elements.dateInput.value;
  const logs = getLogs();
  const day = logs[dateKey];
  const total = getDayTotal(day);
  const goal = getDayGoal(day);

  const percentage = Math.round((total / goal) * 100);
  const safePercentage = Math.min(percentage, 100);

  elements.selectedTotal.textContent = formatWater(total);
  elements.selectedGoal.textContent = formatWater(goal);

  elements.progressFill.style.width = `${safePercentage}%`;
  elements.progress.setAttribute("aria-valuenow", safePercentage);
  elements.progress.setAttribute(
    "aria-valuetext",
    `${percentage}% of daily goal`
  );

  if (total >= goal) {
    elements.status.textContent =
      `Daily goal reached! You've logged ${percentage}% of your target.`;
  } else if (total > 0) {
    elements.status.textContent =
      `${formatWater(goal - total)} remaining to reach your daily goal.`;
  } else {
    elements.status.textContent =
      "No water logged for this date yet.";
  }

  // Display the water entries
  const entries = Array.isArray(day?.entries)
    ? [...day.entries].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      })
    : [];

  elements.entryCount.textContent =
    `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  if (entries.length === 0) {
    renderEmptyState(
      dateKey === getLocalDateKey()
        ? "Water you log today will appear here."
        : "There are no saved water entries for this date."
    );
  } else {
    const entryElements = entries.map(createEntryElement);
    elements.entriesContainer.replaceChildren(...entryElements);
  }

  // Prevent navigating into the future
  const todayKey = getLocalDateKey();

  elements.dateInput.max = todayKey;
  elements.nextButton.disabled = dateKey >= todayKey;

  elements.previousButton.disabled = false;
}

// Date navigation
function changeSelectedDate(days) {
  const currentDate = new Date(
    `${elements.dateInput.value}T12:00:00`
  );

  currentDate.setDate(currentDate.getDate() + days);

  const newDateKey = getLocalDateKey(currentDate);

  if (newDateKey > getLocalDateKey()) return;

  elements.dateInput.value = newDateKey;
  renderSelectedDay();
}

elements.dateInput.addEventListener("change", () => {
  if (!elements.dateInput.value) {
    elements.dateInput.value = getLocalDateKey();
  }

  if (elements.dateInput.value > getLocalDateKey()) {
    elements.dateInput.value = getLocalDateKey();
  }

  renderSelectedDay();
});

elements.previousButton.addEventListener("click", () => {
  changeSelectedDate(-1);
});

elements.nextButton.addEventListener("click", () => {
  changeSelectedDate(1);
});

// Initialize the history page
function initializeHistory() {
  const todayKey = getLocalDateKey();

  elements.dateInput.max = todayKey;
  elements.dateInput.value = todayKey;

  renderSummary();
  renderSelectedDay();
}

initializeHistory();