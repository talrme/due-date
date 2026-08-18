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
const SUMMARY_PERCENTILE = 85;
const CHART_DEFAULTS_VERSION = 2;
const DEFAULT_SETTINGS = {
    dueDate: "2026-09-19",
    rememberDueDate: true,
    chartDefaultsVersion: CHART_DEFAULTS_VERSION,
    showFirst: true,
    showLater: true,
    showPdf: true,
    showCdf: true,
    showTable: true,
    smoothLines: true,
    showMedian: true,
    showDueDate: true
};

const chartEl = document.getElementById("chart");
const tooltipEl = document.getElementById("chart-tooltip");
const mobileAxisEl = document.getElementById("mobile-y-axis");
const dueDateInput = document.getElementById("due-date-input");
const timingSummaryEl = document.getElementById("timing-summary");
const tableBody = document.getElementById("cdf-table-body");
const tableSection = document.querySelector(".table-section");
const settingsModal = document.getElementById("settings-modal");
const rememberDueDateToggle = document.getElementById("remember-due-date");
const showTableToggle = document.getElementById("show-table");
const smoothLinesToggle = document.getElementById("smooth-lines");
const showMedianToggle = document.getElementById("show-median");
const showDueDateToggle = document.getElementById("show-due-date");

let settings = loadSettings();
let selectedDay = null;
let suppressChartClickUntil = 0;

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        const migratedChartDefaults = saved.chartDefaultsVersion !== CHART_DEFAULTS_VERSION;
        if (migratedChartDefaults) {
            merged.chartDefaultsVersion = CHART_DEFAULTS_VERSION;
            merged.showFirst = true;
            merged.showLater = true;
            merged.showPdf = true;
            merged.showCdf = true;
        }
        if (!merged.rememberDueDate) {
            merged.dueDate = DEFAULT_SETTINGS.dueDate;
        }
        if (migratedChartDefaults) {
            const toSave = { ...merged };
            if (!toSave.rememberDueDate) {
                delete toSave.dueDate;
            }
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
            } catch (error) {
                // Local preferences are nice to have; the chart can still run without them.
            }
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

function gestationalLongLabel(day) {
    const age = gestationalAge(day);
    const weekLabel = age.week === 1 ? "week" : "weeks";
    const dayLabel = age.day === 1 ? "day" : "days";
    return `${age.week} ${weekLabel}, ${age.day} ${dayLabel}`;
}

function gestationalPreciseLabel(day) {
    let week = Math.floor(day / 7);
    let dayPart = Math.round((day - week * 7) * 10) / 10;
    if (dayPart >= 7) {
        week += 1;
        dayPart = 0;
    }
    const dayText = Number.isInteger(dayPart) ? String(dayPart) : dayPart.toFixed(1);
    return `${week}w ${dayText}d`;
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
            gestationalLongLabel: gestationalLongLabel(row.day),
            firstCdf: firstRunning / firstTotal * 100,
            laterCdf: laterRunning / laterTotal * 100
        };
    });
}

function syncControls() {
    dueDateInput.value = settings.dueDate;
    rememberDueDateToggle.checked = settings.rememberDueDate;
    showTableToggle.checked = settings.showTable;
    smoothLinesToggle.checked = settings.smoothLines;
    showMedianToggle.checked = settings.showMedian;
    showDueDateToggle.checked = settings.showDueDate;

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
    if (!smooth || points.length < 3) {
        return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    }

    const slopes = points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        return (next.y - point.y) / (next.x - point.x);
    });
    const tangents = points.map((point, index) => {
        if (index === 0) return slopes[0];
        if (index === points.length - 1) return slopes[slopes.length - 1];
        const previousSlope = slopes[index - 1];
        const nextSlope = slopes[index];
        if (previousSlope * nextSlope <= 0) return 0;
        return (previousSlope + nextSlope) / 2;
    });

    slopes.forEach((slope, index) => {
        if (slope === 0) {
            tangents[index] = 0;
            tangents[index + 1] = 0;
            return;
        }

        const firstRatio = tangents[index] / slope;
        const nextRatio = tangents[index + 1] / slope;
        const magnitude = Math.hypot(firstRatio, nextRatio);
        if (magnitude > 3) {
            const scale = 3 / magnitude;
            tangents[index] = scale * firstRatio * slope;
            tangents[index + 1] = scale * nextRatio * slope;
        }
    });

    return points.slice(0, -1).reduce((path, point, index) => {
        const next = points[index + 1];
        const dx = next.x - point.x;
        const controlOne = {
            x: point.x + dx / 3,
            y: point.y + tangents[index] * dx / 3
        };
        const controlTwo = {
            x: next.x - dx / 3,
            y: next.y - tangents[index + 1] * dx / 3
        };
        return `${path} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`;
    }, `M ${points[0].x} ${points[0].y}`);
}

