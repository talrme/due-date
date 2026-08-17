const SOURCE_DATA = [
    { day: 259, first: 1.0, later: 1.4 },
    { day: 260, first: 1.2, later: 1.5 },
    { day: 261, first: 1.2, later: 1.5 },
    { day: 262, first: 1.3, later: 1.5 },
    { day: 263, first: 1.4, later: 1.7 },
    { day: 264, first: 1.5, later: 1.8 },
    { day: 265, first: 1.7, later: 2.1 },
    { day: 266, first: 2.1, later: 2.7 },
    { day: 267, first: 2.3, later: 2.9 },
    { day: 268, first: 2.6, later: 3.2 },
    { day: 269, first: 2.9, later: 3.4 },
    { day: 270, first: 3.1, later: 3.7 },
    { day: 271, first: 3.5, later: 4.1 },
    { day: 272, first: 3.8, later: 4.5 },
    { day: 273, first: 5.0, later: 7.0 },
    { day: 274, first: 5.4, later: 6.5 },
    { day: 275, first: 5.3, later: 5.8 },
    { day: 276, first: 5.3, later: 5.4 },
    { day: 277, first: 5.3, later: 5.0 },
    { day: 278, first: 5.2, later: 4.8 },
    { day: 279, first: 5.2, later: 4.5 },
    { day: 280, first: 5.3, later: 4.5 },
    { day: 281, first: 5.0, later: 4.1 },
    { day: 282, first: 4.5, later: 3.4 },
    { day: 283, first: 4.0, later: 2.9 },
    { day: 284, first: 3.4, later: 2.4 },
    { day: 285, first: 2.9, later: 2.0 },
    { day: 286, first: 2.4, later: 1.6 },
    { day: 287, first: 2.1, later: 1.4 },
    { day: 288, first: 1.5, later: 0.9 },
    { day: 289, first: 0.9, later: 0.6 },
    { day: 290, first: 0.5, later: 0.4 },
    { day: 291, first: 0.4, later: 0.3 },
    { day: 292, first: 0.2, later: 0.2 },
    { day: 293, first: 0.2, later: 0.1 },
    { day: 294, first: 0.1, later: 0.1 },
    { day: 295, first: 0.1, later: 0.0 },
    { day: 296, first: 0.0, later: 0.0 },
    { day: 297, first: 0.0, later: 0.0 },
    { day: 298, first: 0.0, later: 0.0 }
];

const STORAGE_KEY = "due-date:settings";
const DEFAULT_SETTINGS = {
    dueDate: "2026-09-19",
    rememberDueDate: true,
    showFirst: true,
    showLater: true,
    showPdf: true,
    showCdf: true,
    showTable: true,
    smoothLines: true
};

const chartEl = document.getElementById("chart");
const tooltipEl = document.getElementById("chart-tooltip");
const dueDateInput = document.getElementById("due-date-input");
const dueDateSummary = document.getElementById("due-date-summary");
const tableBody = document.getElementById("cdf-table-body");
const tableSection = document.querySelector(".table-section");
const settingsModal = document.getElementById("settings-modal");
const rememberDueDateToggle = document.getElementById("remember-due-date");
const showTableToggle = document.getElementById("show-table");
const smoothLinesToggle = document.getElementById("smooth-lines");

let settings = loadSettings();
let selectedDay = null;

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        if (!merged.rememberDueDate) {
            merged.dueDate = DEFAULT_SETTINGS.dueDate;
        }
        return merged;
    } catch (error) {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings() {
    try {
        const toSave = { ...settings };
        if (!toSave.rememberDueDate) {
            delete toSave.dueDate;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
        // Local preferences are nice to have; the chart can still run without them.
    }
}

function resetAll() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        // Ignore storage failures.
    }
    settings = { ...DEFAULT_SETTINGS };
    selectedDay = null;
    syncControls();
    render();
}

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseISODate(value) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day, 12);
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDate(date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    }).format(date);
}

function formatTableDate(date) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function gestationalAge(day) {
    return {
        week: Math.floor(day / 7),
        day: day % 7
    };
}

function gestationalLabel(day) {
    const age = gestationalAge(day);
    return `${age.week}w ${age.day}d`;
}

