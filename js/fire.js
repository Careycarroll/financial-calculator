import {
  CONFIG, safeParseFloat, safeParseInt, formatCurrency,
  createChartContext, showChartLoading, hideChartLoading,
  rafThrottle, validateInputs, showFieldError, bindFormEnter, drawLabelWithBackground,
  autoScrollTables, drawTooltip
} from "./chart-utils.js";

// ===== DOM ELEMENTS =====
const tabFireNumber = document.getElementById("tab-fire-number");
const tabCoastFire = document.getElementById("tab-coast-fire");
const fireNumberTab = document.getElementById("fire-number-tab");
const coastFireTab = document.getElementById("coast-fire-tab");

const fireCalculateBtn = document.getElementById("fire-calculate-btn");
const coastCalculateBtn = document.getElementById("coast-calculate-btn");

let calculatedFireNumber = null;
let calculatedFireNumberFuture = null;

// ===== TAB SWITCHING =====
tabFireNumber.addEventListener("click", () => {
  tabFireNumber.classList.add("active");
  tabCoastFire.classList.remove("active");
  fireNumberTab.classList.remove("hidden");
  coastFireTab.classList.add("hidden");
});

tabCoastFire.addEventListener("click", () => {
  tabCoastFire.classList.add("active");
  tabFireNumber.classList.remove("active");
  coastFireTab.classList.remove("hidden");
  fireNumberTab.classList.add("hidden");

  // Auto-fill FIRE number if calculated
  if (calculatedFireNumberFuture) {
    const coastInput = document.getElementById("coast-fire-number");
    if (!coastInput.value) {
      coastInput.value = Math.round(calculatedFireNumberFuture);
    }
  }
});

// ===== EVENT LISTENERS =====
fireCalculateBtn.addEventListener("click", () => handleFireCalculate({ scroll: true }));
coastCalculateBtn.addEventListener("click", () => handleCoastCalculate({ scroll: true }));

// Enter key support
bindFormEnter(() => {
  if (!coastFireTab.classList.contains("hidden")) {
    handleCoastCalculate({ scroll: true });
  } else {
    handleFireCalculate({ scroll: true });
  }
});

// ===== FORMATTING =====
// formatCurrency is now provided by chart-utils.js

// ===== GET PROFILE VALUES =====
function getProfile() {
  return {
    currentAge: safeParseInt(document.getElementById("fire-current-age").value),
    retireAge: safeParseInt(document.getElementById("fire-retire-age").value),
    lifeExpectancy: safeParseInt(document.getElementById("fire-life-expectancy").value, 90),
    portfolio:
      safeParseFloat(document.getElementById("fire-current-portfolio").value, 0),
    monthlyContribution:
      safeParseFloat(document.getElementById("fire-monthly-contribution").value, 0),
    contribGrowth:
      safeParseFloat(document.getElementById("fire-contrib-growth")?.value, 0) / 100,
    annualReturn:
      safeParseFloat(document.getElementById("fire-annual-return").value) / 100,
    inflation:
      safeParseFloat(document.getElementById("fire-inflation").value) / 100,
  };
}

// ===== CONTRIBUTION TIMELINE & MILESTONES =====
function getAnnualContributionSchedule(profile, milestones, totalYears) {
  const sorted = Array.isArray(milestones)
    ? [...milestones].sort((a, b) => a.age - b.age)
    : [];

  let currentMonthly = profile ? profile.monthlyContribution : 0;
  const contribGrowth = profile ? (profile.contribGrowth || 0) : 0;
  const currentAge = profile ? profile.currentAge : 32;
  const schedule = [];

  for (let y = 0; y < totalYears; y++) {
    const age = currentAge + y;

    if (y > 0 && contribGrowth > 0) {
      currentMonthly = currentMonthly * (1 + contribGrowth);
    }

    const matching = sorted.filter((m) => m.age === age);
    let lumpSum = 0;
    const labels = [];

    matching.forEach((m) => {
      const amt = parseFloat(m.amount) || 0;
      if (m.type === "new_monthly") {
        currentMonthly = amt;
        labels.push(m.note ? `${m.note} ($${Math.round(amt).toLocaleString()}/mo)` : `$${Math.round(amt).toLocaleString()}/mo`);
      } else if (m.type === "delta_monthly") {
        currentMonthly += amt;
        labels.push(m.note ? `${m.note} (+$${Math.round(amt).toLocaleString()}/mo)` : `+$${Math.round(amt).toLocaleString()}/mo`);
      } else if (m.type === "lump_sum") {
        lumpSum += amt;
        labels.push(m.note ? `${m.note} (+$${Math.round(amt).toLocaleString()} lump)` : `+$${Math.round(amt).toLocaleString()} lump`);
      }
    });

    schedule.push({
      yearIndex: y,
      age,
      monthlyContribution: currentMonthly,
      annualRegularContribution: currentMonthly * 12,
      lumpSum,
      totalAnnualContribution: (currentMonthly * 12) + lumpSum,
      milestoneBadge: labels.length ? labels.join("; ") : null,
      hasMilestone: labels.length > 0,
    });
  }

  return schedule;
}

// ===== EXPENSE TIMELINE & LIFE-STAGE MILESTONES =====
function getAnnualExpenseSchedule(baseAnnualExpenses, milestones, currentAge, lifeExpectancy) {
  const sorted = Array.isArray(milestones)
    ? [...milestones].sort((a, b) => a.age - b.age)
    : [];

  let currentBase = baseAnnualExpenses;
  const schedule = [];
  const totalYears = (lifeExpectancy > currentAge) ? (lifeExpectancy - currentAge) : 60;

  for (let y = 0; y < totalYears; y++) {
    const age = currentAge + y;
    const matching = sorted.filter((m) => m.age === age);
    let oneTime = 0;
    const labels = [];

    matching.forEach((m) => {
      const amt = parseFloat(m.amount) || 0;
      if (m.type === "set_annual") {
        currentBase = Math.max(0, amt);
        labels.push(m.note ? `${m.note} ($${Math.round(amt).toLocaleString()}/yr)` : `$${Math.round(amt).toLocaleString()}/yr`);
      } else if (m.type === "delta_annual") {
        currentBase = Math.max(0, currentBase + amt);
        const sign = amt >= 0 ? "+" : "-";
        labels.push(m.note ? `${m.note} (${sign}$${Math.abs(Math.round(amt)).toLocaleString()}/yr)` : `${sign}$${Math.abs(Math.round(amt)).toLocaleString()}/yr`);
      } else if (m.type === "one_time") {
        oneTime += amt;
        labels.push(m.note ? `${m.note} (+$${Math.round(amt).toLocaleString()} one-time)` : `+$${Math.round(amt).toLocaleString()} one-time`);
      }
    });

    schedule.push({
      yearIndex: y,
      age,
      baseAnnual: currentBase,
      oneTime,
      totalAnnual: currentBase + oneTime,
      milestoneBadge: labels.length ? labels.join("; ") : null,
      hasMilestone: labels.length > 0,
    });
  }

  return schedule;
}

// ===== FUTURE VALUE WITH MONTHLY CONTRIBUTIONS =====
function futureValue(presentValue, monthlyContribution, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const months = years * 12;

  const fvLump = presentValue * Math.pow(1 + monthlyRate, months);
  const fvContrib =
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return fvLump + fvContrib;
}

// ===== YEARS TO REACH TARGET =====
const MAX_PROJECTION_MONTHS = 1200; // 100 years — effectively infinity for FIRE projections

function yearsToTarget(currentValue, monthlyContribution, annualRate, target, profile = null, milestones = []) {
  if (currentValue >= target) return 0;

  const monthlyRate = annualRate / 12;
  let balance = currentValue;

  const hasDynamicSchedule = profile && (profile.contribGrowth > 0 || (Array.isArray(milestones) && milestones.length > 0));
  const schedule = hasDynamicSchedule
    ? getAnnualContributionSchedule(profile, milestones, Math.ceil(MAX_PROJECTION_MONTHS / 12) + 2)
    : null;

  for (let month = 1; month <= MAX_PROJECTION_MONTHS; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    let currentMonthly = monthlyContribution;

    if (schedule && schedule[yearIndex]) {
      const yearData = schedule[yearIndex];
      currentMonthly = yearData.monthlyContribution;

      // Add lump sum on first month of that year
      if ((month - 1) % 12 === 0 && yearData.lumpSum > 0) {
        balance += yearData.lumpSum;
        if (balance >= target) {
          return (month - 1) / 12;
        }
      }
    }

    balance = balance * (1 + monthlyRate) + currentMonthly;
    if (balance >= target) {
      return month / 12;
    }
  }

  return Infinity;
}

// ===== MONTHLY CONTRIBUTION NEEDED =====
function monthlyNeeded(currentValue, annualRate, target, years) {
  if (years <= 0) return 0;

  const monthlyRate = annualRate / 12;
  const months = years * 12;

  const fvCurrent = currentValue * Math.pow(1 + monthlyRate, months);
  const remaining = target - fvCurrent;

  if (remaining <= 0) return 0;

  const payment =
    remaining / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return Math.max(0, payment);
}

