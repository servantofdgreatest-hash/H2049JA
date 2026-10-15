"use strict";


// H2O49ja SETTINGS
const PROFILE_KEY = "h2o49ja_profile";
const LOGS_KEY = "h2o49ja_logs";
const REMINDER_KEY = "h2o49ja_reminder_settings";

// Profile form elements
const profileForm = document.getElementById("settings-profile-form");
const nameInput = document.getElementById("settings-name");
const ageInput = document.getElementById("settings-age");
const genderInput = document.getElementById("settings-gender");
const locationInput = document.getElementById("settings-location");
const profileFeedback = document.getElementById("profile-feedback");

// Goal form elements
const goalForm = document.getElementById("settings-goal-form");
const goalInput = document.getElementById("settings-goal");
const goalFeedback = document.getElementById("goal-feedback");

// Reminder form elements
const reminderForm = document.getElementById("settings-reminder-form");
const remindersEnabled = document.getElementById("reminders-enabled");
const reminderStart = document.getElementById("reminder-start");
const reminderEnd = document.getElementById("reminder-end");
const reminderFeedback = document.getElementById("reminder-feedback");

// Other elements
const exportButton = document.getElementById("export-data-button");


// STORAGE HELPERS
function readStorage(key, fallback) {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallback;
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


// LOAD SAVED SETTINGS


function loadSettings() {
  const profile = readStorage(PROFILE_KEY, {});
  const reminders = readStorage(REMINDER_KEY, {
    enabled: false,
    startTime: "09:00",
    endTime: "21:00"
  });

  nameInput.value = profile.name || "";
  ageInput.value = profile.age || "";
  genderInput.value = profile.gender || "prefer-not-to-say";
  locationInput.value = profile.location || "";

  goalInput.value = profile.dailyGoal || 2000;

  remindersEnabled.checked = Boolean(reminders.enabled);
  reminderStart.value = reminders.startTime || "09:00";
  reminderEnd.value = reminders.endTime || "21:00";
}

// =====================================
// SAVE PROFILE
// =====================================

profileForm.addEventListener("submit", function (event) {
  event.preventDefault();
  profileFeedback.textContent = "";

  const name = nameInput.value.trim();
  const age = Number(ageInput.value);
  const gender = genderInput.value;
  const location = locationInput.value.trim();

  if (!name || !location || !gender) {
    profileFeedback.textContent =
      "Please complete all the required fields.";
    return;
  }

  if (!Number.isInteger(age) || age < 1 || age > 120) {
    profileFeedback.textContent =
      "Please enter a valid age between 1 and 120.";
    return;
  }

  try {
    const existingProfile = readStorage(PROFILE_KEY, {});

    const updatedProfile = {
      ...existingProfile,
      name,
      age,
      gender,
      location,
      updatedAt: new Date().toISOString()
    };

    saveStorage(PROFILE_KEY, updatedProfile);

    profileFeedback.textContent =
      "Your profile has been saved successfully.";
  } catch (error) {
    console.error("Profile save failed:", error);

    profileFeedback.textContent =
      "Could not save your profile. Check your browser storage.";
  }
});

// =====================================
// SAVE DAILY WATER GOAL
// =====================================

goalForm.addEventListener("submit", function (event) {
  event.preventDefault();
  goalFeedback.textContent = "";

  const dailyGoal = Number(goalInput.value);

  if (
    !Number.isInteger(dailyGoal) ||
    dailyGoal < 250 ||
    dailyGoal > 10000
  ) {
    goalFeedback.textContent =
      "Enter a whole-number goal between 250 and 10,000 ml.";
    return;
  }

  try {
    const existingProfile = readStorage(PROFILE_KEY, {});

    saveStorage(PROFILE_KEY, {
      ...existingProfile,
      dailyGoal,
      updatedAt: new Date().toISOString()
    });

    goalFeedback.textContent =
      "Your daily water goal has been updated.";
  } catch (error) {
    console.error("Goal save failed:", error);

    goalFeedback.textContent =
      "Could not save your goal. Check your browser storage.";
  }
});

// =====================================
// SAVE REMINDER PREFERENCES
// =====================================

reminderForm.addEventListener("submit", function (event) {
  event.preventDefault();
  reminderFeedback.textContent = "";

  const startTime = reminderStart.value;
  const endTime = reminderEnd.value;

  if (!startTime || !endTime) {
    reminderFeedback.textContent =
      "Please select both reminder times.";
    return;
  }

  if (startTime >= endTime) {
    reminderFeedback.textContent =
      "The end time must be later than the start time.";
    return;
  }

  const preferences = {
    enabled: remindersEnabled.checked,
    startTime,
    endTime,
    updatedAt: new Date().toISOString()
  };

  try {
    saveStorage(REMINDER_KEY, preferences);

    reminderFeedback.textContent = remindersEnabled.checked
      ? "Reminder preferences saved. Notifications are not active yet."
      : "Reminder preferences saved. Reminders are switched off.";
  } catch (error) {
    console.error("Reminder settings save failed:", error);

    reminderFeedback.textContent =
      "Could not save reminder preferences.";
  }
});

// =====================================
// EXPORT USER DATA
// =====================================

exportButton.addEventListener("click", function () {
  try {
    const exportData = {
      app: "H2O49ja",
      exportedAt: new Date().toISOString(),
      profile: readStorage(PROFILE_KEY, {}),
      hydrationHistory: readStorage(LOGS_KEY, {}),
      reminderPreferences: readStorage(REMINDER_KEY, {
        enabled: false,
        startTime: "09:00",
        endTime: "21:00"
      })
    };

    const file = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json" }
    );

    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "h2o49ja-my-data.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Data export failed:", error);

    alert("Could not export your data. Please try again.");
  }
});

// =====================================
// INITIALIZE SETTINGS
// =====================================

loadSettings();