function enrichData() {
    const dueDate = parseISODate(settings.dueDate);
    const firstTotal = SOURCE_DATA.reduce((sum, row) => sum + row.first, 0);
    const laterTotal = SOURCE_DATA.reduce((sum, row) => sum + row.later, 0);
    let firstRunning = 0;
    let laterRunning = 0;

    return SOURCE_DATA.map((row) => {
        firstRunning += row.first;
        laterRunning += row.later;
        const deliveryDate = addDays(dueDate, row.day - 280);
        return {
            ...row,
            date: deliveryDate,
            dateLabel: formatDate(deliveryDate),
            tableDateLabel: formatTableDate(deliveryDate),
            gestationalLabel: gestationalLabel(row.day),
            firstCdf: firstRunning / firstTotal * 100,
            laterCdf: laterRunning / laterTotal * 100
        };
    });
}

function syncControls() {
    dueDateInput.value = settings.dueDate;
    dueDateSummary.textContent = `${formatTableDate(parseISODate(settings.dueDate))} at 40w 0d`;
    rememberDueDateToggle.checked = settings.rememberDueDate;
    showTableToggle.checked = settings.showTable;
    smoothLinesToggle.checked = settings.smoothLines;

    document.querySelectorAll("[data-series]").forEach((button) => {
        const key = button.dataset.series === "first" ? "showFirst" : "showLater";
        button.classList.toggle("active", settings[key]);
        button.setAttribute("aria-pressed", String(settings[key]));
    });

    document.querySelectorAll("[data-chart]").forEach((button) => {
        const key = button.dataset.chart === "pdf" ? "showPdf" : "showCdf";
        button.classList.toggle("active", settings[key]);
        button.setAttribute("aria-pressed", String(settings[key]));
    });
}

function updateSetting(key, value) {
    settings[key] = value;

    if (!settings.showFirst && !settings.showLater) {
        settings[key] = true;
    }
    if (!settings.showPdf && !settings.showCdf) {
        settings[key] = true;
    }

    saveSettings();
    syncControls();
    render();
}

function yFor(value, max, top, height) {
    return top + height - (value / max * height);
}

function pathFor(points, smooth) {
    if (!points.length) return "";
    if (!smooth) {
        return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    }

    return points.reduce((path, point, index, array) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = array[index - 1];
        const midX = (previous.x + point.x) / 2;
        return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    }, "");
}