// ===== FIRE NUMBER CALCULATION =====
function handleFireCalculate(options = { scroll: true }) {
  const profile = getProfile();
  const annualExpenses = safeParseFloat(
    document.getElementById("fire-annual-expenses").value, 0
  );
  const withdrawalRate =
    safeParseFloat(document.getElementById("fire-withdrawal-rate").value, 0) / 100;
  const otherIncomeRaw =
    safeParseFloat(document.getElementById("fire-other-income").value, 0);
  const incomeType = document.getElementById("fire-income-type").value;
  let otherIncome = otherIncomeRaw;

  if (incomeType === "fv") {
    const startAge =
      safeParseFloat(document.getElementById("fire-income-start-age").value, 0);
    const inflation =
      (safeParseFloat(document.getElementById("fire-inflation").value, 3)) / 100;
    const years = startAge - profile.currentAge;
    if (years > 0) {
      otherIncome = otherIncomeRaw / Math.pow(1 + inflation, years);
    }
  }

  const shouldScroll = options && options.scroll !== false;

  // Validate
  if (shouldScroll) {
    const valid = validateInputs([
      { id: "fire-current-age",        label: "Current Age",          required: true, min: 18,  max: 100, integer: true },
      { id: "fire-retire-age",         label: "Retirement Age",       required: true, min: 19,  max: 100, integer: true },
      { id: "fire-life-expectancy",    label: "Life Expectancy",      required: true, min: 20,  max: 120, integer: true },
      { id: "fire-annual-return",      label: "Annual Return",        required: true, min: 0,   max: 50  },
      { id: "fire-inflation",          label: "Inflation Rate",       required: true, min: 0,   max: 20  },
      { id: "fire-annual-expenses",    label: "Annual Expenses",      required: true, min: 1            },
      { id: "fire-withdrawal-rate",    label: "Withdrawal Rate",      required: true, min: 0.1, max: 20  },
    ], ".calc-form");
    if (!valid) return;
  } else {
    // Silent check for live updates
    if (!profile.currentAge || !profile.retireAge || profile.retireAge <= profile.currentAge) return;
    if (!profile.lifeExpectancy || profile.lifeExpectancy <= profile.retireAge) return;
    if (!annualExpenses || withdrawalRate <= 0) return;
  }

  if (profile.retireAge <= profile.currentAge) {
    if (shouldScroll) {
      showFieldError("fire-retire-age", "Retirement age must be greater than current age.");
    }
    return;
  }
  if (profile.lifeExpectancy <= profile.retireAge) {
    if (shouldScroll) {
      showFieldError("fire-life-expectancy", "Life expectancy must be greater than retirement age.");
    }
    return;
  }

  const yearsToRetire = profile.retireAge - profile.currentAge;

  // Dynamic expense schedule considering life-stage milestones (e.g. kids moving out at 49)
  const expenseSchedule = getAnnualExpenseSchedule(
    annualExpenses,
    expenseMilestones,
    profile.currentAge,
    profile.lifeExpectancy
  );
  const retireYearIndex = yearsToRetire;
  const effectiveRetireExpenses = (expenseSchedule[retireYearIndex] && expenseSchedule[retireYearIndex].baseAnnual)
    ? expenseSchedule[retireYearIndex].baseAnnual
    : annualExpenses;

  // Gross FIRE number based on effective retirement expenses
  const fireNumberToday = effectiveRetireExpenses / withdrawalRate;

  // Portfolio must cover = expenses minus other income
  const portfolioMustCover = Math.max(0, effectiveRetireExpenses - otherIncome);
  const fireNumberAdjusted = portfolioMustCover / withdrawalRate;

  // FIRE number in future dollars (inflation adjusted) — gross, for display
  const fireNumberFuture =
    fireNumberToday * Math.pow(1 + profile.inflation, yearsToRetire);

  // Adjusted future number — what portfolio actually needs to cover
  const fireNumberAdjustedFuture =
    fireNumberAdjusted * Math.pow(1 + profile.inflation, yearsToRetire);

  // Store for Coast FIRE tab (use gross number)
  calculatedFireNumber = fireNumberToday;
  calculatedFireNumberFuture = fireNumberFuture;

  // Auto-fill coast fire input (use gross number)
  const coastInput = document.getElementById("coast-fire-number");
  coastInput.value = Math.round(fireNumberFuture);

  // Years to FIRE at current rate — based on adjusted target and dynamic career milestones
  const yearsAtCurrentRate = yearsToTarget(
    profile.portfolio,
    profile.monthlyContribution,
    profile.annualReturn,
    fireNumberAdjustedFuture,
    profile,
    careerMilestones,
  );

  const retireAgeAtCurrentRate = profile.currentAge + yearsAtCurrentRate;

  // Monthly needed to hit adjusted target by retirement age
  const monthlyNeededAmount = monthlyNeeded(
    profile.portfolio,
    profile.annualReturn,
    fireNumberAdjustedFuture,
    yearsToRetire,
  );

  const monthlyGap = monthlyNeededAmount - profile.monthlyContribution;

  // Display results
  document.getElementById("fire-number-today").textContent =
    formatCurrency(fireNumberToday);
  document.getElementById("fire-number-future").textContent =
    formatCurrency(fireNumberFuture);
  document.getElementById("fire-portfolio-covers").textContent =
    `${formatCurrency(portfolioMustCover)}/yr`;

  if (yearsAtCurrentRate === Infinity) {
    document.getElementById("fire-years-current").textContent = "Not reachable";
    document.getElementById("fire-years-current").className =
      "result-value negative";
    document.getElementById("fire-retire-age-current").textContent = "N/A";
    document.getElementById("fire-retire-age-current").className =
      "result-value negative";
  } else if (yearsAtCurrentRate <= 0) {
    document.getElementById("fire-years-current").textContent =
      "Already FIRE! 🎉";
    document.getElementById("fire-years-current").className =
      "result-value achieved";
    document.getElementById("fire-retire-age-current").textContent = "Now!";
    document.getElementById("fire-retire-age-current").className =
      "result-value achieved";
  } else {
    document.getElementById("fire-years-current").textContent =
      `${yearsAtCurrentRate.toFixed(1)} years`;
    document.getElementById("fire-years-current").className =
      `result-value ${retireAgeAtCurrentRate <= profile.retireAge ? "positive" : "negative"}`;
    document.getElementById("fire-retire-age-current").textContent =
      `Age ${Math.ceil(retireAgeAtCurrentRate)}`;
    document.getElementById("fire-retire-age-current").className =
      `result-value ${retireAgeAtCurrentRate <= profile.retireAge ? "positive" : "negative"}`;
  }

  document.getElementById("fire-monthly-needed").textContent =
    formatCurrency(monthlyNeededAmount) + "/mo";

  if (monthlyGap <= 0) {
    document.getElementById("fire-monthly-gap").textContent = "On track! ✅";
    document.getElementById("fire-monthly-gap").className =
      "result-value positive";
  } else {
    document.getElementById("fire-monthly-gap").textContent =
      `+${formatCurrency(monthlyGap)}/mo needed`;
    document.getElementById("fire-monthly-gap").className =
      "result-value negative";
  }

  // Update progress bars
  updateProgressBars(profile, fireNumberFuture);

  // Sensitivity table
  displayFireSensitivity(effectiveRetireExpenses, otherIncome, profile, yearsToRetire, profile.lifeExpectancy);

  // Show results
  document.getElementById("fire-number-results").classList.remove("hidden");
  document
    .getElementById("fire-sensitivity-section")
    .classList.remove("hidden");
  document.getElementById("fire-chart-section").classList.remove("hidden");
  document.getElementById("fire-lifecycle-section").classList.remove("hidden");
  document.getElementById("fire-progress-section").classList.remove("hidden");

  // Compute Coast FIRE number for chart overlay
  const coastFireForChart =
    fireNumberFuture / Math.pow(1 + profile.annualReturn, yearsToRetire);

  // Projection chart
  showChartLoading("fire-chart-canvas");
  showChartLoading("fire-lifecycle-canvas");
  requestAnimationFrame(() => {
    displayFireChart(profile, fireNumberFuture, yearsToRetire, coastFireForChart);
    hideChartLoading("fire-chart-canvas");
  });

  // Amortization Schedule
  const incomeStartAge = (incomeType === "fv")
    ? safeParseFloat(document.getElementById("fire-income-start-age").value, profile.retireAge)
    : profile.retireAge;

  currentScheduleData = buildAmortizationSchedule(
    profile,
    annualExpenses,
    otherIncome,
    incomeStartAge,
    withdrawalRate
  );
  renderAmortizationSchedule();
  document.getElementById("fire-amortization-section").classList.remove("hidden");

  // Lifecycle chart (using actual peak accumulated portfolio with milestones)
  const retirementPortfolio = (currentScheduleData && currentScheduleData.peakPortfolio > 0)
    ? currentScheduleData.peakPortfolio
    : futureValue(
        profile.portfolio,
        profile.monthlyContribution,
        profile.annualReturn,
        yearsToRetire,
      );
  requestAnimationFrame(() => {
    displayLifecycleChart(profile, retirementPortfolio, effectiveRetireExpenses, otherIncome, fireNumberFuture);
    hideChartLoading("fire-lifecycle-canvas");
  });

  if (shouldScroll) {
    document
      .getElementById("fire-number-results")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// ===== COAST FIRE CALCULATION =====
function handleCoastCalculate(options = { scroll: true }) {
  const profile = getProfile();
  const fireTarget = safeParseFloat(
    document.getElementById("coast-fire-number").value
    );

  const shouldScroll = options && options.scroll !== false;

  // Validate
  if (shouldScroll) {
    const valid = validateInputs([
      { id: "fire-current-age",     label: "Current Age",      required: true, min: 18, max: 100, integer: true },
      { id: "fire-retire-age",      label: "Retirement Age",   required: true, min: 19, max: 100, integer: true },
      { id: "fire-annual-return",   label: "Annual Return",    required: true, min: 0,  max: 50  },
      { id: "coast-fire-number",    label: "FIRE Number",      required: true, min: 1            },
    ], "#coast-fire-tab");
    if (!valid) return;
  } else {
    if (!profile.currentAge || !profile.retireAge || profile.retireAge <= profile.currentAge) return;
    if (!fireTarget || fireTarget <= 0) return;
  }

  if (profile.retireAge <= profile.currentAge) {
    if (shouldScroll) {
      showFieldError("fire-retire-age", "Retirement age must be greater than current age.");
    }
    return;
  }

  const yearsToRetire = profile.retireAge - profile.currentAge;

  // Coast FIRE number = what you need TODAY so it grows to fireTarget by retirement
  // Using nominal return (not inflation-adjusted, since fireTarget is already in future dollars)
  const coastFireNumber =
    fireTarget / Math.pow(1 + profile.annualReturn, yearsToRetire);

  // Status
  const isPastCoast = profile.portfolio >= coastFireNumber;
  const gap = coastFireNumber - profile.portfolio;

  // When will they hit Coast FIRE at current savings rate?
  let coastFireAge = null;
  if (isPastCoast) {
    coastFireAge = profile.currentAge;
  } else {
    // Find when portfolio + contributions crosses the coast threshold at each age
    // Coast threshold decreases over time (less time to compound = need more)
    let balance = profile.portfolio;
    const monthlyRate = profile.annualReturn / 12;

    for (let month = 1; month <= yearsToRetire * 12; month++) {
      balance = balance * (1 + monthlyRate) + profile.monthlyContribution;
      const age = profile.currentAge + month / 12;
      const remainingYears = profile.retireAge - age;

      if (remainingYears <= 0) break;

      const coastThresholdAtAge =
        fireTarget / Math.pow(1 + profile.annualReturn, remainingYears);

      if (balance >= coastThresholdAtAge) {
        coastFireAge = age;
        break;
      }
    }
  }

  // Retirement age if they stop contributing now
  const yearsNoContrib = yearsToTarget(
    profile.portfolio,
    0,
    profile.annualReturn,
    fireTarget,
  );
  const retireAgeNoContrib = profile.currentAge + yearsNoContrib;

  // Retirement age if they keep contributing
  const yearsWithContrib = yearsToTarget(
    profile.portfolio,
    profile.monthlyContribution,
    profile.annualReturn,
    fireTarget,
  );
  const retireAgeWithContrib = profile.currentAge + yearsWithContrib;

  // Extra monthly to reach Coast FIRE by a reasonable age
  // How much extra per month to hit coastFireNumber in 1 year? 2 years? etc.
  let extraMonthly = 0;
  if (!isPastCoast && profile.monthlyContribution > 0) {
    // Find how much more per month to hit coast fire number in half the remaining time
    // Target reaching Coast FIRE within the sooner of 5 years or half the time to retirement.
    // This gives a realistic near-term savings goal rather than spreading it over decades.
    const coastTargetYears = Math.min(5, yearsToRetire / 2);
    const totalNeeded = monthlyNeeded(
      profile.portfolio,
      profile.annualReturn,
      coastFireNumber,
      coastTargetYears,
    );
    extraMonthly = Math.max(0, totalNeeded - profile.monthlyContribution);
  } else if (!isPastCoast) {
    const coastTargetYears = Math.min(5, yearsToRetire / 2);
    extraMonthly = monthlyNeeded(
      profile.portfolio,
      profile.annualReturn,
      coastFireNumber,
      coastTargetYears,
    );
  }

  // Display results
  document.getElementById("coast-fire-amount").textContent =
    formatCurrency(coastFireNumber);

  if (isPastCoast) {
    document.getElementById("coast-fire-status").textContent =
      "✅ Past Coast FIRE!";
    document.getElementById("coast-fire-status").className =
      "result-value achieved";
    document.getElementById("coast-fire-gap").textContent =
      formatCurrency(Math.abs(gap)) + " surplus";
    document.getElementById("coast-fire-gap").className =
      "result-value positive";
  } else {
    document.getElementById("coast-fire-status").textContent = "❌ Not yet";
    document.getElementById("coast-fire-status").className =
      "result-value not-achieved";
    document.getElementById("coast-fire-gap").textContent =
      formatCurrency(gap) + " needed";
    document.getElementById("coast-fire-gap").className =
      "result-value negative";
  }

  if (coastFireAge !== null) {
    document.getElementById("coast-fire-age").textContent = isPastCoast
      ? "Now! 🎉"
      : `Age ${Math.ceil(coastFireAge)}`;
    document.getElementById("coast-fire-age").className =
      `result-value ${isPastCoast ? "achieved" : "positive"}`;
  } else {
    document.getElementById("coast-fire-age").textContent =
      "After retirement age";
    document.getElementById("coast-fire-age").className =
      "result-value negative";
  }

  if (yearsNoContrib === Infinity) {
    document.getElementById("coast-retire-age-no-contrib").textContent =
      "Not reachable";
    document.getElementById("coast-retire-age-no-contrib").className =
      "result-value negative";
  } else {
    document.getElementById("coast-retire-age-no-contrib").textContent =
      `Age ${Math.ceil(retireAgeNoContrib)}`;
    document.getElementById("coast-retire-age-no-contrib").className =
      `result-value ${retireAgeNoContrib <= profile.retireAge ? "positive" : "negative"}`;
  }

  if (yearsWithContrib === Infinity) {
    document.getElementById("coast-retire-age-with-contrib").textContent =
      "Not reachable";
    document.getElementById("coast-retire-age-with-contrib").className =
      "result-value negative";
  } else {
    document.getElementById("coast-retire-age-with-contrib").textContent =
      `Age ${Math.ceil(retireAgeWithContrib)}`;
    document.getElementById("coast-retire-age-with-contrib").className =
      `result-value ${retireAgeWithContrib <= profile.retireAge ? "positive" : "negative"}`;
  }

  if (isPastCoast) {
    document.getElementById("coast-extra-monthly").textContent =
      "$0 — You're coasting!";
    document.getElementById("coast-extra-monthly").className =
      "result-value positive";
  } else if (extraMonthly > 0) {
    document.getElementById("coast-extra-monthly").textContent =
      formatCurrency(extraMonthly) + "/mo";
    document.getElementById("coast-extra-monthly").className =
      "result-value negative";
  } else {
    document.getElementById("coast-extra-monthly").textContent = "On track";
    document.getElementById("coast-extra-monthly").className =
      "result-value positive";
  }

  // Update progress bars
  if (calculatedFireNumberFuture) {
    updateProgressBars(profile, calculatedFireNumberFuture, coastFireNumber);
  } else {
    updateProgressBars(profile, fireTarget, coastFireNumber);
  }

  // Show results
  document.getElementById("coast-fire-results").classList.remove("hidden");
  document.getElementById("coast-chart-section").classList.remove("hidden");
  document.getElementById("fire-progress-section").classList.remove("hidden");

  // Coast FIRE chart
  showChartLoading("coast-chart-canvas");
  requestAnimationFrame(() => {
    displayCoastChart(profile, fireTarget, coastFireNumber, yearsToRetire);
    hideChartLoading("coast-chart-canvas");
  });

  if (shouldScroll) {
    document
      .getElementById("coast-fire-results")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// ===== PROGRESS BARS =====
function updateProgressBars(profile, fireTarget, coastTarget) {
  // Full FIRE progress
  const firePercent = Math.min(100, (profile.portfolio / fireTarget) * 100);
  document.getElementById("fire-full-progress-bar").style.width =
    `${firePercent}%`;
  document.getElementById("fire-full-progress-text").textContent =
    `${firePercent.toFixed(1)}% — ${formatCurrency(profile.portfolio)} / ${formatCurrency(fireTarget)}`;

  // Coast FIRE progress
  if (coastTarget) {
    const coastPercent = Math.min(100, (profile.portfolio / coastTarget) * 100);
    document.getElementById("fire-coast-progress-bar").style.width =
      `${coastPercent}%`;
    document.getElementById("fire-coast-progress-text").textContent =
      `${coastPercent.toFixed(1)}% — ${formatCurrency(profile.portfolio)} / ${formatCurrency(coastTarget)}`;
  } else {
    // Estimate coast target from profile
    const yearsToRetire = profile.retireAge - profile.currentAge;
    const estimatedCoast =
      fireTarget / Math.pow(1 + profile.annualReturn, yearsToRetire);
    const coastPercent = Math.min(
      100,
      (profile.portfolio / estimatedCoast) * 100,
    );
    document.getElementById("fire-coast-progress-bar").style.width =
      `${coastPercent}%`;
    document.getElementById("fire-coast-progress-text").textContent =
      `${coastPercent.toFixed(1)}% — ${formatCurrency(profile.portfolio)} / ${formatCurrency(estimatedCoast)}`;
  }
}

// ===== FIRE SENSITIVITY TABLE =====
function displayFireSensitivity(annualExpenses, otherIncome, profile, yearsToRetire, lifeExpectancy) {
  const tbody = document.getElementById("fire-sensitivity-body");
  tbody.innerHTML = "";

  const rates = [3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 5, 5.5, 6];
  const currentRate = safeParseFloat(
    document.getElementById("fire-withdrawal-rate").value
  );

  function getRiskLabel(rate) {
    if (rate <= 3.5) return { label: "🟢 Very Safe", color: "var(--accent)" };
    if (rate <= 4.25) return { label: "🟡 Moderate", color: "#f59e0b" };
    if (rate <= 5) return { label: "🟠 Aggressive", color: "#f97316" };
    return { label: "🔴 Risky", color: "#f472b6" };
  }

  rates.forEach((rate) => {
    const r = rate / 100;

    // Gross FIRE number (full expenses, today's dollars)
    const fireNumToday = annualExpenses / r;
    const fireNumFuture = fireNumToday * Math.pow(1 + profile.inflation, yearsToRetire);

    // Adjusted FIRE number (what portfolio must cover after other income)
    const portfolioMustCover = Math.max(0, annualExpenses - otherIncome);
    const adjFireNumToday = portfolioMustCover / r;
    const adjFireNumFuture = adjFireNumToday * Math.pow(1 + profile.inflation, yearsToRetire);

    // Monthly withdrawal from portfolio (today's dollars)
    const monthlyWithdrawal = portfolioMustCover / 12;

    // Years to reach adjusted target
    const years = yearsToTarget(
      profile.portfolio,
      profile.monthlyContribution,
      profile.annualReturn,
      adjFireNumFuture,
    );

    const risk = getRiskLabel(rate);
    const tr = document.createElement("tr");
    const isActive = Math.abs(rate - currentRate) < 0.01;

    const retirementPortfolio = (currentScheduleData && currentScheduleData.peakPortfolio > 0)
      ? currentScheduleData.peakPortfolio
      : futureValue(
          profile.portfolio,
          profile.monthlyContribution,
          profile.annualReturn,
          yearsToRetire,
        );
    const rateWithdrawal = retirementPortfolio * r;
    const drawdown = buildDrawdownData(
      retirementPortfolio,
      rateWithdrawal,
      otherIncome,
      profile.annualReturn,
      profile.inflation,
      profile.retireAge,
      lifeExpectancy || 90,
      expenseMilestones,
      profile.currentAge,
    );
    const lastPoint = drawdown[drawdown.length - 1];
    const portfolioAtDeath = lastPoint ? lastPoint.portfolio : 0;
    const ranOut = drawdown.find((d) => d.ranOut);

    tr.innerHTML = `
      <td style="${isActive ? "color: var(--accent); font-weight: 700;" : ""}">${rate}%</td>
      <td>${formatCurrency(fireNumFuture)}</td>
      <td>${formatCurrency(monthlyWithdrawal)}</td>
      <td style="color: ${years <= yearsToRetire ? "var(--accent)" : "#f472b6"}">${years === Infinity ? "Not reachable" : years.toFixed(1) + " yrs"}</td>
      <td style="color: ${portfolioAtDeath > 0 ? "var(--accent)" : "#f472b6"}">${ranOut ? "💀 Age " + ranOut.age : formatCurrency(portfolioAtDeath)}</td>
      <td style="color: ${risk.color}">${risk.label}</td>
    `;
    tbody.appendChild(tr);
  });
}


// ===== DRAWDOWN SIMULATION =====
function buildDrawdownData(startPortfolio, annualExpenses, otherIncome, annualReturn, inflation, retireAge, lifeExpectancy, milestones = [], currentAge = null) {
  const data = [];
  let portfolio = startPortfolio;
  const retirementYears = lifeExpectancy - retireAge;

  const baseAge = (currentAge !== null && currentAge !== undefined) ? currentAge : retireAge;
  const expenseSchedule = (Array.isArray(milestones) && milestones.length > 0)
    ? getAnnualExpenseSchedule(annualExpenses, milestones, baseAge, lifeExpectancy)
    : null;
  const expenseByAge = expenseSchedule ? new Map(expenseSchedule.map((s) => [s.age, s])) : null;

  for (let year = 0; year <= retirementYears; year++) {
    const age = retireAge + year;
    const inflationFactor = Math.pow(1 + inflation, year);

    let expenseAtAge = annualExpenses;
    if (expenseByAge && expenseByAge.has(age)) {
      expenseAtAge = expenseByAge.get(age).totalAnnual;
    }

    const expenses = expenseAtAge * inflationFactor;
    const income = otherIncome * inflationFactor;
    const netWithdrawal = Math.max(0, expenses - income);

    if (year > 0) {
      portfolio = portfolio * (1 + annualReturn) - netWithdrawal;
    }

    const ranOut = portfolio <= 0;
    if (ranOut) portfolio = 0;

    data.push({
      year,
      age,
      portfolio,
      withdrawal: netWithdrawal,
      ranOut: ranOut && year > 0,
    });

    if (ranOut && year > 0) break;
  }

  return data;
}

// ===== RETIREMENT LIFECYCLE CHART =====
function displayLifecycleChart(profile, retirementPortfolio, annualExpenses, otherIncome, fireTarget) {
  const canvas = document.getElementById("fire-lifecycle-canvas");
  if (!canvas) return;

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    requestAnimationFrame(() => displayLifecycleChart(profile, retirementPortfolio, annualExpenses, otherIncome, fireTarget));
    return;
  }

  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;
  const padding = { top: 40, right: 30, bottom: 50, left: 70 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const yearsToRetire = profile.retireAge - profile.currentAge;
  const retirementYears = profile.lifeExpectancy - profile.retireAge;
  const totalYears = yearsToRetire + retirementYears;

  // Accumulation data — dynamic milestones & escalation schedule
  const accumData = [];
  const contribSchedule = getAnnualContributionSchedule(profile, careerMilestones, yearsToRetire);
  let accumBal = profile.portfolio;

  accumData.push({
    year: 0,
    age: profile.currentAge,
    portfolio: accumBal,
  });

  for (let year = 1; year <= yearsToRetire; year++) {
    const yearContrib = contribSchedule[year - 1] || {
      monthlyContribution: profile.monthlyContribution,
      lumpSum: 0,
    };
    const balanceWithLump = accumBal + yearContrib.lumpSum;
    accumBal = futureValue(
      balanceWithLump,
      yearContrib.monthlyContribution,
      profile.annualReturn,
      1
    );
    accumData.push({
      year,
      age: profile.currentAge + year,
      portfolio: accumBal,
    });
  }

  // Drawdown scenarios
  const scenarios = [
    { rate: 0.03, color: "#22c55e", label: "3%" },
    { rate: 0.04, color: "#a78bfa", label: "4%" },
    { rate: 0.05, color: "#f59e0b", label: "5%" },
    { rate: 0.06, color: "#f472b6", label: "6%" },
  ];

  scenarios.forEach((s) => {
    const yearlyWithdrawal = retirementPortfolio * s.rate;
    const adjustedExpenses = Math.max(yearlyWithdrawal, annualExpenses);
    s.data = buildDrawdownData(
      retirementPortfolio,
      adjustedExpenses,
      otherIncome,
      profile.annualReturn,
      profile.inflation,
      profile.retireAge,
      profile.lifeExpectancy,
      expenseMilestones,
      profile.currentAge,
    );
  });

  const maxPortfolio = Math.max(...accumData.map((d) => d.portfolio),...scenarios.flatMap((s) => s.data.map((d) => d.portfolio)),
    fireTarget * 1.1,
  );

  function toX(age) {
    return padding.left + ((age - profile.currentAge) / totalYears) * chartWidth;
  }

  function toY(value) {
    return padding.top + chartHeight - (value / maxPortfolio) * chartHeight;
  }

  function fromX(x) {
    return profile.currentAge + ((x - padding.left) / chartWidth) * totalYears;
  }

  function drawChart(highlightAge) {
    ctx.clearRect(0, 0, chart.width, chart.height);

    // Y-axis grid
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxPortfolio / ySteps) * i;
      const y = toY(value);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(chart.width - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = window.CHART_FONTS.sm;
      ctx.textAlign = "right";
      ctx.fillText(formatCurrency(value), padding.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = "center";
    const xStep = Math.ceil(totalYears / 10);
    for (let yr = 0; yr <= totalYears; yr += xStep) {
      const age = profile.currentAge + yr;
      const x = toX(age);
      ctx.fillStyle = "#94a3b8";
      ctx.font = window.CHART_FONTS.xs;
      ctx.fillText(`${age}`, x, chart.height - padding.bottom + 16);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = window.CHART_FONTS.md;
    ctx.textAlign = "center";
    ctx.fillText("Age", chart.width / 2, chart.height - 5);

    // Retirement line
    const retireX = toX(profile.retireAge);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(retireX, padding.top);
    ctx.lineTo(retireX, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    drawLabelWithBackground(ctx, "You retire here", retireX, padding.top - 10,
      { color: "#94a3b8", font: window.CHART_FONTS.sm, align: "center" });

    // Drawdown fills (back to front so 3% is on top)
    [...scenarios].reverse().forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(toX(profile.retireAge), toY(retirementPortfolio));
      s.data.forEach((d) => {
        ctx.lineTo(toX(d.age), toY(d.portfolio));
      });
      const lastD = s.data[s.data.length - 1];
      ctx.lineTo(toX(lastD.age), toY(0));
      ctx.lineTo(toX(profile.retireAge), toY(0));
      ctx.closePath();
      ctx.fillStyle = s.color + "55";
      ctx.fill();
    });

    // Drawdown lines
    scenarios.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.data.forEach((d, i) => {
        const x = toX(d.age);
        const y = toY(d.portfolio);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Accumulation fill
    ctx.beginPath();
    ctx.moveTo(toX(profile.currentAge), toY(0));
    accumData.forEach((d) => ctx.lineTo(toX(d.age), toY(d.portfolio)));
    ctx.lineTo(toX(profile.retireAge), toY(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(45, 212, 191, 0.15)";
    ctx.fill();

    // Accumulation line
    ctx.strokeStyle = "#2dd4bf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    accumData.forEach((d, i) => {
      if (i === 0) ctx.moveTo(toX(d.age), toY(d.portfolio));
      else ctx.lineTo(toX(d.age), toY(d.portfolio));
    });
    ctx.stroke();

    // FIRE target line
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, toY(fireTarget));
    ctx.lineTo(chart.width - padding.right, toY(fireTarget));
    ctx.stroke();
    ctx.setLineDash([]);
    drawLabelWithBackground(ctx, `FIRE: ${formatCurrency(fireTarget)}`, padding.left + 4, toY(fireTarget) - 6,
      { color: "#ef4444", font: window.CHART_FONTS.xs, align: "left" });

    // Crosshair
    if (highlightAge !== null) {
      const hx = toX(highlightAge);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padding.top);
      ctx.lineTo(hx, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      const tooltipLines = [`Age ${Math.round(highlightAge)}`];

      if (highlightAge <= profile.retireAge) {
        const idx = Math.min(Math.round(highlightAge - profile.currentAge), accumData.length - 1);
        if (idx >= 0) {
          const d = accumData[idx];
          const hy = toY(d.portfolio);
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#2dd4bf";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
          tooltipLines.push(`Portfolio: ${formatCurrency(d.portfolio)}`);
          tooltipLines.push(`Gap to FIRE: ${formatCurrency(fireTarget - d.portfolio)}`);
        }
      } else {
        scenarios.forEach((s) => {
          const idx = Math.round(highlightAge - profile.retireAge);
          if (idx < s.data.length) {
            const d = s.data[idx];
            const hy = toY(d.portfolio);
            ctx.beginPath();
            ctx.arc(hx, hy, 4, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
            tooltipLines.push(`${s.label}: ${d.ranOut ? "💀 Ran out" : formatCurrency(d.portfolio)}`);
          }
        });
      }

      ctx.font = window.CHART_FONTS.md;
      const tooltipWidth = Math.max(...tooltipLines.map((l) => ctx.measureText(l).width)) + 24;
      const tooltipHeight = tooltipLines.length * 20 + 16;
      let tx = hx + 15;
      let ty = padding.top + 10;
      if (tx + tooltipWidth > chart.width - padding.right) tx = hx - tooltipWidth - 15;
      if (ty + tooltipHeight > padding.top + chartHeight) ty = padding.top + chartHeight - tooltipHeight;

      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
      ctx.lineWidth = 1;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(tx + r, ty);
      ctx.lineTo(tx + tooltipWidth - r, ty);
      ctx.arcTo(tx + tooltipWidth, ty, tx + tooltipWidth, ty + r, r);
      ctx.lineTo(tx + tooltipWidth, ty + tooltipHeight - r);
      ctx.arcTo(tx + tooltipWidth, ty + tooltipHeight, tx + tooltipWidth - r, ty + tooltipHeight, r);
      ctx.lineTo(tx + r, ty + tooltipHeight);
      ctx.arcTo(tx, ty + tooltipHeight, tx, ty + tooltipHeight - r, r);
      ctx.lineTo(tx, ty + r);
      ctx.arcTo(tx, ty, tx + r, ty, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      tooltipLines.forEach((line, li) => {
        ctx.fillStyle = li === 0 ? "#e2e8f0" : "#94a3b8";
        ctx.font = li === 0 ? window.CHART_FONTS.boldMd : window.CHART_FONTS.md;
        ctx.fillText(line, tx + 12, ty + 18 + li * 20);
      });
    }
  }

  drawChart(null);

  if (canvas._lifecycleController) canvas._lifecycleController.abort();
  canvas._lifecycleController = new AbortController();
  const { signal } = canvas._lifecycleController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const r = canvas.getBoundingClientRect();
    const scaleX = chart.width / r.width;
    const age = fromX((e.clientX - r.left) * scaleX);
    if (age >= profile.currentAge && age <= profile.lifeExpectancy) {
      canvas.style.cursor = "crosshair";
      drawChart(age);
    } else {
      canvas.style.cursor = "default";
      drawChart(null);
    }
  }), { signal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawChart(null);
  }, { signal });
}

// ===================================================================
// ASSET LOCATION SPLIT STATE
// ===================================================================
export let isAssetSplitActive = false;
export let assetSplit = {
  pretax: 25000,
  contribPretax: 1000,
  roth: 12500,
  contribRoth: 500,
  taxable: 10000,
  taxableBasis: 8000,
  contribTaxable: 400,
  cash: 2500,
  contribCash: 100,
};

// ===== FIRE PROJECTION CHART (Canvas) =====
function displayFireChart(profile, fireTarget, yearsToRetire, coastFireNumber) {
  const canvas = document.getElementById("fire-chart-canvas");

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    requestAnimationFrame(() =>
      displayFireChart(profile, fireTarget, yearsToRetire, coastFireNumber),
    );
    return;
  }
  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;

  const padding = { top: 30, right: 30, bottom: 50, left: 70 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const chartModeBadge = document.getElementById("fire-chart-mode-badge");
  const legendPrincipal = document.getElementById("legend-item-principal");
  const legendCash = document.getElementById("legend-item-cash");
  const legendTaxable = document.getElementById("legend-item-taxable");
  const legendPretax = document.getElementById("legend-item-pretax");
  const legendRoth = document.getElementById("legend-item-roth");

  if (isAssetSplitActive) {
    if (chartModeBadge) chartModeBadge.classList.remove("hidden");
    if (legendPrincipal) legendPrincipal.classList.add("hidden");
    if (legendCash) legendCash.classList.remove("hidden");
    if (legendTaxable) legendTaxable.classList.remove("hidden");
    if (legendPretax) legendPretax.classList.remove("hidden");
    if (legendRoth) legendRoth.classList.remove("hidden");
  } else {
    if (chartModeBadge) chartModeBadge.classList.add("hidden");
    if (legendPrincipal) legendPrincipal.classList.remove("hidden");
    if (legendCash) legendCash.classList.add("hidden");
    if (legendTaxable) legendTaxable.classList.add("hidden");
    if (legendPretax) legendPretax.classList.add("hidden");
    if (legendRoth) legendRoth.classList.add("hidden");
  }

  const totalYears = Math.max(yearsToRetire + 10, 40);
  const dataPoints = [];
  const contribSchedule = getAnnualContributionSchedule(profile, careerMilestones, yearsToRetire);

  if (isAssetSplitActive) {
    let bCash = assetSplit.cash;
    let bTaxable = assetSplit.taxable;
    let bPretax = assetSplit.pretax;
    let bRoth = assetSplit.roth;

    const baseContribTotal = assetSplit.contribPretax + assetSplit.contribRoth + assetSplit.contribTaxable + assetSplit.contribCash;
    const cRatio = (baseContribTotal > 0 && profile.monthlyContribution > 0) ? (profile.monthlyContribution / baseContribTotal) : 1;

    let cCash = assetSplit.contribCash * cRatio;
    let cTaxable = assetSplit.contribTaxable * cRatio;
    let cPretax = assetSplit.contribPretax * cRatio;
    let cRoth = assetSplit.contribRoth * cRatio;

    dataPoints.push({
      year: 0,
      age: profile.currentAge,
      value: bCash + bTaxable + bPretax + bRoth,
      balCash: bCash,
      balTaxable: bTaxable,
      balPretax: bPretax,
      balRoth: bRoth,
      stackCash: bCash,
      stackTaxable: bCash + bTaxable,
      stackPretax: bCash + bTaxable + bPretax,
      stackRoth: bCash + bTaxable + bPretax + bRoth,
      retired: false,
      milestone: null,
    });

    for (let year = 1; year <= yearsToRetire; year++) {
      const yearContrib = contribSchedule[year - 1] || {
        monthlyContribution: profile.monthlyContribution,
        lumpSum: 0,
        milestoneBadge: null,
      };

      const yearFactor = (profile.monthlyContribution > 0)
        ? (yearContrib.monthlyContribution / profile.monthlyContribution)
        : 1;

      const lump = yearContrib.lumpSum || 0;
      const lumpTaxable = lump * 0.5;
      const lumpPretax = lump * 0.5;

      bCash = futureValue(bCash, cCash * yearFactor, Math.min(profile.annualReturn, profile.inflation || 0.03), 1);
      bTaxable = futureValue(bTaxable + lumpTaxable, cTaxable * yearFactor, profile.annualReturn, 1);
      bPretax = futureValue(bPretax + lumpPretax, cPretax * yearFactor, profile.annualReturn, 1);
      bRoth = futureValue(bRoth, cRoth * yearFactor, profile.annualReturn, 1);

      const totalVal = bCash + bTaxable + bPretax + bRoth;

      dataPoints.push({
        year,
        age: profile.currentAge + year,
        value: totalVal,
        balCash: bCash,
        balTaxable: bTaxable,
        balPretax: bPretax,
        balRoth: bRoth,
        stackCash: bCash,
        stackTaxable: bCash + bTaxable,
        stackPretax: bCash + bTaxable + bPretax,
        stackRoth: totalVal,
        retired: false,
        milestone: yearContrib.milestoneBadge,
      });
    }

    // Post-retirement phase
    const retirementPortfolioValue = dataPoints[yearsToRetire].value;
    const annualWithdrawal = retirementPortfolioValue * (
      safeParseFloat(document.getElementById("fire-withdrawal-rate").value, 4) / 100
    );

    for (let year = 1; year <= totalYears - yearsToRetire; year++) {
      let needed = annualWithdrawal;

      bCash = bCash * (1 + (profile.inflation || 0.03));
      bTaxable = bTaxable * (1 + profile.annualReturn);
      bPretax = bPretax * (1 + profile.annualReturn);
      bRoth = bRoth * (1 + profile.annualReturn);

      // Hierarchy: Taxable -> Pre-tax -> Roth -> Cash
      if (needed > 0 && bTaxable > 0) {
        const draw = Math.min(bTaxable, needed);
        bTaxable -= draw;
        needed -= draw;
      }
      if (needed > 0 && bPretax > 0) {
        const draw = Math.min(bPretax, needed);
        bPretax -= draw;
        needed -= draw;
      }
      if (needed > 0 && bRoth > 0) {
        const draw = Math.min(bRoth, needed);
        bRoth -= draw;
        needed -= draw;
      }
      if (needed > 0 && bCash > 0) {
        const draw = Math.min(bCash, needed);
        bCash -= draw;
        needed -= draw;
      }

      const totalVal = bCash + bTaxable + bPretax + bRoth;

      dataPoints.push({
        year: yearsToRetire + year,
        age: profile.currentAge + yearsToRetire + year,
        value: totalVal,
        balCash: bCash,
        balTaxable: bTaxable,
        balPretax: bPretax,
        balRoth: bRoth,
        stackCash: bCash,
        stackTaxable: bCash + bTaxable,
        stackPretax: bCash + bTaxable + bPretax,
        stackRoth: totalVal,
        retired: true,
        milestone: null,
      });
    }
  } else {
    // Single Portfolio Mode (classic)
    let accumBalance = profile.portfolio;

    dataPoints.push({
      year: 0,
      age: profile.currentAge,
      value: accumBalance,
      retired: false,
      milestone: null,
    });

    for (let year = 1; year <= yearsToRetire; year++) {
      const yearContrib = contribSchedule[year - 1] || {
        monthlyContribution: profile.monthlyContribution,
        lumpSum: 0,
        milestoneBadge: null,
      };
      const balanceWithLump = accumBalance + yearContrib.lumpSum;
      accumBalance = futureValue(
        balanceWithLump,
        yearContrib.monthlyContribution,
        profile.annualReturn,
        1
      );

      dataPoints.push({
        year,
        age: profile.currentAge + year,
        value: accumBalance,
        retired: false,
        milestone: yearContrib.milestoneBadge,
      });
    }

    // Post-retirement phase
    const retirementPortfolioValue = dataPoints[yearsToRetire].value;
    const annualWithdrawal = retirementPortfolioValue * (
      safeParseFloat(document.getElementById("fire-withdrawal-rate").value, 4) / 100
    );
    let postRetirementValue = retirementPortfolioValue;

    for (let year = 1; year <= totalYears - yearsToRetire; year++) {
      postRetirementValue = postRetirementValue * (1 + profile.annualReturn) - annualWithdrawal;
      if (postRetirementValue < 0) postRetirementValue = 0;
      dataPoints.push({
        year: yearsToRetire + year,
        age: profile.currentAge + yearsToRetire + year,
        value: postRetirementValue,
        retired: true,
      });
    }
  }

  const maxValue = Math.max(
    fireTarget * 1.2,
    ...dataPoints.map((d) => d.value),
  );

  function toX(year) {
    return padding.left + (year / totalYears) * chartWidth;
  }

  function toY(value) {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  }

  function fromX(x) {
    return ((x - padding.left) / chartWidth) * totalYears;
  }

  // ── Offscreen static layer ──
  const offscreen = document.createElement("canvas");
  offscreen.width = chart.width;
  offscreen.height = chart.height;
  const offCtx = offscreen.getContext("2d");

  function drawStatic() {
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

    // Grid
    offCtx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    offCtx.lineWidth = 1;

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxValue / ySteps) * i;
      const y = toY(value);
      offCtx.beginPath();
      offCtx.moveTo(padding.left, y);
      offCtx.lineTo(offscreen.width - padding.right, y);
      offCtx.stroke();

      offCtx.fillStyle = "#94a3b8";
      offCtx.font = window.CHART_FONTS.sm;
      offCtx.textAlign = "right";
      offCtx.fillText(formatCurrency(value), padding.left - 10, y + 4);
    }

    // X-axis labels
    offCtx.textAlign = "center";
    const xStep = Math.ceil(totalYears / 10);
    for (let year = 0; year <= totalYears; year += xStep) {
      const x = toX(year);
      const age = profile.currentAge + year;
      offCtx.fillStyle = "#94a3b8";
      offCtx.fillText(`${age}`, x, chart.height - padding.bottom + 20);

      offCtx.strokeStyle = "rgba(148, 163, 184, 0.1)";
      offCtx.beginPath();
      offCtx.moveTo(x, padding.top);
      offCtx.lineTo(x, padding.top + chartHeight);
      offCtx.stroke();
    }

    offCtx.fillStyle = "#94a3b8";
    offCtx.font = window.CHART_FONTS.md;
    offCtx.fillText("Age", chart.width / 2, chart.height - 5);

    // FIRE target line
    offCtx.strokeStyle = "#ef4444";
    offCtx.lineWidth = 2;
    offCtx.setLineDash([8, 4]);
    offCtx.beginPath();
    offCtx.moveTo(padding.left, toY(fireTarget));
    offCtx.lineTo(offscreen.width - padding.right, toY(fireTarget));
    offCtx.stroke();
    offCtx.setLineDash([]);

    drawLabelWithBackground(offCtx, `FIRE: ${formatCurrency(fireTarget)}`, padding.left + 5, toY(fireTarget) - 8,
      { color: "#ef4444", font: window.CHART_FONTS.sm, align: "left" });

    // Coast FIRE threshold curve
    if (coastFireNumber) {
      offCtx.strokeStyle = "#f59e0b";
      offCtx.lineWidth = 2;
      offCtx.setLineDash([6, 3]);
      offCtx.beginPath();
      for (let year = 0; year <= totalYears; year++) {
        const remainingYears = profile.retireAge - profile.currentAge - year;
        if (remainingYears <= 0) break;
        const threshold =
          fireTarget / Math.pow(1 + profile.annualReturn, remainingYears);
        const x = toX(year);
        const y = toY(threshold);
        if (year === 0) offCtx.moveTo(x, y);
        else offCtx.lineTo(x, y);
      }
      offCtx.stroke();
      offCtx.setLineDash([]);

      drawLabelWithBackground(offCtx, `Coast: ${formatCurrency(coastFireNumber)}`, padding.left + 5, toY(coastFireNumber) - 8,
        { color: "#f59e0b", font: window.CHART_FONTS.sm, align: "left" });
    }

    // Retirement age line
    const retireX = toX(yearsToRetire);
    offCtx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    offCtx.lineWidth = 1;
    offCtx.setLineDash([4, 4]);
    offCtx.beginPath();
    offCtx.moveTo(retireX, padding.top);
    offCtx.lineTo(retireX, padding.top + chartHeight);
    offCtx.stroke();
    offCtx.setLineDash([]);

    drawLabelWithBackground(offCtx, `Retire: ${profile.retireAge}`, retireX, padding.top - 10,
      { color: "#94a3b8", font: window.CHART_FONTS.sm, align: "center" });

    if (isAssetSplitActive) {
      // ===== STACKED AREA CHART (CASH + TAXABLE + PRE-TAX + ROTH) =====
      
      // 1. Cash Layer (Bottom) - Cyan
      offCtx.fillStyle = "rgba(56, 189, 248, 0.35)";
      offCtx.beginPath();
      offCtx.moveTo(toX(0), toY(0));
      dataPoints.forEach((p) => offCtx.lineTo(toX(p.year), toY(p.stackCash)));
      offCtx.lineTo(toX(dataPoints[dataPoints.length - 1].year), toY(0));
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#38bdf8";
      offCtx.lineWidth = 1.5;
      offCtx.beginPath();
      dataPoints.forEach((p, idx) => idx === 0 ? offCtx.moveTo(toX(p.year), toY(p.stackCash)) : offCtx.lineTo(toX(p.year), toY(p.stackCash)));
      offCtx.stroke();

      // 2. Taxable Layer - Emerald
      offCtx.fillStyle = "rgba(16, 185, 129, 0.4)";
      offCtx.beginPath();
      offCtx.moveTo(toX(0), toY(dataPoints[0].stackCash));
      dataPoints.forEach((p) => offCtx.lineTo(toX(p.year), toY(p.stackTaxable)));
      for (let i = dataPoints.length - 1; i >= 0; i--) {
        offCtx.lineTo(toX(dataPoints[i].year), toY(dataPoints[i].stackCash));
      }
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#10b981";
      offCtx.lineWidth = 1.5;
      offCtx.beginPath();
      dataPoints.forEach((p, idx) => idx === 0 ? offCtx.moveTo(toX(p.year), toY(p.stackTaxable)) : offCtx.lineTo(toX(p.year), toY(p.stackTaxable)));
      offCtx.stroke();

      // 3. Pre-Tax Layer - Amber
      offCtx.fillStyle = "rgba(245, 158, 11, 0.4)";
      offCtx.beginPath();
      offCtx.moveTo(toX(0), toY(dataPoints[0].stackTaxable));
      dataPoints.forEach((p) => offCtx.lineTo(toX(p.year), toY(p.stackPretax)));
      for (let i = dataPoints.length - 1; i >= 0; i--) {
        offCtx.lineTo(toX(dataPoints[i].year), toY(dataPoints[i].stackTaxable));
      }
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#f59e0b";
      offCtx.lineWidth = 1.5;
      offCtx.beginPath();
      dataPoints.forEach((p, idx) => idx === 0 ? offCtx.moveTo(toX(p.year), toY(p.stackPretax)) : offCtx.lineTo(toX(p.year), toY(p.stackPretax)));
      offCtx.stroke();

      // 4. Roth Layer (Top) - Purple
      offCtx.fillStyle = "rgba(168, 85, 247, 0.45)";
      offCtx.beginPath();
      offCtx.moveTo(toX(0), toY(dataPoints[0].stackPretax));
      dataPoints.forEach((p) => offCtx.lineTo(toX(p.year), toY(p.stackRoth)));
      for (let i = dataPoints.length - 1; i >= 0; i--) {
        offCtx.lineTo(toX(dataPoints[i].year), toY(dataPoints[i].stackPretax));
      }
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#c084fc";
      offCtx.lineWidth = 2.5;
      offCtx.beginPath();
      dataPoints.forEach((p, idx) => idx === 0 ? offCtx.moveTo(toX(p.year), toY(p.stackRoth)) : offCtx.lineTo(toX(p.year), toY(p.stackRoth)));
      offCtx.stroke();

      // Marker pins for milestones
      dataPoints.filter((p) => p.milestone && !p.retired).forEach((p) => {
        const mx = toX(p.year);
        const my = toY(p.value);
        offCtx.beginPath();
        offCtx.arc(mx, my, 5, 0, Math.PI * 2);
        offCtx.fillStyle = "#f59e0b";
        offCtx.fill();
        offCtx.strokeStyle = "#0f172a";
        offCtx.lineWidth = 2;
        offCtx.stroke();
      });
    } else {
      // Single Line Portfolio Projection
      const accumPoints = dataPoints.filter((d) => !d.retired);
      const retirePoints = dataPoints.filter((d) => d.retired);

      offCtx.strokeStyle = "#2dd4bf";
      offCtx.lineWidth = 3;
      offCtx.beginPath();
      accumPoints.forEach((point, i) => {
        const x = toX(point.year);
        const y = toY(point.value);
        if (i === 0) offCtx.moveTo(x, y);
        else offCtx.lineTo(x, y);
      });
      offCtx.stroke();

      // Fill under accumulation
      offCtx.lineTo(toX(yearsToRetire), toY(0));
      offCtx.lineTo(toX(0), toY(0));
      offCtx.closePath();
      offCtx.fillStyle = "rgba(45, 212, 191, 0.1)";
      offCtx.fill();

      // Milestone marker pins on accumulation curve
      accumPoints.filter((p) => p.milestone).forEach((p) => {
        const mx = toX(p.year);
        const my = toY(p.value);
        offCtx.beginPath();
        offCtx.arc(mx, my, 5, 0, Math.PI * 2);
        offCtx.fillStyle = "#f59e0b";
        offCtx.fill();
        offCtx.strokeStyle = "#0f172a";
        offCtx.lineWidth = 2;
        offCtx.stroke();
      });

      // Post-retirement drawdown line
      if (retirePoints.length > 0) {
        offCtx.strokeStyle = "#f59e0b";
        offCtx.lineWidth = 3;
        offCtx.beginPath();
        offCtx.moveTo(toX(yearsToRetire), toY(dataPoints[yearsToRetire].value));
        retirePoints.forEach((point) => {
          offCtx.lineTo(toX(point.year), toY(point.value));
        });
        offCtx.stroke();

        const lastRetire = retirePoints[retirePoints.length - 1];
        offCtx.lineTo(toX(lastRetire.year), toY(0));
        offCtx.lineTo(toX(yearsToRetire), toY(0));
        offCtx.closePath();
        offCtx.fillStyle = "rgba(245, 158, 11, 0.1)";
        offCtx.fill();
      }
    }

    // FIRE crossing point
    const crossingPoint = dataPoints.find((d) => d.value >= fireTarget);
    if (crossingPoint) {
      const cx = toX(crossingPoint.year);
      const cy = toY(crossingPoint.value);

      offCtx.beginPath();
      offCtx.arc(cx, cy, 6, 0, Math.PI * 2);
      offCtx.fillStyle = "#2dd4bf";
      offCtx.fill();
      offCtx.strokeStyle = "#0f172a";
      offCtx.lineWidth = 2;
      offCtx.stroke();

      drawLabelWithBackground(offCtx, `Age ${crossingPoint.age}`, cx, cy - 12,
        { color: "#2dd4bf", font: window.CHART_FONTS.boldSm, align: "center" });
    }
  }

  drawStatic();

  function drawChart(highlightYear) {
    ctx.clearRect(0, 0, chart.width, chart.height);
    ctx.drawImage(offscreen, 0, 0);

    // Hover crosshair and tooltip
    if (
      highlightYear !== null &&
      highlightYear >= 0 &&
      highlightYear <= totalYears
    ) {
      const yearIndex = Math.round(highlightYear);
      if (yearIndex >= 0 && yearIndex < dataPoints.length) {
        const point = dataPoints[yearIndex];
        const hx = toX(point.year);
        const hy = toY(point.value);

        // Crosshair line
        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, padding.top);
        ctx.lineTo(hx, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot on line
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle = point.milestone ? "#f59e0b" : "#2dd4bf";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tooltip text
        const gap = point.value - fireTarget;
        const gapText =
          gap >= 0
            ? `✅ ${formatCurrency(gap)} above FIRE`
            : `❌ ${formatCurrency(Math.abs(gap))} below FIRE`;

        let tooltipLines = [];
        if (isAssetSplitActive) {
          tooltipLines = [
            `Age ${point.age} (Year ${point.year})`,
            `Total: ${formatCurrency(point.value)}`,
            `🟣 Roth: ${formatCurrency(point.balRoth)}`,
            `🟡 Pre-Tax: ${formatCurrency(point.balPretax)}`,
            `🟢 Taxable: ${formatCurrency(point.balTaxable)}`,
            `🔵 Cash: ${formatCurrency(point.balCash)}`,
            gapText,
          ];
        } else {
          tooltipLines = [
            `Age ${point.age}`,
            `Portfolio: ${formatCurrency(point.value)}`,
            gapText,
          ];
        }

        if (point.milestone) {
          tooltipLines.push(`🎯 ${point.milestone}`);
        }

        drawTooltip(ctx, tooltipLines, hx, hy, {
          top: padding.top,
          right: chart.width - padding.right,
          height: chartHeight,
          width: chartWidth,
        });
      }
    }
  }

  // Initial draw
  drawChart(null);

  // Mouse interaction
  if (canvas._fireController) canvas._fireController.abort();
  canvas._fireController = new AbortController();
  const { signal: fireSignal } = canvas._fireController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const year = fromX(mouseX);

    if (year >= 0 && year <= totalYears) {
      canvas.style.cursor = "crosshair";
      drawChart(year);
    } else {
      canvas.style.cursor = "default";
      drawChart(null);
    }
  }), { signal: fireSignal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawChart(null);
  }, { signal: fireSignal });
}