function medianDayFor(rows, cdfKey) {
    return percentileDayFor(rows, cdfKey, 50);
}

function percentileDayFor(rows, cdfKey, percentile) {
    const current = rows.find((row) => row[cdfKey] >= percentile);
    if (!current) return rows[rows.length - 1].day;
    const currentIndex = rows.indexOf(current);
    if (currentIndex === 0) return current.day;

    const previous = rows[currentIndex - 1];
    const previousValue = previous[cdfKey];
    const currentValue = current[cdfKey];
    if (currentValue === previousValue) return current.day;

    const progress = (percentile - previousValue) / (currentValue - previousValue);
    return previous.day + progress * (current.day - previous.day);
}

function referenceMarkersFor(rows) {
    return [
        settings.showMedian && settings.showFirst
            ? {
                type: "median-first",
                className: "median-marker median-first",
                day: medianDayFor(rows, "firstCdf"),
                label: "Median for first baby",
                shortLabel: "Median first",
                detail: "50% chance baby arrives on or before this date"
            }
            : null,
        settings.showMedian && settings.showLater
            ? {
                type: "median-later",
                className: "median-marker median-later",
                day: medianDayFor(rows, "laterCdf"),
                label: "Median for second or later baby",
                shortLabel: "Median second+",
                detail: "50% chance baby arrives on or before this date"
            }
            : null,
        settings.showDueDate
            ? {
                type: "due-date",
                className: "due-date-marker",
                day: 280,
                label: "Due date",
                shortLabel: "Due date",
                detail: "40 weeks"
            }
            : null
    ].filter(Boolean);
}