function renderChart(rows) {
    const width = 1100;
    const height = 500;
    const margin = { top: 34, right: 72, bottom: 86, left: 64 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const step = plotWidth / (rows.length - 1);
    const maxPdf = 8;
    const maxCdf = 100;
    const barWidth = Math.min(12, step * 0.34);
    const showTwoBars = settings.showFirst && settings.showLater;
    const selected = selectedDay ? rows.find((row) => row.day === selectedDay) : null;

    function xFor(index) {
        return margin.left + index * step;
    }

    const gridMax = settings.showPdf ? maxPdf : maxCdf;
    const gridTicks = settings.showPdf ? [0, 2, 4, 6, 8] : [0, 25, 50, 75, 100];
    const grid = gridTicks.map((tick) => {
        const y = yFor(tick, gridMax, margin.top, plotHeight);
        return `
            <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
            <text class="y-label" x="${margin.left - 12}" y="${y + 4}" text-anchor="end">${tick}%</text>
        `;
    }).join("");

    const rightAxis = settings.showPdf && settings.showCdf ? [0, 25, 50, 75, 100].map((tick) => {
        const y = yFor(tick, maxCdf, margin.top, plotHeight);
        return `<text class="y-label" x="${width - margin.right + 12}" y="${y + 4}">${tick}%</text>`;
    }).join("") : "";

    const weekLabels = [];
    for (let week = 37; week <= 42; week += 1) {
        const weekRows = rows.filter((row) => gestationalAge(row.day).week === week);
        if (!weekRows.length) continue;
        const firstIndex = rows.indexOf(weekRows[0]);
        const lastIndex = rows.indexOf(weekRows[weekRows.length - 1]);
        const center = (xFor(firstIndex) + xFor(lastIndex)) / 2;
        weekLabels.push(`<text class="week-label" x="${center}" y="${height - 26}" text-anchor="middle">${week} weeks</text>`);
    }

    const dayLabels = rows.map((row, index) => {
        const age = gestationalAge(row.day);
        return `<text class="day-label" x="${xFor(index)}" y="${height - 54}" text-anchor="middle">${age.day}</text>`;
    }).join("");

    const bars = rows.map((row, index) => {
        const x = xFor(index);
        const firstHeight = plotHeight - (yFor(row.first, maxPdf, margin.top, plotHeight) - margin.top);
        const laterHeight = plotHeight - (yFor(row.later, maxPdf, margin.top, plotHeight) - margin.top);
        const firstX = x - (showTwoBars ? barWidth + 1 : barWidth / 2);
        const laterX = x + (showTwoBars ? 1 : -barWidth / 2);
        const firstBar = settings.showFirst && settings.showPdf
            ? `<rect class="bar first-color" x="${firstX}" y="${yFor(row.first, maxPdf, margin.top, plotHeight)}" width="${barWidth}" height="${firstHeight}" rx="3"></rect>`
            : "";
        const laterBar = settings.showLater && settings.showPdf
            ? `<rect class="bar later-color" x="${laterX}" y="${yFor(row.later, maxPdf, margin.top, plotHeight)}" width="${barWidth}" height="${laterHeight}" rx="3"></rect>`
            : "";
        return firstBar + laterBar;
    }).join("");

    const firstCdfPoints = rows.map((row, index) => ({ x: xFor(index), y: yFor(row.firstCdf, maxCdf, margin.top, plotHeight) }));
    const laterCdfPoints = rows.map((row, index) => ({ x: xFor(index), y: yFor(row.laterCdf, maxCdf, margin.top, plotHeight) }));

    const cdfLines = settings.showCdf
        ? `
            ${settings.showFirst ? `<path class="line-path cdf-first" d="${pathFor(firstCdfPoints, settings.smoothLines)}"></path>` : ""}
            ${settings.showLater ? `<path class="line-path cdf-later" d="${pathFor(laterCdfPoints, settings.smoothLines)}"></path>` : ""}
        `
        : "";

    const points = rows.map((row, index) => {
        const x = xFor(index);
        return `
            ${settings.showFirst && settings.showCdf ? `<circle class="point cdf-first" cx="${x}" cy="${yFor(row.firstCdf, maxCdf, margin.top, plotHeight)}" r="4"></circle>` : ""}
            ${settings.showLater && settings.showCdf ? `<circle class="point cdf-later" cx="${x}" cy="${yFor(row.laterCdf, maxCdf, margin.top, plotHeight)}" r="4"></circle>` : ""}
        `;
    }).join("");

    const focus = selected
        ? `<line class="focus-line" x1="${xFor(rows.indexOf(selected))}" y1="${margin.top}" x2="${xFor(rows.indexOf(selected))}" y2="${height - margin.bottom + 18}"></line>`
        : "";

    const hitZones = rows.map((row, index) => {
        const x = xFor(index);
        return `<rect class="hit-zone" data-day="${row.day}" x="${x - step / 2}" y="${margin.top}" width="${step}" height="${plotHeight + 54}"></rect>`;
    }).join("");

    chartEl.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
            ${grid}
            ${rightAxis}
            <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
            <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>
            ${settings.showPdf && settings.showCdf ? `<line class="axis-line" x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>` : ""}
            <text class="y-label" x="${margin.left}" y="18">${settings.showPdf ? "daily chance" : "born by date"}</text>
            ${settings.showPdf && settings.showCdf ? `<text class="y-label" x="${width - margin.right}" y="18" text-anchor="end">born by date</text>` : ""}
            ${bars}
            ${cdfLines}
            ${points}
            ${focus}
            ${dayLabels}
            ${weekLabels.join("")}
            ${hitZones}
        </svg>
    `;

    chartEl.querySelectorAll(".hit-zone").forEach((zone) => {
        const day = Number(zone.dataset.day);
        const row = rows.find((item) => item.day === day);
        zone.addEventListener("mouseenter", (event) => showTooltip(row, event));
        zone.addEventListener("mousemove", (event) => showTooltip(row, event));
        zone.addEventListener("mouseleave", hideTooltip);
        zone.addEventListener("click", (event) => {
            selectedDay = day;
            renderChart(rows);
            showTooltip(row, event, true);
        });
    });

    requestAnimationFrame(() => {
        const centerDay = selectedDay || 280;
        const centerIndex = rows.findIndex((row) => row.day === centerDay);
        if (centerIndex < 0) return;
        chartEl.scrollLeft = Math.max(0, xFor(centerIndex) - chartEl.clientWidth / 2);
    });
}

function showTooltip(row, event, persist = false) {
    const firstHtml = settings.showFirst ? `
        <div><span>1st daily</span>${row.first.toFixed(1)}%</div>
        <div><span>1st by then</span>${row.firstCdf.toFixed(1)}%</div>
    ` : "";
    const laterHtml = settings.showLater ? `
        <div><span>2nd+ daily</span>${row.later.toFixed(1)}%</div>
        <div><span>2nd+ by then</span>${row.laterCdf.toFixed(1)}%</div>
    ` : "";

    tooltipEl.innerHTML = `
        <div class="tooltip-title">${row.dateLabel} · ${row.gestationalLabel}</div>
        <div class="tooltip-grid">
            ${firstHtml}
            ${laterHtml}
        </div>
    `;

    tooltipEl.classList.add("is-visible");
    moveTooltip(event);
    tooltipEl.dataset.persist = String(persist);
}

function moveTooltip(event) {
    const padding = 14;
    const rect = tooltipEl.getBoundingClientRect();
    let left = event.clientX + 16;
    let top = event.clientY + 16;

    if (left + rect.width > window.innerWidth - padding) {
        left = event.clientX - rect.width - 16;
    }
    if (top + rect.height > window.innerHeight - padding) {
        top = event.clientY - rect.height - 16;
    }

    tooltipEl.style.left = `${Math.max(padding, left)}px`;
    tooltipEl.style.top = `${Math.max(padding, top)}px`;
}

function hideTooltip() {
    if (tooltipEl.dataset.persist === "true") return;
    tooltipEl.classList.remove("is-visible");
}

function renderTable(rows) {
    tableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>${row.tableDateLabel}</td>
            <td>${row.gestationalLabel}</td>
            <td>${row.firstCdf.toFixed(1)}%</td>
            <td>${row.laterCdf.toFixed(1)}%</td>
        </tr>
    `).join("");
}