// ===== COAST FIRE CHART (Canvas) =====
function displayCoastChart(
  profile,
  fireTarget,
  coastFireNumber,
  yearsToRetire,
) {
  const canvas = document.getElementById("coast-chart-canvas");

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    requestAnimationFrame(() =>
      displayCoastChart(profile, fireTarget, coastFireNumber, yearsToRetire),
    );
    return;
  }
  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;

  const padding = { top: 30, right: 30, bottom: 50, left: 70 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const totalYears = yearsToRetire + 5;

  // Portfolio projection (with contributions)
  const portfolioData = [];
  for (let year = 0; year <= totalYears; year++) {
    const value = futureValue(
      profile.portfolio,
      profile.monthlyContribution,
      profile.annualReturn,
      year,
    );
    portfolioData.push({
      year: year,
      age: profile.currentAge + year,
      value: value,
    });
  }

  // Coast threshold curve
  const coastData = [];
  for (let year = 0; year <= yearsToRetire; year++) {
    const remainingYears = yearsToRetire - year;
    const threshold =
      remainingYears > 0
        ? fireTarget / Math.pow(1 + profile.annualReturn, remainingYears)
        : fireTarget;
    coastData.push({
      year: year,
      age: profile.currentAge + year,
      value: threshold,
    });
  }

  const maxValue = Math.max(
    fireTarget * 1.2,
    ...portfolioData.map((d) => d.value),
  );

  function toX(year) {
    return padding.left + (year / totalYears) * chartWidth;
  }

  function toY(value) {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  }

  function fromX(x) {
    return ((x - padding.left) / chartWidth) * totalYears;
  }

  // ── Offscreen static layer ──
  const offscreenCoast = document.createElement("canvas");
  offscreenCoast.width = chart.width;
  offscreenCoast.height = chart.height;
  const offCtxCoast = offscreenCoast.getContext("2d");

  function drawStaticCoast() {
    offCtxCoast.clearRect(0, 0, offscreenCoast.width, offscreenCoast.height);

    // Grid
    offCtxCoast.strokeStyle = "rgba(148, 163, 184, 0.15)";
    offCtxCoast.lineWidth = 1;
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxValue / ySteps) * i;
      const y = toY(value);
      offCtxCoast.beginPath();
      offCtxCoast.moveTo(padding.left, y);
      offCtxCoast.lineTo(offscreenCoast.width - padding.right, y);
      offCtxCoast.stroke();
      offCtxCoast.fillStyle = "#94a3b8";
      offCtxCoast.font = window.CHART_FONTS.sm;
      offCtxCoast.textAlign = "right";
      offCtxCoast.fillText(formatCurrency(value), padding.left - 10, y + 4);
    }

    // X-axis
    offCtxCoast.textAlign = "center";
    const xStep = Math.ceil(totalYears / 10);
    for (let year = 0; year <= totalYears; year += xStep) {
      const x = toX(year);
      const age = profile.currentAge + year;
      offCtxCoast.fillStyle = "#94a3b8";
      offCtxCoast.fillText(`${age}`, x, chart.height - padding.bottom + 20);
    }

    offCtxCoast.fillStyle = "#94a3b8";
    offCtxCoast.font = window.CHART_FONTS.md;
    offCtxCoast.fillText("Age", chart.width / 2, chart.height - 5);

    // FIRE target line
    offCtxCoast.strokeStyle = "#ef4444";
    offCtxCoast.lineWidth = 2;
    offCtxCoast.setLineDash([8, 4]);
    offCtxCoast.beginPath();
    offCtxCoast.moveTo(padding.left, toY(fireTarget));
    offCtxCoast.lineTo(offscreenCoast.width - padding.right, toY(fireTarget));
    offCtxCoast.stroke();
    offCtxCoast.setLineDash([]);
    drawLabelWithBackground(offCtxCoast, `FIRE: ${formatCurrency(fireTarget)}`, padding.left + 5, toY(fireTarget) - 8,
      { color: "#ef4444", font: window.CHART_FONTS.sm, align: "left" });

    // Retirement age line
    const retireX = toX(yearsToRetire);
    offCtxCoast.strokeStyle = "rgba(148, 163, 184, 0.4)";
    offCtxCoast.lineWidth = 1;
    offCtxCoast.setLineDash([4, 4]);
    offCtxCoast.beginPath();
    offCtxCoast.moveTo(retireX, padding.top);
    offCtxCoast.lineTo(retireX, padding.top + chartHeight);
    offCtxCoast.stroke();
    offCtxCoast.setLineDash([]);
    drawLabelWithBackground(offCtxCoast, `Retire: ${profile.retireAge}`, retireX, padding.top - 10,
      { color: "#94a3b8", font: window.CHART_FONTS.sm, align: "center" });

    // Coast threshold curve
    offCtxCoast.strokeStyle = "#f59e0b";
    offCtxCoast.lineWidth = 2;
    offCtxCoast.setLineDash([6, 3]);
    offCtxCoast.beginPath();
    coastData.forEach((point, i) => {
      const x = toX(point.year);
      const y = toY(point.value);
      if (i === 0) offCtxCoast.moveTo(x, y);
      else offCtxCoast.lineTo(x, y);
    });
    offCtxCoast.stroke();
    offCtxCoast.setLineDash([]);
    drawLabelWithBackground(offCtxCoast, "Coast Threshold", toX(0) + 5, toY(coastData[0].value) - 8,
      { color: "#f59e0b", font: window.CHART_FONTS.sm, align: "left" });

    // Portfolio line
    offCtxCoast.strokeStyle = "#2dd4bf";
    offCtxCoast.lineWidth = 3;
    offCtxCoast.beginPath();
    portfolioData.forEach((point, i) => {
      const x = toX(point.year);
      const y = toY(point.value);
      if (i === 0) offCtxCoast.moveTo(x, y);
      else offCtxCoast.lineTo(x, y);
    });
    offCtxCoast.stroke();
    offCtxCoast.lineTo(toX(totalYears), toY(0));
    offCtxCoast.lineTo(toX(0), toY(0));
    offCtxCoast.closePath();
    offCtxCoast.fillStyle = "rgba(45, 212, 191, 0.1)";
    offCtxCoast.fill();

    // Coast crossing point
    for (let i = 1; i < portfolioData.length && i < coastData.length; i++) {
      if (portfolioData[i].value >= coastData[i].value && portfolioData[i-1].value < coastData[i-1].value) {
        const cx = toX(portfolioData[i].year);
        const cy = toY(portfolioData[i].value);
        offCtxCoast.beginPath();
        offCtxCoast.arc(cx, cy, 6, 0, Math.PI * 2);
        offCtxCoast.fillStyle = "#f59e0b";
        offCtxCoast.fill();
        offCtxCoast.strokeStyle = "#0f172a";
        offCtxCoast.lineWidth = 2;
        offCtxCoast.stroke();
        drawLabelWithBackground(offCtxCoast, `Coast: Age ${portfolioData[i].age}`, cx, cy - 12,
          { color: "#f59e0b", font: window.CHART_FONTS.boldSm, align: "center" });
        break;
      }
    }

    // FIRE crossing point
    for (let i = 1; i < portfolioData.length; i++) {
      if (portfolioData[i].value >= fireTarget && portfolioData[i-1].value < fireTarget) {
        const cx = toX(portfolioData[i].year);
        const cy = toY(portfolioData[i].value);
        offCtxCoast.beginPath();
        offCtxCoast.arc(cx, cy, 6, 0, Math.PI * 2);
        offCtxCoast.fillStyle = "#2dd4bf";
        offCtxCoast.fill();
        offCtxCoast.strokeStyle = "#0f172a";
        offCtxCoast.lineWidth = 2;
        offCtxCoast.stroke();
        drawLabelWithBackground(offCtxCoast, `FIRE: Age ${portfolioData[i].age}`, cx, cy - 12,
          { color: "#2dd4bf", font: window.CHART_FONTS.boldSm, align: "center" });
        break;
      }
    }
  }

  drawStaticCoast();

  function drawChart(highlightYear) {
    ctx.clearRect(0, 0, chart.width, chart.height);
    ctx.drawImage(offscreenCoast, 0, 0);

    // Hover crosshair and tooltip
    if (
      highlightYear !== null &&
      highlightYear >= 0 &&
      highlightYear <= totalYears
    ) {
      const yearIndex = Math.round(highlightYear);
      if (yearIndex >= 0 && yearIndex < portfolioData.length) {
        const point = portfolioData[yearIndex];
        const hx = toX(point.year);
        const hy = toY(point.value);

        // Crosshair
        ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, padding.top);
        ctx.lineTo(hx, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot on portfolio line
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#2dd4bf";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dot on coast threshold (if in range)
        let coastVal = null;
        if (yearIndex < coastData.length) {
          coastVal = coastData[yearIndex].value;
          const coastY = toY(coastVal);
          ctx.beginPath();
          ctx.arc(hx, coastY, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Tooltip
        const fireGap = point.value - fireTarget;
        const coastGap = coastVal !== null ? point.value - coastVal : null;

        const tooltipLines = [
          `Age ${point.age}`,
          `Portfolio: ${formatCurrency(point.value)}`,
        ];

        if (coastGap !== null) {
          tooltipLines.push(`Coast Threshold: ${formatCurrency(coastVal)}`);
          tooltipLines.push(
            coastGap >= 0
              ? `✅ ${formatCurrency(coastGap)} above Coast`
              : `❌ ${formatCurrency(Math.abs(coastGap))} below Coast`,
          );
        }

        tooltipLines.push(
          fireGap >= 0
            ? `✅ ${formatCurrency(fireGap)} above FIRE`
            : `❌ ${formatCurrency(Math.abs(fireGap))} below FIRE`,
        );

        ctx.font = window.CHART_FONTS.md;
        const tooltipWidth =
          Math.max(...tooltipLines.map((l) => ctx.measureText(l).width)) + 20;
        const tooltipHeight = tooltipLines.length * 20 + 12;

        let tx = hx + 15;
        let ty = hy - tooltipHeight / 2;

        if (tx + tooltipWidth > chart.width - padding.right) {
          tx = hx - tooltipWidth - 15;
        }
        if (ty < padding.top) ty = padding.top;
        if (ty + tooltipHeight > padding.top + chartHeight) {
          ty = padding.top + chartHeight - tooltipHeight;
        }

        // Tooltip background
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
        ctx.lineWidth = 1;

        const radius = 6;
        ctx.beginPath();
        ctx.moveTo(tx + radius, ty);
        ctx.lineTo(tx + tooltipWidth - radius, ty);
        ctx.arcTo(
          tx + tooltipWidth,
          ty,
          tx + tooltipWidth,
          ty + radius,
          radius,
        );
        ctx.lineTo(tx + tooltipWidth, ty + tooltipHeight - radius);
        ctx.arcTo(
          tx + tooltipWidth,
          ty + tooltipHeight,
          tx + tooltipWidth - radius,
          ty + tooltipHeight,
          radius,
        );
        ctx.lineTo(tx + radius, ty + tooltipHeight);
        ctx.arcTo(
          tx,
          ty + tooltipHeight,
          tx,
          ty + tooltipHeight - radius,
          radius,
        );
        ctx.lineTo(tx, ty + radius);
        ctx.arcTo(tx, ty, tx + radius, ty, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tooltip text
        ctx.textAlign = "left";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = window.CHART_FONTS.boldMd;
        ctx.fillText(tooltipLines[0], tx + 10, ty + 18);

        ctx.font = window.CHART_FONTS.md;
        for (let i = 1; i < tooltipLines.length; i++) {
          const line = tooltipLines[i];
          if (line.startsWith("✅")) {
            ctx.fillStyle = "#2dd4bf";
          } else if (line.startsWith("❌")) {
            ctx.fillStyle = "#f472b6";
          } else if (line.startsWith("Coast")) {
            ctx.fillStyle = "#f59e0b";
          } else {
            ctx.fillStyle = "#e2e8f0";
          }
          ctx.fillText(line, tx + 10, ty + 18 + i * 20);
        }
      }
    }
  }

  // Initial draw
  drawChart(null);

  // Mouse interaction
  if (canvas._coastController) canvas._coastController.abort();
  canvas._coastController = new AbortController();
  const { signal: coastSignal } = canvas._coastController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const year = fromX(mouseX);

    if (year >= 0 && year <= totalYears) {
      canvas.style.cursor = "crosshair";
      drawChart(year);
    } else {
      canvas.style.cursor = "default";
      drawChart(null);
    }
  }), { signal: coastSignal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawChart(null);
  }, { signal: coastSignal });
}