function renderChart(rows) {
    const width = 1100;
    const height = 500;
    const margin = { top: 34, right: 96, bottom: 86, left: 62 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const step = plotWidth / (rows.length - 1);
    const maxPdf = 8;
    const maxCdf = 100;
    const cdfTicks = [0, 25, 50, 75, 100];
    const barWidth = Math.min(12, step * 0.34);
    const showTwoBars = settings.showFirst && settings.showLater;
    const selected = selectedDay ? rows.find((row) => row.day === selectedDay) : null;

    function xFor(index) {
        return margin.left + index * step;
    }

    function xForDay(day) {
        const firstDay = rows[0].day;
        const lastDay = rows[rows.length - 1].day;
        return margin.left + (day - firstDay) / (lastDay - firstDay) * plotWidth;
    }

    const gridMax = settings.showCdf ? maxCdf : maxPdf;
    const gridTicks = settings.showCdf ? cdfTicks : [0, 2, 4, 6, 8];
    const grid = gridTicks.map((tick) => {
        const y = yFor(tick, gridMax, margin.top, plotHeight);
        return `
            <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
        `;
    }).join("");

    const leftAxis = settings.showCdf ? cdfTicks.map((tick) => {
        const y = yFor(tick, maxCdf, margin.top, plotHeight);
        return `<text class="y-label y-label-left svg-left-axis" x="${margin.left - 12}" y="${y + 4}" text-anchor="end">${tick}%</text>`;
    }).join("") : "";

    const rightAxis = settings.showCdf ? cdfTicks.map((tick) => {
        const y = yFor(tick, maxCdf, margin.top, plotHeight);
        return `<text class="y-label" x="${width - margin.right + 12}" y="${y + 4}">${tick}%</text>`;
    }).join("") : "";

    if (mobileAxisEl) {
        const mobileAxisLabels = settings.showCdf ? cdfTicks.map((tick) => {
            const y = yFor(tick, maxCdf, margin.top, plotHeight);
            return `<span class="mobile-y-axis-label" style="top: ${y / height * 100}%">${tick}%</span>`;
        }).join("") : "";

        mobileAxisEl.innerHTML = settings.showCdf ? `
            <div class="mobile-y-axis-line"></div>
            ${mobileAxisLabels}
        ` : "";
        mobileAxisEl.classList.toggle("is-visible", settings.showCdf);
    }

    const rightAxisTitle = settings.showCdf
        ? `<text class="axis-title" text-anchor="middle" transform="translate(${width - 22} ${margin.top + plotHeight / 2}) rotate(90)">Probability baby is born by date</text>`
        : "";

    const weekLabels = [];
    for (let week = 37; week <= 42; week += 1) {
        const weekStartIndex = rows.findIndex((row) => {
            const age = gestationalAge(row.day);
            return age.week === week && age.day === 0;
        });
        if (weekStartIndex < 0) continue;
        weekLabels.push(`<text class="week-label" x="${xFor(weekStartIndex)}" y="${height - 26}" text-anchor="start">${week} weeks</text>`);
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

    const labelRowsByType = {
        "due-date": margin.top + 18,
        "median-first": margin.top + 38,
        "median-later": margin.top + 58
    };
    const referenceMarkers = referenceMarkersFor(rows).map((marker) => ({
        ...marker,
        labelY: labelRowsByType[marker.type] || margin.top + 18
    }));

    const markerLines = referenceMarkers.map((marker) => {
        const x = xForDay(marker.day);
        return `<line class="reference-line ${marker.className}" x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}"></line>`;
    }).join("");

    const markerLabels = referenceMarkers.map((marker) => {
        const x = xForDay(marker.day);
        return `<text class="reference-label ${marker.className}" x="${x + 7}" y="${marker.labelY}">${marker.shortLabel}</text>`;
    }).join("");

    const legendWidth = 248;
    const legendHeight = 28;
    const legendX = width - margin.right - legendWidth - 12;
    const legendY = height - margin.bottom - legendHeight - 12;
    const cdfLegend = settings.showCdf && settings.showFirst && settings.showLater
        ? `
            <g class="cdf-legend" transform="translate(${legendX} ${legendY})">
                <rect class="cdf-legend-bg" x="0" y="0" width="${legendWidth}" height="${legendHeight}" rx="14"></rect>
                <g class="legend-item" transform="translate(12 14)">
                    <line class="legend-line cdf-first" x1="0" y1="0" x2="24" y2="0"></line>
                    <text class="legend-label" x="32" y="4">First baby</text>
                </g>
                <g class="legend-item" transform="translate(126 14)">
                    <line class="legend-line cdf-later" x1="0" y1="0" x2="24" y2="0"></line>
                    <text class="legend-label" x="32" y="4">Second+</text>
                </g>
            </g>
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
        const zoneX = index === 0 ? 0 : x - step / 2;
        const zoneEnd = index === rows.length - 1 ? width : x + step / 2;
        return `<rect class="hit-zone" data-day="${row.day}" x="${zoneX}" y="0" width="${zoneEnd - zoneX}" height="${height}"></rect>`;
    }).join("");

    function anchorEventForRow(row) {
        const svg = chartEl.querySelector("svg");
        const rect = svg.getBoundingClientRect();
        const rowIndex = rows.findIndex((item) => item.day === row.day);
        return {
            clientX: rect.left + xFor(rowIndex) / width * rect.width,
            clientY: rect.top + (margin.top + plotHeight * 0.48) / height * rect.height
        };
    }

    function rowForPointerEvent(event) {
        const svg = chartEl.querySelector("svg");
        const rect = svg.getBoundingClientRect();
        const svgX = (event.clientX - rect.left) / rect.width * width;
        const boundedX = Math.max(margin.left, Math.min(width - margin.right, svgX));
        const rowIndex = Math.max(0, Math.min(rows.length - 1, Math.round((boundedX - margin.left) / step)));
        return rows[rowIndex];
    }

    function selectRow(row, event) {
        selectedDay = row.day;
        renderChart(rows);
        showTooltip(row, rows, event || anchorEventForRow(row), true);
    }

    function suppressSyntheticClick() {
        suppressChartClickUntil = performance.now() + 450;
    }

    chartEl.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
            ${grid}
            ${leftAxis}
            ${rightAxis}
            <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
            ${settings.showCdf ? `<line class="axis-line svg-left-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>` : ""}
            ${settings.showCdf ? `<line class="axis-line" x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>` : ""}
            ${rightAxisTitle}
            ${cdfLegend}
            ${markerLines}
            ${bars}
            ${cdfLines}
            ${points}
            ${focus}
            ${markerLabels}
            ${dayLabels}
            ${weekLabels.join("")}
            ${hitZones}
        </svg>
    `;

    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (supportsHover) {
        chartEl.querySelectorAll(".hit-zone").forEach((zone) => {
            const day = Number(zone.dataset.day);
            const row = rows.find((item) => item.day === day);
            zone.addEventListener("mouseenter", (event) => showTooltip(row, rows, event));
            zone.addEventListener("mousemove", (event) => showTooltip(row, rows, event));
            zone.addEventListener("mouseleave", hideTooltip);
        });
    }

    let chartPointerStart = null;
    chartEl.onpointerdown = (event) => {
        if (!event.target.closest("svg")) return;
        chartPointerStart = {
            x: event.clientX,
            y: event.clientY,
            scrollLeft: chartEl.scrollLeft
        };
    };
    chartEl.onpointerup = (event) => {
        if (!chartPointerStart || !event.target.closest("svg")) return;

        const moved = Math.hypot(event.clientX - chartPointerStart.x, event.clientY - chartPointerStart.y);
        const scrolled = Math.abs(chartEl.scrollLeft - chartPointerStart.scrollLeft);
        chartPointerStart = null;
        if (moved > 10 || scrolled > 6) {
            suppressSyntheticClick();
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        suppressSyntheticClick();
        selectRow(rowForPointerEvent(event), event);
    };
    chartEl.onpointercancel = () => {
        chartPointerStart = null;
    };
    chartEl.onclick = (event) => {
        if (!event.target.closest("svg")) return;
        if (performance.now() < suppressChartClickUntil) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectRow(rowForPointerEvent(event), event);
    };

    tooltipEl.onclick = (event) => {
        const button = event.target.closest("[data-tooltip-step]");
        if (!button) return;

        event.stopPropagation();
        const currentDay = Number(tooltipEl.dataset.day || selectedDay);
        const currentIndex = rows.findIndex((row) => row.day === currentDay);
        if (currentIndex < 0) return;

        const nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + Number(button.dataset.tooltipStep)));
        const nextRow = rows[nextIndex];
        selectRow(nextRow);
    };

    requestAnimationFrame(() => {
        const centerDay = selectedDay || 280;
        const centerIndex = rows.findIndex((row) => row.day === centerDay);
        if (centerIndex < 0) return;
        chartEl.scrollLeft = Math.max(0, xFor(centerIndex) - chartEl.clientWidth / 2);
    });
}

function markerTooltipHtml(row, rows) {
    const dueDate = parseISODate(settings.dueDate);
    const closestMarker = referenceMarkersFor(rows)
        .map((marker) => ({ ...marker, distance: Math.abs(row.day - marker.day) }))
        .filter((marker) => marker.distance <= 1.1)
        .sort((a, b) => a.distance - b.distance)[0];

    if (!closestMarker) return "";

    const roundedDay = Math.round(closestMarker.day);

    return `
        <div class="tooltip-markers">
            <div class="tooltip-marker ${closestMarker.type}">
                <strong>${closestMarker.label}</strong>
                <small>${formatTableDate(dateForGestationalDay(dueDate, closestMarker.day))} · ${gestationalLabel(roundedDay)} · ${closestMarker.detail}</small>
            </div>
        </div>
    `;
}

function showTooltip(row, rows, event, persist = false) {
    const rowIndex = rows.findIndex((item) => item.day === row.day);
    const firstHtml = settings.showFirst ? `
        <div><span>First baby</span><strong>${row.firstCdf.toFixed(1)}%</strong></div>
    ` : "";
    const laterHtml = settings.showLater ? `
        <div><span>Second or later baby</span><strong>${row.laterCdf.toFixed(1)}%</strong></div>
    ` : "";
    const firstDailyHtml = settings.showPdf && settings.showFirst ? `
        <div><span>First baby</span><strong>${row.first.toFixed(1)}%</strong></div>
    ` : "";
    const laterDailyHtml = settings.showPdf && settings.showLater ? `
        <div><span>Second or later baby</span><strong>${row.later.toFixed(1)}%</strong></div>
    ` : "";
    const dailyHtml = firstDailyHtml || laterDailyHtml ? `
        <div class="tooltip-daily">
            <span>Daily chance on this date</span>
            <div class="tooltip-daily-grid">
                ${firstDailyHtml}
                ${laterDailyHtml}
            </div>
        </div>
    ` : "";
    const navHtml = persist ? `
        <div class="tooltip-nav" aria-label="Step through chart days">
            <button type="button" data-tooltip-step="-1" ${rowIndex <= 0 ? "disabled" : ""}>Previous</button>
            <span>${rowIndex + 1} of ${rows.length}</span>
            <button type="button" data-tooltip-step="1" ${rowIndex >= rows.length - 1 ? "disabled" : ""}>Next</button>
        </div>
    ` : "";

    tooltipEl.innerHTML = `
        <div class="tooltip-title">
            <strong>${row.dateLabel}</strong>
            <span>${row.gestationalLongLabel}</span>
        </div>
        <div class="tooltip-summary">Chance baby arrives on or before this date</div>
        <div class="tooltip-grid">
            ${firstHtml}
            ${laterHtml}
        </div>
        ${dailyHtml}
        ${markerTooltipHtml(row, rows)}
        ${navHtml}
    `;

    tooltipEl.classList.add("is-visible");
    tooltipEl.classList.toggle("is-pinned", persist);
    moveTooltip(event);
    tooltipEl.dataset.persist = String(persist);
    tooltipEl.dataset.day = String(row.day);
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
    tooltipEl.classList.remove("is-pinned");
}

function dateForGestationalDay(dueDate, day) {
    return addDays(dueDate, Math.round(day) - 280);
}

function renderTimingSummary(rows) {
    const dueDate = parseISODate(settings.dueDate);
    const series = [
        {
            key: "first",
            title: "First baby",
            className: "metric-card-first",
            averageDay: 275.9,
            cdfKey: "firstCdf"
        },
        {
            key: "later",
            title: "Second or later baby",
            className: "metric-card-later",
            averageDay: 274.5,
            cdfKey: "laterCdf"
        }
    ];

    function summaryRow(label, day, detail) {
        return `
            <div class="metric-row">
                <span>${label}</span>
                <b>${formatTableDate(dateForGestationalDay(dueDate, day))}</b>
                <small>${gestationalPreciseLabel(day)} · ${detail}</small>
            </div>
        `;
    }

    timingSummaryEl.innerHTML = series.map((item) => {
        const medianDay = percentileDayFor(rows, item.cdfKey, 50);
        const summaryPercentileDay = percentileDayFor(rows, item.cdfKey, SUMMARY_PERCENTILE);
        return `
            <article class="metric-card ${item.className}">
                <div class="metric-card-header">
                    <strong class="metric-series-title">${item.title}</strong>
                    <span class="metric-context">Typical timing</span>
                </div>
                <div class="metric-list">
                    ${summaryRow("Average", item.averageDay, `${item.averageDay.toFixed(1)} days`)}
                    ${summaryRow("Median", medianDay, `50% born by ${medianDay.toFixed(1)} days`)}
                    ${summaryRow(`${SUMMARY_PERCENTILE}% by`, summaryPercentileDay, `${SUMMARY_PERCENTILE}% born by ${summaryPercentileDay.toFixed(1)} days`)}
                </div>
            </article>
        `;
    }).join("");
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
    renderTimingSummary(rows);
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

function openDueDatePicker() {
    dueDateInput.focus({ preventScroll: true });
    if (typeof dueDateInput.showPicker !== "function") return;

    try {
        dueDateInput.showPicker();
    } catch (error) {
        // Some browsers only allow picker access for direct user gestures.
    }
}

function setupEvents() {
    dueDateInput.addEventListener("change", () => {
        settings.dueDate = dueDateInput.value || DEFAULT_SETTINGS.dueDate;
        saveSettings();
        syncControls();
        render();
    });

    document.querySelector(".date-control").addEventListener("click", (event) => {
        if (event.target === dueDateInput) return;
        event.preventDefault();
        openDueDatePicker();
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
            tooltipEl.classList.remove("is-pinned");
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
    showMedianToggle.addEventListener("change", () => updateSetting("showMedian", showMedianToggle.checked));
    showDueDateToggle.addEventListener("change", () => updateSetting("showDueDate", showDueDateToggle.checked));
    document.getElementById("clear-memory").addEventListener("click", resetAll);
    document.getElementById("reset-banner").addEventListener("click", resetAll);
    document.addEventListener("click", (event) => {
        if (!chartEl.contains(event.target) && !tooltipEl.contains(event.target)) {
            tooltipEl.classList.remove("is-visible");
            tooltipEl.classList.remove("is-pinned");
            tooltipEl.dataset.persist = "false";
        }
    });
}

syncControls();
setupEvents();
render();