function render() {
    const rows = enrichData();
    tableSection.classList.toggle("is-hidden", !settings.showTable);
    renderChart(rows);
    renderTable(rows);
}

function openSettings() {
    settingsModal.classList.add("active");
    settingsModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.getElementById("close-settings").focus();
}

function closeSettings() {
    settingsModal.classList.remove("active");
    settingsModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.getElementById("settings-button").focus();
}

function setupEvents() {
    dueDateInput.addEventListener("change", () => {
        settings.dueDate = dueDateInput.value || DEFAULT_SETTINGS.dueDate;
        saveSettings();
        syncControls();
        render();
    });

    document.querySelectorAll("[data-series]").forEach((button) => {
        button.addEventListener("click", () => {
            updateSetting(button.dataset.series === "first" ? "showFirst" : "showLater", !button.classList.contains("active"));
        });
    });

    document.querySelectorAll("[data-chart]").forEach((button) => {
        button.addEventListener("click", () => {
            updateSetting(button.dataset.chart === "pdf" ? "showPdf" : "showCdf", !button.classList.contains("active"));
        });
    });

    document.getElementById("settings-button").addEventListener("click", openSettings);
    document.getElementById("close-settings").addEventListener("click", closeSettings);
    settingsModal.addEventListener("click", (event) => {
        if (event.target === settingsModal) closeSettings();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && settingsModal.classList.contains("active")) closeSettings();
        if (event.key === "Escape") {
            tooltipEl.classList.remove("is-visible");
            tooltipEl.dataset.persist = "false";
            selectedDay = null;
            render();
        }
    });

    rememberDueDateToggle.addEventListener("change", () => {
        settings.rememberDueDate = rememberDueDateToggle.checked;
        saveSettings();
    });
    showTableToggle.addEventListener("change", () => updateSetting("showTable", showTableToggle.checked));
    smoothLinesToggle.addEventListener("change", () => updateSetting("smoothLines", smoothLinesToggle.checked));
    document.getElementById("clear-memory").addEventListener("click", resetAll);
    document.getElementById("reset-banner").addEventListener("click", resetAll);
    document.addEventListener("click", (event) => {
        if (!chartEl.contains(event.target) && !tooltipEl.contains(event.target)) {
            tooltipEl.classList.remove("is-visible");
            tooltipEl.dataset.persist = "false";
        }
    });
}

syncControls();
setupEvents();
render();