// ===================================================================
// RESIZE HANDLER
// ===================================================================

let fireResizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(fireResizeTimeout);
  fireResizeTimeout = setTimeout(() => {
    const fireChartSection = document.getElementById("fire-chart-section");
    const coastChartSection = document.getElementById("coast-chart-section");
    if (fireChartSection && !fireChartSection.classList.contains("hidden")) {
      fireCalculateBtn.click();
    } else if (coastChartSection && !coastChartSection.classList.contains("hidden")) {
      coastCalculateBtn.click();
    }
  }, 250);
});

// ===================================================================
// FUTURE VALUE INCOME TOGGLE
// ===================================================================

document
  .getElementById("fire-income-type")
  .addEventListener("change", function () {
    const fvOptions = document.getElementById("fire-fv-options");
    if (this.value === "fv") {
      fvOptions.classList.remove("hidden");
      updateIncomePVDisplay();
    } else {
      fvOptions.classList.add("hidden");
    }
  });

document
  .getElementById("fire-other-income")
  .addEventListener("input", updateIncomePVDisplay);
document
  .getElementById("fire-income-start-age")
  .addEventListener("input", updateIncomePVDisplay);
document
  .getElementById("fire-inflation")
  .addEventListener("input", updateIncomePVDisplay);
document
  .getElementById("fire-current-age")
  .addEventListener("input", updateIncomePVDisplay);

