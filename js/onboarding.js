"use strict";

// Get the onboarding form and its elements
const onboardingForm = document.getElementById("onboarding-form");
const feedback = document.getElementById("onboarding-feedback");

const nameInput = document.getElementById("full-name");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const locationInput = document.getElementById("location");

// Profile storage key shared across the app
const PROFILE_KEY = "h2o49ja_profile";

// Estimate a starting goal based on age.
// This is a simple app estimate, not medical advice.
function estimateDailyGoal(age) {
  if (age < 14) return 1600;
  if (age < 18) return 1800;
  return 2000;
}

// Load an existing profile if one is already saved
function loadExistingProfile() {
  try {
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    if (!savedProfile) return;

    const profile = JSON.parse(savedProfile);

    nameInput.value = profile.name || "";
    ageInput.value = profile.age || "";
    genderInput.value = profile.gender || "";
    locationInput.value = profile.location || "";
  } catch (error) {
    console.error("Could not load the saved profile:", error);
  }
}

// Save the profile when the form is submitted
onboardingForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const age = Number(ageInput.value);
  const gender = genderInput.value;
  const location = locationInput.value.trim();

  // Basic validation
  if (!name || !location || !gender || !age) {
    feedback.textContent = "Please complete all the required fields.";
    return;
  }

  if (!Number.isInteger(age) || age < 1 || age > 120) {
    feedback.textContent = "Please enter a valid age.";
    return;
  }

  try {
    // Keep the existing goal if the user is updating their profile.
    let existingProfile = {};

    try {
      existingProfile = JSON.parse(
        localStorage.getItem(PROFILE_KEY) || "{}"
      );
    } catch {
      existingProfile = {};
    }

    const dailyGoal =
      existingProfile.dailyGoal || estimateDailyGoal(age);

    const profile = {
      name,
      age,
      gender,
      location,
      dailyGoal,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    feedback.textContent = "Profile saved! Opening your dashboard...";

    // Open the dashboard after saving
    window.location.href = "../pages/index.html";
  } catch (error) {
    console.error("Could not save the profile:", error);

    feedback.textContent =
      "We couldn't save your profile. Please check your browser settings and try again.";
  }
});

// Fill the form if a profile already exists
loadExistingProfile();