function updateIncomePVDisplay() {
  const type = document.getElementById("fire-income-type").value;
  if (type !== "fv") return;

  const fv =
    safeParseFloat(document.getElementById("fire-other-income").value, 0);
  const startAge =
    safeParseFloat(document.getElementById("fire-income-start-age").value, 0);
  const currentAge =
    safeParseFloat(document.getElementById("fire-current-age").value, 0);
  const inflation =
    (safeParseFloat(document.getElementById("fire-inflation").value, 3)) / 100;

  const display = document.getElementById("fire-income-pv-display");

  if (!fv || !startAge || !currentAge || startAge <= currentAge) {
    display.textContent = "—";
    return;
  }

  const years = startAge - currentAge;
  const pv = fv / Math.pow(1 + inflation, years);
  display.textContent =
    "$" + pv.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ===================================================================
// AUTO-SAVE & RESTORE INPUTS
// ===================================================================

const FIRE_STORAGE_KEY = "fire_inputs";

const FIRE_FIELDS = [
  "fire-current-age",
  "fire-retire-age",
  "fire-life-expectancy",
  "fire-contrib-growth",
  "fire-current-portfolio",
  "fire-monthly-contribution",
  "fire-annual-return",
  "fire-inflation",
  "fire-annual-expenses",
  "fire-withdrawal-rate",
  "fire-other-income",
  "fire-income-type",
  "fire-income-start-age",
  "coast-fire-number",
];

function saveFireInputs() {
  const data = {};
  FIRE_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.value) {
      data[id] = el.value;
    }
  });
  localStorage.setItem(FIRE_STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem("fire_calculator_milestones", JSON.stringify(careerMilestones));
  localStorage.setItem("fire_calculator_expense_milestones", JSON.stringify(expenseMilestones));
}

function loadFireInputs() {
  try {
    const data = JSON.parse(localStorage.getItem(FIRE_STORAGE_KEY));
    if (data) {
      Object.entries(data).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      });

      // Show FV options if saved as future value
      if (data["fire-income-type"] === "fv") {
        document.getElementById("fire-fv-options").classList.remove("hidden");
        updateIncomePVDisplay();
      }
    }

    const savedMilestones = JSON.parse(localStorage.getItem("fire_calculator_milestones"));
    if (Array.isArray(savedMilestones)) {
      careerMilestones = savedMilestones;
    }

    const savedExpenseMilestones = JSON.parse(localStorage.getItem("fire_calculator_expense_milestones"));
    if (Array.isArray(savedExpenseMilestones)) {
      expenseMilestones = savedExpenseMilestones;
    }
  } catch {
    // ignore
  }
  renderMilestonesUI();
  renderExpenseMilestonesUI();
}


// Save on every input change
FIRE_FIELDS.forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", saveFireInputs);
  }
});

// ===================================================================
// RETIREMENT AMORTIZATION SCHEDULE
// ===================================================================

let currentScheduleData = null;
let amortViewMode = "nominal"; // "nominal" | "real"
let amortInterval = "all";     // "all" | "5yr"
let amortPhaseFilter = "all";  // "all" | "accum" | "retire"

function formatFullUSD(value) {
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildAmortizationSchedule(profile, annualExpenses, otherIncome, incomeStartAge, withdrawalRate) {
  const currentYear = new Date().getFullYear();
  const yearsToRetire = profile.retireAge - profile.currentAge;
  const retirementYears = profile.lifeExpectancy - profile.retireAge;
  const totalYears = yearsToRetire + retirementYears;

  const rows = [];
  let balance = profile.portfolio;
  let cumulativeContributed = profile.portfolio;
  let cumulativeContributedReal = profile.portfolio;
  let cumulativeGrowth = 0;
  let cumulativeGrowthReal = 0;
  let totalWithdrawn = 0;
  let totalWithdrawnReal = 0;
  let portfolioDepleted = false;
  let depletionAge = null;
  let peakPortfolio = 0;

  // 1. Accumulation Phase (currentAge to retireAge - 1)
  const contribSchedule = getAnnualContributionSchedule(profile, careerMilestones, yearsToRetire);
  const expenseSchedule = getAnnualExpenseSchedule(annualExpenses, expenseMilestones, profile.currentAge, profile.lifeExpectancy);
  const expenseByAge = new Map(expenseSchedule.map((s) => [s.age, s]));

  for (let y = 0; y < yearsToRetire; y++) {
    const age = profile.currentAge + y;
    const year = currentYear + y;
    const beginningBalance = balance;
    const yearContrib = contribSchedule[y] || {
      monthlyContribution: profile.monthlyContribution,
      lumpSum: 0,
      totalAnnualContribution: profile.monthlyContribution * 12,
      milestoneBadge: null,
      hasMilestone: false,
    };
    const expItem = expenseByAge.get(age);
    const expenseMilestoneBadge = (expItem && expItem.hasMilestone) ? expItem.milestoneBadge : null;
    const annualContrib = yearContrib.totalAnnualContribution;
    const discountFactor = Math.pow(1 + profile.inflation, y);

    const balanceWithLump = beginningBalance + yearContrib.lumpSum;
    const endingBalance = futureValue(
      balanceWithLump,
      yearContrib.monthlyContribution,
      profile.annualReturn,
      1
    );
    const growth = endingBalance - beginningBalance - annualContrib;

    cumulativeContributed += annualContrib;
    cumulativeGrowth += growth;

    cumulativeContributedReal += (annualContrib / discountFactor);
    cumulativeGrowthReal += (growth / discountFactor);

    balance = endingBalance;

    rows.push({
      index: y,
      age,
      year,
      phase: "accumulation",
      isMilestone: y === 0 || yearContrib.hasMilestone || Boolean(expenseMilestoneBadge),
      milestoneBadge: yearContrib.milestoneBadge,
      expenseMilestoneBadge,
      isRetireTransition: false,
      isDepleted: false,
      beginningBalance,
      contribution: annualContrib,
      growth,
      withdrawal: 0,
      otherIncome: 0,
      endingBalance,
      cumulativeContributed,
      cumulativeGrowth,
      discountFactor,
    });
  }

  peakPortfolio = balance;
  const retireDiscountFactor = Math.pow(1 + profile.inflation, yearsToRetire);
  const peakPortfolioReal = peakPortfolio / retireDiscountFactor;

  // 2. Retirement Phase (retireAge to lifeExpectancy - 1)
  const actualStartAge = (incomeStartAge && incomeStartAge > 0) ? incomeStartAge : profile.retireAge;

  for (let y = 0; y < retirementYears; y++) {
    const totalYearIndex = yearsToRetire + y;
    const age = profile.retireAge + y;
    const year = currentYear + totalYearIndex;
    const beginningBalance = balance;
    const discountFactor = Math.pow(1 + profile.inflation, totalYearIndex);
    const isRetireTransition = (y === 0);
    const expItem = expenseByAge.get(age);
    const realExpensesAtAge = expItem ? expItem.totalAnnual : annualExpenses;
    const expenseMilestoneBadge = (expItem && expItem.hasMilestone) ? expItem.milestoneBadge : null;

    if (portfolioDepleted) {
      const nominalOtherIncome = (age >= actualStartAge) ? (otherIncome * discountFactor) : 0;
      rows.push({
        index: totalYearIndex,
        age,
        year,
        phase: "retirement",
        isMilestone: isRetireTransition || Boolean(expenseMilestoneBadge),
        expenseMilestoneBadge,
        isRetireTransition,
        isDepleted: true,
        beginningBalance: 0,
        contribution: 0,
        growth: 0,
        withdrawal: 0,
        otherIncome: nominalOtherIncome,
        endingBalance: 0,
        cumulativeContributed,
        cumulativeGrowth,
        discountFactor,
      });
      continue;
    }

    const nominalExpenses = realExpensesAtAge * discountFactor;
    const nominalOtherIncome = (age >= actualStartAge) ? (otherIncome * discountFactor) : 0;
    const netWithdrawalNeeded = Math.max(0, nominalExpenses - nominalOtherIncome);

    const growth = beginningBalance * profile.annualReturn;
    const available = beginningBalance + growth;

    let actualWithdrawal = netWithdrawalNeeded;
    let endingBalance = available - actualWithdrawal;
    let isDepletedThisYear = false;

    if (endingBalance <= 0) {
      endingBalance = 0;
      actualWithdrawal = available;
      portfolioDepleted = true;
      depletionAge = age;
      isDepletedThisYear = true;
    }

    cumulativeGrowth += growth;
    cumulativeGrowthReal += (growth / discountFactor);
    totalWithdrawn += actualWithdrawal;
    totalWithdrawnReal += (actualWithdrawal / discountFactor);

    balance = endingBalance;

    rows.push({
      index: totalYearIndex,
      age,
      year,
      phase: "retirement",
      isMilestone: isRetireTransition || isDepletedThisYear || Boolean(expenseMilestoneBadge),
      expenseMilestoneBadge,
      isRetireTransition,
      isDepleted: isDepletedThisYear,
      beginningBalance,
      contribution: 0,
      growth,
      withdrawal: actualWithdrawal,
      otherIncome: nominalOtherIncome,
      endingBalance,
      cumulativeContributed,
      cumulativeGrowth,
      discountFactor,
    });
  }

  const finalDiscountFactor = Math.pow(1 + profile.inflation, totalYears);

  return {
    rows,
    totalContributed: cumulativeContributed,
    totalContributedReal: cumulativeContributedReal,
    totalGrowth: cumulativeGrowth,
    totalGrowthReal: cumulativeGrowthReal,
    peakPortfolio,
    peakPortfolioReal,
    totalWithdrawn,
    totalWithdrawnReal,
    finalBalance: balance,
    finalBalanceReal: balance / finalDiscountFactor,
    depletionAge,
    lifeExpectancy: profile.lifeExpectancy,
    retireAge: profile.retireAge,
  };
}

function renderAmortizationSchedule() {
  if (!currentScheduleData) return;

  const isReal = (amortViewMode === "real");

  // 1. Update KPI Summary Cards
  const elContributed = document.getElementById("amort-total-contributed");
  const elGrowth = document.getElementById("amort-total-growth");
  const elPeak = document.getElementById("amort-peak-portfolio");
  const elWithdrawn = document.getElementById("amort-total-withdrawn");
  const elFinal = document.getElementById("amort-final-balance");
  const elFinalLabel = document.getElementById("amort-final-label");

  if (elContributed) {
    const val = isReal ? currentScheduleData.totalContributedReal : currentScheduleData.totalContributed;
    elContributed.textContent = formatCurrency(val);
    elContributed.title = formatFullUSD(val);
  }

  if (elGrowth) {
    const val = isReal ? currentScheduleData.totalGrowthReal : currentScheduleData.totalGrowth;
    elGrowth.textContent = formatCurrency(val);
    elGrowth.title = formatFullUSD(val);
  }

  if (elPeak) {
    const val = isReal ? currentScheduleData.peakPortfolioReal : currentScheduleData.peakPortfolio;
    elPeak.textContent = formatCurrency(val);
    elPeak.title = formatFullUSD(val);
  }

  if (elWithdrawn) {
    const val = isReal ? currentScheduleData.totalWithdrawnReal : currentScheduleData.totalWithdrawn;
    elWithdrawn.textContent = formatCurrency(val);
    elWithdrawn.title = formatFullUSD(val);
  }

  if (elFinal && elFinalLabel) {
    if (currentScheduleData.depletionAge !== null) {
      elFinalLabel.textContent = "Portfolio Depleted";
      elFinal.textContent = `💀 Age ${currentScheduleData.depletionAge}`;
      elFinal.className = "amort-card-value negative";
      elFinal.title = `Portfolio ran out of funds at age ${currentScheduleData.depletionAge}`;
    } else {
      elFinalLabel.textContent = `Balance at Age ${currentScheduleData.lifeExpectancy}`;
      const finalVal = isReal ? currentScheduleData.finalBalanceReal : currentScheduleData.finalBalance;
      elFinal.textContent = formatCurrency(finalVal);
      elFinal.className = "amort-card-value positive";
      elFinal.title = formatFullUSD(finalVal);
    }
  }

  // 2. Filter Rows
  const tbody = document.getElementById("fire-amortization-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const allRows = currentScheduleData.rows;
  const filteredRows = allRows.filter((row, idx) => {
    // Phase Filter
    if (amortPhaseFilter === "accum" && row.phase !== "accumulation") return false;
    if (amortPhaseFilter === "retire" && row.phase !== "retirement") return false;

    // Interval Filter
    if (amortInterval === "5yr") {
      const isFiveYear = (row.age % 5 === 0);
      const isRetire = row.isRetireTransition;
      const isDepleted = row.isDepleted;
      const isFirst = (idx === 0);
      const isLast = (idx === allRows.length - 1);
      if (!isFiveYear && !isRetire && !isDepleted && !isFirst && !isLast) {
        return false;
      }
    }

    return true;
  });

  // 3. Render Table Rows
  const fragment = document.createDocumentFragment();

  filteredRows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.isRetireTransition || row.milestoneBadge || row.expenseMilestoneBadge) tr.className = "milestone-row";
    if (row.isDepleted) tr.className = "depleted-row";

    const factor = isReal ? row.discountFactor : 1;
    const beg = row.beginningBalance / factor;
    const contrib = row.contribution / factor;
    const growth = row.growth / factor;
    const draw = row.withdrawal / factor;
    const inc = row.otherIncome / factor;
    const end = row.endingBalance / factor;
    const cumContrib = row.cumulativeContributed / factor;
    const cumGrowth = row.cumulativeGrowth / factor;

    let badgeHtml = "";
    if (row.isDepleted) {
      badgeHtml = `<span class="phase-badge phase-depleted">💀 Depleted</span>`;
    } else if (row.isRetireTransition) {
      badgeHtml = `<span class="phase-badge phase-transition">🎯 Retire Age ${row.age}</span>`;
    } else if (row.phase === "accumulation") {
      badgeHtml = `<span class="phase-badge phase-accum">Accumulation</span>`;
    } else {
      badgeHtml = `<span class="phase-badge phase-retire">Retirement</span>`;
    }

    if (row.milestoneBadge) {
      badgeHtml += `<span class="badge-milestone" title="${row.milestoneBadge}">⭐ ${row.milestoneBadge}</span>`;
    }
    if (row.expenseMilestoneBadge) {
      badgeHtml += `<span class="badge-expense-milestone" title="${row.expenseMilestoneBadge}">📉 ${row.expenseMilestoneBadge}</span>`;
    }

    tr.innerHTML = `
      <td style="text-align: left; font-weight: 600;">${row.age}</td>
      <td style="text-align: left; color: var(--text-secondary);">${row.year}</td>
      <td style="text-align: center;">${badgeHtml}</td>
      <td title="${formatFullUSD(beg)}">${formatCurrency(beg)}</td>
      <td title="${formatFullUSD(contrib)}">${contrib > 0 ? formatCurrency(contrib) : "—"}</td>
      <td title="${formatFullUSD(growth)}" style="color: ${growth >= 0 ? "var(--accent)" : "#f472b6"}">${formatCurrency(growth)}</td>
      <td title="${formatFullUSD(draw)}">${draw > 0 ? formatCurrency(draw) : "—"}</td>
      <td title="${formatFullUSD(inc)}">${inc > 0 ? formatCurrency(inc) : "—"}</td>
      <td title="${formatFullUSD(end)}" style="font-weight: 600; color: ${end > 0 ? "var(--text-primary)" : "#f472b6"}">${formatCurrency(end)}</td>
      <td title="${formatFullUSD(cumContrib)}">${formatCurrency(cumContrib)}</td>
      <td title="${formatFullUSD(cumGrowth)}" style="color: var(--accent);">${formatCurrency(cumGrowth)}</td>
    `;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);

  // Apply auto-scroll if rows exceed threshold
  autoScrollTables(25);
}

function exportScheduleToCSV(scheduleData, isRealMode) {
  if (!scheduleData || !scheduleData.rows || scheduleData.rows.length === 0) return;

  const modeLabel = isRealMode ? "Real (Today's $)" : "Nominal ($)";
  const headers = [
    "Age",
    "Calendar Year",
    "Phase",
    "Milestone Note",
    `Beginning Balance (${modeLabel})`,
    `Annual Contribution (${modeLabel})`,
    `Investment Growth (${modeLabel})`,
    `Annual Withdrawal (${modeLabel})`,
    `Other Income (${modeLabel})`,
    `Ending Balance (${modeLabel})`,
    `Cumulative Contributed (${modeLabel})`,
    `Cumulative Growth (${modeLabel})`,
  ];

  const csvRows = [headers.join(",")];

  scheduleData.rows.forEach((row) => {
    const factor = isRealMode ? row.discountFactor : 1;
    const combinedNotes = [row.milestoneBadge, row.expenseMilestoneBadge].filter(Boolean).join(" | ");
    const values = [
      row.age,
      row.year,
      `"${row.phase.charAt(0).toUpperCase() + row.phase.slice(1)}"`,
      `"${combinedNotes ? combinedNotes.replace(/"/g, '""') : ""}"`,
      (row.beginningBalance / factor).toFixed(2),
      (row.contribution / factor).toFixed(2),
      (row.growth / factor).toFixed(2),
      (row.withdrawal / factor).toFixed(2),
      (row.otherIncome / factor).toFixed(2),
      (row.endingBalance / factor).toFixed(2),
      (row.cumulativeContributed / factor).toFixed(2),
      (row.cumulativeGrowth / factor).toFixed(2),
    ];
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `retirement_amortization_schedule_${isRealMode ? "real" : "nominal"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function initAmortizationControls() {
  const btnNominal = document.getElementById("amort-mode-nominal");
  const btnReal = document.getElementById("amort-mode-real");
  const btnAll = document.getElementById("amort-interval-all");
  const btn5yr = document.getElementById("amort-interval-5yr");
  const filterAll = document.getElementById("amort-filter-all");
  const filterAccum = document.getElementById("amort-filter-accum");
  const filterRetire = document.getElementById("amort-filter-retire");
  const btnExport = document.getElementById("amort-export-csv");

  if (!btnNominal || !btnReal) return;

  btnNominal.addEventListener("click", () => {
    if (amortViewMode === "nominal") return;
    amortViewMode = "nominal";
    btnNominal.classList.add("active");
    btnReal.classList.remove("active");
    renderAmortizationSchedule();
  });

  btnReal.addEventListener("click", () => {
    if (amortViewMode === "real") return;
    amortViewMode = "real";
    btnReal.classList.add("active");
    btnNominal.classList.remove("active");
    renderAmortizationSchedule();
  });

  btnAll.addEventListener("click", () => {
    if (amortInterval === "all") return;
    amortInterval = "all";
    btnAll.classList.add("active");
    btn5yr.classList.remove("active");
    renderAmortizationSchedule();
  });

  btn5yr.addEventListener("click", () => {
    if (amortInterval === "5yr") return;
    amortInterval = "5yr";
    btn5yr.classList.add("active");
    btnAll.classList.remove("active");
    renderAmortizationSchedule();
  });

  filterAll.addEventListener("click", () => {
    if (amortPhaseFilter === "all") return;
    amortPhaseFilter = "all";
    filterAll.classList.add("active");
    filterAccum.classList.remove("active");
    filterRetire.classList.remove("active");
    renderAmortizationSchedule();
  });

  filterAccum.addEventListener("click", () => {
    if (amortPhaseFilter === "accum") return;
    amortPhaseFilter = "accum";
    filterAccum.classList.add("active");
    filterAll.classList.remove("active");
    filterRetire.classList.remove("active");
    renderAmortizationSchedule();
  });

  filterRetire.addEventListener("click", () => {
    if (amortPhaseFilter === "retire") return;
    amortPhaseFilter = "retire";
    filterRetire.classList.add("active");
    filterAll.classList.remove("active");
    filterAccum.classList.remove("active");
    renderAmortizationSchedule();
  });

  btnExport.addEventListener("click", () => {
    if (!currentScheduleData) return;
    exportScheduleToCSV(currentScheduleData, amortViewMode === "real");
  });
}

// ===================================================================
// SYNCHRONIZED SLIDERS & REAL-TIME RECALCULATION
// ===================================================================

const PAIRED_SLIDERS = [
  { inputId: "fire-current-age", sliderId: "fire-current-age-slider", min: 18, max: 75, step: 1 },
  { inputId: "fire-retire-age", sliderId: "fire-retire-age-slider", min: 25, max: 85, step: 1 },
  { inputId: "fire-life-expectancy", sliderId: "fire-life-expectancy-slider", min: 60, max: 105, step: 1 },
  { inputId: "fire-contrib-growth", sliderId: "fire-contrib-growth-slider", min: 0, max: 10, step: 0.25 },
  { inputId: "fire-current-portfolio", sliderId: "fire-current-portfolio-slider", min: 0, max: 1000000, step: 5000 },
  { inputId: "fire-monthly-contribution", sliderId: "fire-monthly-contribution-slider", min: 0, max: 10000, step: 100 },
  { inputId: "fire-annual-return", sliderId: "fire-annual-return-slider", min: 1, max: 15, step: 0.25 },
  { inputId: "fire-inflation", sliderId: "fire-inflation-slider", min: 0, max: 10, step: 0.25 },
  { inputId: "fire-annual-expenses", sliderId: "fire-annual-expenses-slider", min: 10000, max: 200000, step: 1000 },
  { inputId: "fire-withdrawal-rate", sliderId: "fire-withdrawal-rate-slider", min: 1, max: 8, step: 0.1 },
  { inputId: "fire-other-income", sliderId: "fire-other-income-slider", min: 0, max: 80000, step: 1000 },
];

const triggerLiveCalculation = rafThrottle(() => {
  if (!coastFireTab.classList.contains("hidden")) {
    handleCoastCalculate({ scroll: false });
  } else {
    handleFireCalculate({ scroll: false });
  }
});

function syncSliderWithInput(input, slider) {
  if (!input || !slider) return;
  const val = parseFloat(input.value);
  if (Number.isFinite(val)) {
    if (val > parseFloat(slider.max)) {
      slider.max = Math.ceil(val * 1.5);
    }
    slider.value = val;
  }
}

function initPairedSliders() {
  PAIRED_SLIDERS.forEach(({ inputId, sliderId, min, max, step }) => {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);
    if (!input || !slider) return;

    slider.min = min;
    slider.max = max;
    slider.step = step;

    syncSliderWithInput(input, slider);

    slider.addEventListener("input", () => {
      input.value = slider.value;

      // Smart age constraints while sliding
      if (inputId === "fire-current-age") {
        const currentAge = parseInt(slider.value, 10);
        const retireInput = document.getElementById("fire-retire-age");
        const retireSlider = document.getElementById("fire-retire-age-slider");
        if (retireInput && parseInt(retireInput.value, 10) <= currentAge) {
          retireInput.value = currentAge + 1;
          if (retireSlider) retireSlider.value = currentAge + 1;
        }
      } else if (inputId === "fire-retire-age") {
        const retireAge = parseInt(slider.value, 10);
        const currentInput = document.getElementById("fire-current-age");
        const currentSlider = document.getElementById("fire-current-age-slider");
        if (currentInput && parseInt(currentInput.value, 10) >= retireAge) {
          currentInput.value = Math.max(18, retireAge - 1);
          if (currentSlider) currentSlider.value = currentInput.value;
        }
        const lifeInput = document.getElementById("fire-life-expectancy");
        const lifeSlider = document.getElementById("fire-life-expectancy-slider");
        if (lifeInput && parseInt(lifeInput.value, 10) <= retireAge) {
          lifeInput.value = retireAge + 5;
          if (lifeSlider) lifeSlider.value = lifeInput.value;
        }
      }

      if (inputId === "fire-current-portfolio") {
        syncAssetSplitFromMainPortfolio(safeParseFloat(slider.value, 0));
      } else if (inputId === "fire-monthly-contribution") {
        syncAssetSplitFromMainContribution(safeParseFloat(slider.value, 0));
      }

      saveFireInputs();
      triggerLiveCalculation();
    });

    input.addEventListener("input", () => {
      syncSliderWithInput(input, slider);

      if (inputId === "fire-current-portfolio") {
        syncAssetSplitFromMainPortfolio(safeParseFloat(input.value, 0));
      } else if (inputId === "fire-monthly-contribution") {
        syncAssetSplitFromMainContribution(safeParseFloat(input.value, 0));
      }

      saveFireInputs();
      triggerLiveCalculation();
    });
  });

  // Also sync sliders when inputs are initially loaded
  PAIRED_SLIDERS.forEach(({ inputId, sliderId }) => {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);
    syncSliderWithInput(input, slider);
  });
}

// ===================================================================
// CAREER MILESTONES & CONTRIBUTION INJECTIONS
// ===================================================================

let careerMilestones = [];

function generateMilestoneId() {
  return "m_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
}

function renderMilestonesUI() {
  const container = document.getElementById("fire-milestones-list");
  if (!container) return;

  if (careerMilestones.length === 0) {
    container.innerHTML = `
      <div class="milestones-empty">
        No career milestones added yet. Click <strong>+ Add Career Milestone</strong> above to model promotions, salary jumps, or bonuses.
      </div>
    `;
    return;
  }

  // Sort by age ascending
  careerMilestones.sort((a, b) => a.age - b.age);

  container.innerHTML = "";
  careerMilestones.forEach((m) => {
    const item = document.createElement("div");
    item.className = "milestone-item";
    item.dataset.id = m.id;

    item.innerHTML = `
      <div class="milestone-field">
        <label class="milestone-field-label">Age</label>
        <input type="number" class="milestone-age" min="18" max="100" step="1" value="${m.age}" aria-label="Milestone Age" />
      </div>
      <div class="milestone-field">
        <label class="milestone-field-label">Type</label>
        <select class="milestone-type" aria-label="Milestone Type">
          <option value="new_monthly" ${m.type === "new_monthly" ? "selected" : ""}>Set Monthly ($/mo)</option>
          <option value="delta_monthly" ${m.type === "delta_monthly" ? "selected" : ""}>Add Monthly (+$/mo)</option>
          <option value="lump_sum" ${m.type === "lump_sum" ? "selected" : ""}>One-Time Lump Sum ($)</option>
        </select>
      </div>
      <div class="milestone-field">
        <label class="milestone-field-label">Amount ($)</label>
        <input type="number" class="milestone-amount" min="0" step="100" value="${m.amount}" aria-label="Milestone Amount" />
      </div>
      <div class="milestone-field flex-grow">
        <label class="milestone-field-label">Note / Reason</label>
        <input type="text" class="milestone-note" placeholder="e.g. Promotion, Bonus" value="${m.note || ""}" aria-label="Milestone Note" />
      </div>
      <button type="button" class="btn-delete-milestone" title="Delete Milestone" aria-label="Delete Milestone">✕</button>
    `;

    const ageInput = item.querySelector(".milestone-age");
    const typeSelect = item.querySelector(".milestone-type");
    const amountInput = item.querySelector(".milestone-amount");
    const noteInput = item.querySelector(".milestone-note");
    const deleteBtn = item.querySelector(".btn-delete-milestone");

    ageInput.addEventListener("input", () => {
      m.age = parseInt(ageInput.value, 10) || 18;
      saveFireInputs();
      triggerLiveCalculation();
    });

    typeSelect.addEventListener("change", () => {
      m.type = typeSelect.value;
      saveFireInputs();
      triggerLiveCalculation();
    });

    amountInput.addEventListener("input", () => {
      m.amount = parseFloat(amountInput.value) || 0;
      saveFireInputs();
      triggerLiveCalculation();
    });

    noteInput.addEventListener("input", () => {
      m.note = noteInput.value;
      saveFireInputs();
      triggerLiveCalculation();
    });

    deleteBtn.addEventListener("click", () => {
      removeMilestone(m.id);
    });

    container.appendChild(item);
  });
}

function addMilestone(defaultData = null) {
  const currentAge = safeParseInt(document.getElementById("fire-current-age")?.value, 32);
  const retireAge = safeParseInt(document.getElementById("fire-retire-age")?.value, 55);
  const defaultAge = Math.min(Math.max(18, retireAge - 1), currentAge + 3);

  const newMilestone = defaultData || {
    id: generateMilestoneId(),
    age: Math.max(currentAge + 1, defaultAge),
    type: "new_monthly",
    amount: 3500,
    note: "Promotion",
  };

  careerMilestones.push(newMilestone);
  renderMilestonesUI();
  saveFireInputs();
  triggerLiveCalculation();
}

function removeMilestone(id) {
  careerMilestones = careerMilestones.filter((m) => m.id !== id);
  renderMilestonesUI();
  saveFireInputs();
  triggerLiveCalculation();
}

function initMilestonesControls() {
  const addBtn = document.getElementById("fire-add-milestone-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addMilestone();
    });
  }
}

// ===================================================================
// RETIREMENT EXPENSE ESTIMATOR MODAL
// ===================================================================

const EXPENSE_PRESETS = {
  lean: {
    "exp-housing-mortgage": 1100,
    "exp-housing-tax": 250,
    "exp-housing-utilities": 250,
    "exp-living-groceries": 450,
    "exp-living-dining": 150,
    "exp-health-premium": 400,
    "exp-health-oop": 100,
    "exp-transport-car": 150,
    "exp-transport-maint": 150,
    "exp-kids-monthly": 0,
    "exp-kids-college": 0,
    "exp-fun-travel": 100,
    "exp-fun-hobbies": 50,
    "exp-misc-buffer": 50,
  },
  moderate: {
    "exp-housing-mortgage": 1600,
    "exp-housing-tax": 400,
    "exp-housing-utilities": 350,
    "exp-living-groceries": 650,
    "exp-living-dining": 300,
    "exp-health-premium": 500,
    "exp-health-oop": 150,
    "exp-transport-car": 250,
    "exp-transport-maint": 200,
    "exp-kids-monthly": 0,
    "exp-kids-college": 0,
    "exp-fun-travel": 350,
    "exp-fun-hobbies": 150,
    "exp-misc-buffer": 100,
  },
  comfortable: {
    "exp-housing-mortgage": 2400,
    "exp-housing-tax": 550,
    "exp-housing-utilities": 400,
    "exp-living-groceries": 900,
    "exp-living-dining": 500,
    "exp-health-premium": 700,
    "exp-health-oop": 200,
    "exp-transport-car": 400,
    "exp-transport-maint": 250,
    "exp-kids-monthly": 0,
    "exp-kids-college": 0,
    "exp-fun-travel": 650,
    "exp-fun-hobbies": 250,
    "exp-misc-buffer": 300,
  },
  deluxe: {
    "exp-housing-mortgage": 3000,
    "exp-housing-tax": 750,
    "exp-housing-utilities": 500,
    "exp-living-groceries": 1100,
    "exp-living-dining": 750,
    "exp-health-premium": 900,
    "exp-health-oop": 350,
    "exp-transport-car": 550,
    "exp-transport-maint": 350,
    "exp-kids-monthly": 0,
    "exp-kids-college": 0,
    "exp-fun-travel": 1000,
    "exp-fun-hobbies": 450,
    "exp-misc-buffer": 300,
  },
};

const EXPENSE_INPUT_IDS = [
  "exp-housing-mortgage",
  "exp-housing-tax",
  "exp-housing-utilities",
  "exp-living-groceries",
  "exp-living-dining",
  "exp-health-premium",
  "exp-health-oop",
  "exp-transport-car",
  "exp-transport-maint",
  "exp-kids-monthly",
  "exp-kids-college",
  "exp-fun-travel",
  "exp-fun-hobbies",
  "exp-misc-buffer",
];

function saveExpenseBreakdown() {
  const data = {};
  EXPENSE_INPUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  localStorage.setItem("fire_calculator_expense_breakdown", JSON.stringify(data));
}

function loadExpenseBreakdown() {
  try {
    const data = JSON.parse(localStorage.getItem("fire_calculator_expense_breakdown"));
    if (data) {
      Object.entries(data).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
    }
  } catch {
    // ignore
  }
}

const ESSENTIAL_EXPENSE_IDS = [
  "exp-housing-mortgage",
  "exp-housing-tax",
  "exp-housing-utilities",
  "exp-living-groceries",
  "exp-health-premium",
  "exp-health-oop",
  "exp-transport-car",
  "exp-transport-maint",
];

const DISCRETIONARY_EXPENSE_IDS = [
  "exp-living-dining",
  "exp-kids-monthly",
  "exp-kids-college",
  "exp-fun-travel",
  "exp-fun-hobbies",
  "exp-misc-buffer",
];

function updateExpenseModalSummary() {
  let essentialMonthly = 0;
  ESSENTIAL_EXPENSE_IDS.forEach((id) => {
    essentialMonthly += safeParseFloat(document.getElementById(id)?.value, 0);
  });

  let discretionaryMonthly = 0;
  DISCRETIONARY_EXPENSE_IDS.forEach((id) => {
    discretionaryMonthly += safeParseFloat(document.getElementById(id)?.value, 0);
  });

  const monthlyTotal = essentialMonthly + discretionaryMonthly;
  const annualTotal = monthlyTotal * 12;
  const essentialAnnual = essentialMonthly * 12;
  const discretionaryAnnual = discretionaryMonthly * 12;

  const essentialPct = annualTotal > 0 ? Math.round((essentialAnnual / annualTotal) * 100) : 0;
  const discretionaryPct = annualTotal > 0 ? Math.max(0, 100 - essentialPct) : 0;

  const monthlyDisplay = document.getElementById("exp-summary-monthly");
  const annualDisplay = document.getElementById("exp-summary-annual");
  const essentialDisplay = document.getElementById("exp-summary-essential");
  const discretionaryDisplay = document.getElementById("exp-summary-discretionary");
  const applyBtn = document.getElementById("fire-expense-modal-apply");
  const kidsTip = document.getElementById("exp-kids-tip");

  if (monthlyDisplay) {
    monthlyDisplay.textContent = `${formatCurrency(monthlyTotal)}/mo`;
  }
  if (annualDisplay) {
    annualDisplay.textContent = `${formatCurrency(annualTotal)}/yr`;
  }
  if (essentialDisplay) {
    essentialDisplay.textContent = `${formatCurrency(essentialAnnual)}/yr (${essentialPct}%)`;
  }
  if (discretionaryDisplay) {
    discretionaryDisplay.textContent = `${formatCurrency(discretionaryAnnual)}/yr (${discretionaryPct}%)`;
  }
  if (applyBtn) {
    applyBtn.textContent = `Apply to Calculator (${formatCurrency(annualTotal)}/yr)`;
  }

  // Persist structured expense classification for Drawdown Engine bridge
  try {
    localStorage.setItem("fire_expense_classification", JSON.stringify({
      essentialAnnual,
      discretionaryAnnual,
      essentialMonthly,
      discretionaryMonthly,
      essentialPct,
      discretionaryPct
    }));
  } catch {
    // ignore
  }

  const kidsMonthly =
    safeParseFloat(document.getElementById("exp-kids-monthly")?.value, 0) +
    safeParseFloat(document.getElementById("exp-kids-college")?.value, 0);

  if (kidsTip) {
    if (kidsMonthly > 0) {
      kidsTip.classList.remove("hidden");
      kidsTip.innerHTML = `💡 You have <strong>${formatCurrency(kidsMonthly)}/mo</strong> in child/dependent expenses. When applied, we'll auto-configure a milestone to drop these costs when kids turn 18 (age 49)!`;
    } else {
      kidsTip.classList.add("hidden");
    }
  }

  return { monthlyTotal, annualTotal, kidsMonthly, essentialAnnual, discretionaryAnnual };
}

function openExpenseModal() {
  const modal = document.getElementById("fire-expense-modal");
  if (!modal) return;
  loadExpenseBreakdown();
  modal.classList.remove("hidden");
  updateExpenseModalSummary();
}

function closeExpenseModal() {
  const modal = document.getElementById("fire-expense-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function applyExpenseModal() {
  const { annualTotal, kidsMonthly } = updateExpenseModalSummary();
  const expenseInput = document.getElementById("fire-annual-expenses");
  const expenseSlider = document.getElementById("fire-annual-expenses-slider");

  if (expenseInput) {
    expenseInput.value = Math.round(annualTotal);
    if (expenseSlider) {
      syncSliderWithInput(expenseInput, expenseSlider);
    }
  }

  // If child costs were entered, add an expense milestone at age 49 if not already present
  if (kidsMonthly > 0) {
    const kidsAnnual = Math.round(kidsMonthly * 12);
    const hasKidMilestone = expenseMilestones.some((m) => m.age === 49);
    if (!hasKidMilestone) {
      addExpenseMilestone({
        id: generateExpenseMilestoneId(),
        age: 49,
        type: "delta_annual",
        amount: -kidsAnnual,
        note: "Kids turn 18 & move out",
      });
    }
  }

  saveExpenseBreakdown();
  closeExpenseModal();
  saveFireInputs();
  triggerLiveCalculation();
}

function initExpenseModal() {
  const openBtn = document.getElementById("fire-open-expenses-calculator-btn");
  const closeBtn = document.getElementById("fire-expense-modal-close");
  const cancelBtn = document.getElementById("fire-expense-modal-cancel");
  const applyBtn = document.getElementById("fire-expense-modal-apply");
  const modal = document.getElementById("fire-expense-modal");

  if (openBtn) openBtn.addEventListener("click", openExpenseModal);
  if (closeBtn) closeBtn.addEventListener("click", closeExpenseModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeExpenseModal);
  if (applyBtn) applyBtn.addEventListener("click", applyExpenseModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeExpenseModal();
    });
  }

  // Presets
  const presetBtns = document.querySelectorAll(".btn-preset");
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetName = btn.dataset.preset;
      const presetData = EXPENSE_PRESETS[presetName];
      if (presetData) {
        presetBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        Object.entries(presetData).forEach(([id, val]) => {
          const el = document.getElementById(id);
          if (el) el.value = val;
        });
        saveExpenseBreakdown();
        updateExpenseModalSummary();
      }
    });
  });

  // Category Inputs
  EXPENSE_INPUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        presetBtns.forEach((b) => b.classList.remove("active"));
        saveExpenseBreakdown();
        updateExpenseModalSummary();
      });
    }
  });

  // Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeExpenseModal();
    }
  });
}

// ===================================================================
// LIFE-STAGE EXPENSE MILESTONES
// ===================================================================

let expenseMilestones = [];

function generateExpenseMilestoneId() {
  return "em_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
}

function renderExpenseMilestonesUI() {
  const container = document.getElementById("fire-expense-milestones-list");
  if (!container) return;

  if (expenseMilestones.length === 0) {
    container.innerHTML = `
      <div class="milestones-empty">
        No expense milestones added yet. Click <strong>+ Add Expense Milestone</strong> above to model future spending changes (e.g. kids moving out at 49, mortgage paid off, Medicare at 65).
      </div>
    `;
    return;
  }

  // Sort by age ascending
  expenseMilestones.sort((a, b) => a.age - b.age);

  container.innerHTML = "";
  expenseMilestones.forEach((m) => {
    const item = document.createElement("div");
    item.className = "milestone-item";
    item.dataset.id = m.id;

    item.innerHTML = `
      <div class="milestone-field">
        <label class="milestone-field-label">Age</label>
        <input type="number" class="milestone-age" min="18" max="105" step="1" value="${m.age}" aria-label="Expense Milestone Age" />
      </div>
      <div class="milestone-field">
        <label class="milestone-field-label">Type</label>
        <select class="milestone-type" aria-label="Expense Milestone Type">
          <option value="delta_annual" ${m.type === "delta_annual" ? "selected" : ""}>Adjust Annual (-/+$)</option>
          <option value="set_annual" ${m.type === "set_annual" ? "selected" : ""}>Set New Annual ($/yr)</option>
          <option value="one_time" ${m.type === "one_time" ? "selected" : ""}>One-Time Expense ($)</option>
        </select>
      </div>
      <div class="milestone-field">
        <label class="milestone-field-label">Amount ($/yr)</label>
        <input type="number" class="milestone-amount" step="500" value="${m.amount}" aria-label="Expense Milestone Amount" placeholder="e.g. -15000" />
      </div>
      <div class="milestone-field flex-grow">
        <label class="milestone-field-label">Note / Reason</label>
        <input type="text" class="milestone-note" placeholder="e.g. Kids move out, Mortgage paid off" value="${m.note || ""}" aria-label="Expense Milestone Note" />
      </div>
      <button type="button" class="btn-delete-milestone" title="Delete Milestone" aria-label="Delete Expense Milestone">✕</button>
    `;

    const ageInput = item.querySelector(".milestone-age");
    const typeSelect = item.querySelector(".milestone-type");
    const amountInput = item.querySelector(".milestone-amount");
    const noteInput = item.querySelector(".milestone-note");
    const deleteBtn = item.querySelector(".btn-delete-milestone");

    ageInput.addEventListener("input", () => {
      m.age = parseInt(ageInput.value, 10) || 18;
      saveFireInputs();
      triggerLiveCalculation();
    });

    typeSelect.addEventListener("change", () => {
      m.type = typeSelect.value;
      saveFireInputs();
      triggerLiveCalculation();
    });

    amountInput.addEventListener("input", () => {
      m.amount = parseFloat(amountInput.value) || 0;
      saveFireInputs();
      triggerLiveCalculation();
    });

    noteInput.addEventListener("input", () => {
      m.note = noteInput.value;
      saveFireInputs();
      triggerLiveCalculation();
    });

    deleteBtn.addEventListener("click", () => {
      removeExpenseMilestone(m.id);
    });

    container.appendChild(item);
  });
}

function addExpenseMilestone(defaultData = null) {
  const currentAge = safeParseInt(document.getElementById("fire-current-age")?.value, 32);
  const retireAge = safeParseInt(document.getElementById("fire-retire-age")?.value, 55);

  const newMilestone = defaultData || {
    id: generateExpenseMilestoneId(),
    age: 49,
    type: "delta_annual",
    amount: -15000,
    note: "Kids move out (age 18)",
  };

  expenseMilestones.push(newMilestone);
  renderExpenseMilestonesUI();
  saveFireInputs();
  triggerLiveCalculation();
}

function removeExpenseMilestone(id) {
  expenseMilestones = expenseMilestones.filter((m) => m.id !== id);
  renderExpenseMilestonesUI();
  saveFireInputs();
  triggerLiveCalculation();
}

function initExpenseMilestonesControls() {
  const addBtn = document.getElementById("fire-add-expense-milestone-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addExpenseMilestone();
    });
  }
}

// ===================================================================
// ASSET LOCATION SPLIT CONTROLS & TWO-WAY SYNC
// ===================================================================

function saveAssetSplit() {
  try {
    localStorage.setItem("fire_is_asset_split_active", JSON.stringify(isAssetSplitActive));
    localStorage.setItem("fire_asset_split", JSON.stringify(assetSplit));
  } catch {
    // ignore
  }
}

function loadAssetSplit() {
  try {
    const savedActive = localStorage.getItem("fire_is_asset_split_active");
    if (savedActive !== null) {
      isAssetSplitActive = JSON.parse(savedActive);
    }
    const savedSplit = localStorage.getItem("fire_asset_split");
    if (savedSplit) {
      assetSplit = { ...assetSplit, ...JSON.parse(savedSplit) };
    }
  } catch {
    // ignore
  }
  updateAssetSplitInputsFromState();
  updateAssetAllocationUI();
  updateAssetSplitDrawerUI();
}

function updateAssetSplitInputsFromState() {
  const pretaxInput = document.getElementById("fire-asset-pretax");
  const contribPretaxInput = document.getElementById("fire-contrib-pretax");
  const rothInput = document.getElementById("fire-asset-roth");
  const contribRothInput = document.getElementById("fire-contrib-roth");
  const taxableInput = document.getElementById("fire-asset-taxable");
  const taxableBasisInput = document.getElementById("fire-asset-taxable-basis");
  const contribTaxableInput = document.getElementById("fire-contrib-taxable");
  const cashInput = document.getElementById("fire-asset-cash");
  const contribCashInput = document.getElementById("fire-contrib-cash");

  if (pretaxInput) pretaxInput.value = Math.round(assetSplit.pretax);
  if (contribPretaxInput) contribPretaxInput.value = Math.round(assetSplit.contribPretax);
  if (rothInput) rothInput.value = Math.round(assetSplit.roth);
  if (contribRothInput) contribRothInput.value = Math.round(assetSplit.contribRoth);
  if (taxableInput) taxableInput.value = Math.round(assetSplit.taxable);
  if (taxableBasisInput) taxableBasisInput.value = Math.round(assetSplit.taxableBasis);
  if (contribTaxableInput) contribTaxableInput.value = Math.round(assetSplit.contribTaxable);
  if (cashInput) cashInput.value = Math.round(assetSplit.cash);
  if (contribCashInput) contribCashInput.value = Math.round(assetSplit.contribCash);
}

function updateAssetAllocationUI() {
  const totalBal = assetSplit.pretax + assetSplit.roth + assetSplit.taxable + assetSplit.cash;
  const pPretax = totalBal > 0 ? Math.round((assetSplit.pretax / totalBal) * 100) : 0;
  const pRoth = totalBal > 0 ? Math.round((assetSplit.roth / totalBal) * 100) : 0;
  const pTaxable = totalBal > 0 ? Math.round((assetSplit.taxable / totalBal) * 100) : 0;
  const pCash = totalBal > 0 ? Math.max(0, 100 - pPretax - pRoth - pTaxable) : 0;

  const pctPretaxEl = document.getElementById("asset-pct-pretax");
  const pctRothEl = document.getElementById("asset-pct-roth");
  const pctTaxableEl = document.getElementById("asset-pct-taxable");
  const pctCashEl = document.getElementById("asset-pct-cash");

  if (pctPretaxEl) pctPretaxEl.textContent = `${pPretax}%`;
  if (pctRothEl) pctRothEl.textContent = `${pRoth}%`;
  if (pctTaxableEl) pctTaxableEl.textContent = `${pTaxable}%`;
  if (pctCashEl) pctCashEl.textContent = `${pCash}%`;

  const barPretax = document.getElementById("alloc-bar-pretax");
  const barRoth = document.getElementById("alloc-bar-roth");
  const barTaxable = document.getElementById("alloc-bar-taxable");
  const barCash = document.getElementById("alloc-bar-cash");

  if (barPretax) {
    barPretax.style.width = `${pPretax}%`;
    barPretax.textContent = pPretax >= 10 ? `${pPretax}% Pre-Tax` : (pPretax > 0 ? `${pPretax}%` : "");
  }
  if (barRoth) {
    barRoth.style.width = `${pRoth}%`;
    barRoth.textContent = pRoth >= 10 ? `${pRoth}% Roth` : (pRoth > 0 ? `${pRoth}%` : "");
  }
  if (barTaxable) {
    barTaxable.style.width = `${pTaxable}%`;
    barTaxable.textContent = pTaxable >= 10 ? `${pTaxable}% Taxable` : (pTaxable > 0 ? `${pTaxable}%` : "");
  }
  if (barCash) {
    barCash.style.width = `${pCash}%`;
    barCash.textContent = pCash >= 10 ? `${pCash}% Cash` : (pCash > 0 ? `${pCash}%` : "");
  }
}

function updateAssetSplitDrawerUI() {
  const drawer = document.getElementById("fire-asset-split-drawer");
  const badge = document.getElementById("asset-split-status-badge");
  const chevron = document.getElementById("asset-split-chevron");
  const toggleBtn = document.getElementById("fire-toggle-asset-split-btn");

  if (isAssetSplitActive) {
    if (drawer) drawer.classList.remove("hidden");
    if (badge) {
      badge.textContent = "Split Active (Stacked Chart)";
      badge.classList.add("active");
    }
    if (chevron) chevron.textContent = "▲";
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
  } else {
    if (drawer) drawer.classList.add("hidden");
    if (badge) {
      badge.textContent = "Single Total";
      badge.classList.remove("active");
    }
    if (chevron) chevron.textContent = "▼";
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  }
}

function handleAssetAccountChange() {
  assetSplit.pretax = Math.max(0, safeParseFloat(document.getElementById("fire-asset-pretax")?.value, 0));
  assetSplit.contribPretax = Math.max(0, safeParseFloat(document.getElementById("fire-contrib-pretax")?.value, 0));

  assetSplit.roth = Math.max(0, safeParseFloat(document.getElementById("fire-asset-roth")?.value, 0));
  assetSplit.contribRoth = Math.max(0, safeParseFloat(document.getElementById("fire-contrib-roth")?.value, 0));

  assetSplit.taxable = Math.max(0, safeParseFloat(document.getElementById("fire-asset-taxable")?.value, 0));
  assetSplit.taxableBasis = Math.max(0, safeParseFloat(document.getElementById("fire-asset-taxable-basis")?.value, 0));
  assetSplit.contribTaxable = Math.max(0, safeParseFloat(document.getElementById("fire-contrib-taxable")?.value, 0));

  assetSplit.cash = Math.max(0, safeParseFloat(document.getElementById("fire-asset-cash")?.value, 0));
  assetSplit.contribCash = Math.max(0, safeParseFloat(document.getElementById("fire-contrib-cash")?.value, 0));

  const totalPortfolio = assetSplit.pretax + assetSplit.roth + assetSplit.taxable + assetSplit.cash;
  const totalContrib = assetSplit.contribPretax + assetSplit.contribRoth + assetSplit.contribTaxable + assetSplit.contribCash;

  const portInput = document.getElementById("fire-current-portfolio");
  const portSlider = document.getElementById("fire-current-portfolio-slider");
  if (portInput) {
    portInput.value = Math.round(totalPortfolio);
    if (portSlider) syncSliderWithInput(portInput, portSlider);
  }

  const contribInput = document.getElementById("fire-monthly-contribution");
  const contribSlider = document.getElementById("fire-monthly-contribution-slider");
  if (contribInput) {
    contribInput.value = Math.round(totalContrib);
    if (contribSlider) syncSliderWithInput(contribInput, contribSlider);
  }

  updateAssetAllocationUI();
  saveAssetSplit();
  saveFireInputs();
  triggerLiveCalculation();
}

function syncAssetSplitFromMainPortfolio(newTotal) {
  if (!isAssetSplitActive) return;
  const oldTotal = assetSplit.pretax + assetSplit.roth + assetSplit.taxable + assetSplit.cash;
  if (oldTotal > 0 && newTotal > 0) {
    const ratio = newTotal / oldTotal;
    assetSplit.pretax *= ratio;
    assetSplit.roth *= ratio;
    assetSplit.taxable *= ratio;
    assetSplit.taxableBasis *= ratio;
    assetSplit.cash *= ratio;
  } else {
    // 50/25/20/5 default split
    assetSplit.pretax = newTotal * 0.50;
    assetSplit.roth = newTotal * 0.25;
    assetSplit.taxable = newTotal * 0.20;
    assetSplit.taxableBasis = assetSplit.taxable * 0.80;
    assetSplit.cash = newTotal * 0.05;
  }
  updateAssetSplitInputsFromState();
  updateAssetAllocationUI();
  saveAssetSplit();
}

function syncAssetSplitFromMainContribution(newContrib) {
  if (!isAssetSplitActive) return;
  const oldTotal = assetSplit.contribPretax + assetSplit.contribRoth + assetSplit.contribTaxable + assetSplit.contribCash;
  if (oldTotal > 0 && newContrib > 0) {
    const ratio = newContrib / oldTotal;
    assetSplit.contribPretax *= ratio;
    assetSplit.contribRoth *= ratio;
    assetSplit.contribTaxable *= ratio;
    assetSplit.contribCash *= ratio;
  } else {
    assetSplit.contribPretax = newContrib * 0.50;
    assetSplit.contribRoth = newContrib * 0.25;
    assetSplit.contribTaxable = newContrib * 0.20;
    assetSplit.contribCash = newContrib * 0.05;
  }
  updateAssetSplitInputsFromState();
  saveAssetSplit();
}

function resetAssetSplitToDefault() {
  const currentPort = safeParseFloat(document.getElementById("fire-current-portfolio")?.value, 50000);
  const currentContrib = safeParseFloat(document.getElementById("fire-monthly-contribution")?.value, 2000);

  assetSplit.pretax = Math.round(currentPort * 0.50);
  assetSplit.roth = Math.round(currentPort * 0.25);
  assetSplit.taxable = Math.round(currentPort * 0.20);
  assetSplit.taxableBasis = Math.round(assetSplit.taxable * 0.80);
  assetSplit.cash = Math.round(currentPort * 0.05);

  assetSplit.contribPretax = Math.round(currentContrib * 0.50);
  assetSplit.contribRoth = Math.round(currentContrib * 0.25);
  assetSplit.contribTaxable = Math.round(currentContrib * 0.20);
  assetSplit.contribCash = Math.round(currentContrib * 0.05);

  updateAssetSplitInputsFromState();
  updateAssetAllocationUI();
  saveAssetSplit();
  triggerLiveCalculation();
}

function initAssetSplitControls() {
  const toggleBtn = document.getElementById("fire-toggle-asset-split-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isAssetSplitActive = !isAssetSplitActive;
      updateAssetSplitDrawerUI();
      saveAssetSplit();
      triggerLiveCalculation();
    });
  }

  const resetBtn = document.getElementById("fire-reset-asset-split-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetAssetSplitToDefault();
    });
  }

  const splitInputIds = [
    "fire-asset-pretax",
    "fire-contrib-pretax",
    "fire-asset-roth",
    "fire-contrib-roth",
    "fire-asset-taxable",
    "fire-asset-taxable-basis",
    "fire-contrib-taxable",
    "fire-asset-cash",
    "fire-contrib-cash",
  ];

  splitInputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", handleAssetAccountChange);
    }
  });

  loadAssetSplit();
}

// ===== INITIALIZATION ON PAGE LOAD =====
loadFireInputs();
initAmortizationControls();
initPairedSliders();
initMilestonesControls();
initExpenseMilestonesControls();
initExpenseModal();
initAssetSplitControls();

// Auto-calculate on initial load if inputs exist
if (
  document.getElementById("fire-current-age")?.value &&
  document.getElementById("fire-annual-expenses")?.value
) {
  handleFireCalculate({ scroll: false });
}
