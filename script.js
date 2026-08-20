const calendarGrid = document.querySelector("#calendarGrid");
const monthLabel = document.querySelector("#monthLabel");
const eventForm = document.querySelector("#eventForm");
const titleInput = document.querySelector("#titleInput");
const descriptionInput = document.querySelector("#descriptionInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const prevMonthButton = document.querySelector("#prevMonth");
const nextMonthButton = document.querySelector("#nextMonth");
const shareButton = document.querySelector("#shareButton");
const shareUrlInput = document.querySelector("#shareUrl");
const shareStatus = document.querySelector("#shareStatus");

const legacyStorageKey = "grubby-month-events";
const storageKey = "month-at-a-glance-events";
const publicSiteUrl = "https://usapeiyanli-jpg.github.io/month-at-a-glance/";
const today = new Date();
let viewedDate = new Date(today.getFullYear(), today.getMonth(), 1);
let events = loadInitialEvents();

dateInput.value = toDateInputValue(today);
timeInput.value = "08:00";

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  if (!title || !date || !time) {
    return;
  }

  events.push({
    id: createEventId(),
    title,
    description,
    date,
    time
  });

  viewedDate = fromDateInputValue(date);
  saveEvents();
  renderCalendar();
  eventForm.reset();
  dateInput.value = date;
  timeInput.value = time;
  titleInput.focus();
});

prevMonthButton.addEventListener("click", () => {
  viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 1);
  renderCalendar();
});

shareButton.addEventListener("click", async () => {
  const shareUrl = createShareUrl();

  shareUrlInput.value = shareUrl;
  shareUrlInput.select();

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareStatus.textContent = "Share URL copied.";
  } catch {
    shareStatus.textContent = "Share URL ready to copy.";
  }
});

calendarGrid.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-event");
  const descriptionButton = event.target.closest(".description-toggle");
  const dayCell = event.target.closest(".day-cell");

  if (removeButton) {
    events = events.filter((item) => item.id !== removeButton.dataset.id);
    saveEvents();
    renderCalendar();
    return;
  }

  if (descriptionButton) {
    const eventItem = descriptionButton.closest(".event-item");
    const description = eventItem.querySelector(".event-description");
    const isExpanded = descriptionButton.getAttribute("aria-expanded") === "true";

    descriptionButton.setAttribute("aria-expanded", String(!isExpanded));
    descriptionButton.textContent = isExpanded ? "▸" : "▾";
    description.hidden = isExpanded;
    return;
  }

  if (dayCell && dayCell.dataset.date) {
    dateInput.value = dayCell.dataset.date;
    titleInput.focus();
  }
});

calendarGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const dayCell = event.target.closest(".day-cell");

  if (dayCell && dayCell.dataset.date) {
    event.preventDefault();
    dateInput.value = dayCell.dataset.date;
    titleInput.focus();
  }
});

renderCalendar();

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = viewedDate.getFullYear();
  const month = viewedDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstOfMonth.getDay());

  monthLabel.textContent = viewedDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + index);
    calendarGrid.appendChild(createDayCell(cellDate, month));
  }
}

function createDayCell(cellDate, activeMonth) {
  const dateValue = toDateInputValue(cellDate);
  const cellEvents = events
    .filter((item) => item.date === dateValue)
    .sort((a, b) => a.time.localeCompare(b.time));
  const cell = document.createElement("div");

  cell.className = "day-cell";
  cell.dataset.date = dateValue;
  cell.tabIndex = 0;
  cell.setAttribute("role", "button");
  cell.setAttribute("aria-label", `Add item on ${cellDate.toLocaleDateString()}`);

  if (cellDate.getMonth() !== activeMonth) {
    cell.classList.add("outside-month");
  }

  if (dateValue === toDateInputValue(today)) {
    cell.classList.add("is-today");
  }

  const dayNumber = document.createElement("span");
  dayNumber.className = "day-number";
  dayNumber.textContent = cellDate.getDate();
  cell.appendChild(dayNumber);

  const eventList = document.createElement("span");
  eventList.className = "event-list";

  if (cellEvents.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty-day";
    empty.textContent = "Tap to add";
    eventList.appendChild(empty);
  } else {
    cellEvents.forEach((item) => eventList.appendChild(createEventItem(item)));
  }

  cell.appendChild(eventList);
  return cell;
}

function createEventItem(item) {
  const eventItem = document.createElement("span");
  eventItem.className = "event-item";

  const text = document.createElement("span");
  text.className = "event-text";

  const title = document.createElement("span");
  title.className = "event-title";
  title.textContent = item.title;

  const time = document.createElement("span");
  time.className = "event-time";
  time.textContent = formatTime(item.time);

  text.append(title, time);

  if (item.description) {
    const descriptionButton = document.createElement("button");
    descriptionButton.type = "button";
    descriptionButton.className = "description-toggle";
    descriptionButton.setAttribute("aria-label", `Show description for ${item.title}`);
    descriptionButton.setAttribute("aria-expanded", "false");
    descriptionButton.textContent = "▸";

    const description = document.createElement("span");
    description.className = "event-description";
    description.hidden = true;
    description.textContent = item.description;
    text.appendChild(descriptionButton);
    text.appendChild(description);
  }

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-event";
  removeButton.dataset.id = item.id;
  removeButton.setAttribute("aria-label", `Remove ${item.title}`);
  removeButton.textContent = "×";

  eventItem.append(text, removeButton);
  return eventItem;
}

function loadEvents() {
  try {
    const savedEvents = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
    return JSON.parse(savedEvents) || [];
  } catch {
    return [];
  }
}

function loadInitialEvents() {
  const sharedEvents = loadEventsFromUrl();

  if (sharedEvents) {
    saveEventsToStorage(sharedEvents);
    return sharedEvents;
  }

  return loadEvents();
}

function loadEventsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encodedEvents = params.get("events");
  const sharedMonth = params.get("month");

  if (sharedMonth && /^\d{4}-\d{2}$/.test(sharedMonth)) {
    const [year, month] = sharedMonth.split("-").map(Number);
    viewedDate = new Date(year, month - 1, 1);
  }

  if (!encodedEvents) {
    return null;
  }

  try {
    const parsedEvents = JSON.parse(decodeURIComponent(encodedEvents));

    if (!Array.isArray(parsedEvents)) {
      return null;
    }

    return parsedEvents
      .map(normalizeSharedEvent)
      .filter(Boolean);
  } catch {
    return null;
  }
}

function saveEvents() {
  saveEventsToStorage(events);
}

function saveEventsToStorage(items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeSharedEvent(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const title = String(item.title || "").trim().slice(0, 42);
  const description = String(item.description || "").trim().slice(0, 90);
  const date = String(item.date || "");
  const time = String(item.time || "");

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  return {
    id: typeof item.id === "string" ? item.id : createEventId(),
    title,
    description,
    date,
    time
  };
}

function createShareUrl() {
  const url = new URL(getShareBaseUrl());
  const sharedEvents = events.map(({ title, description, date, time }) => ({
    title,
    description,
    date,
    time
  }));

  url.searchParams.set("events", encodeURIComponent(JSON.stringify(sharedEvents)));
  url.searchParams.set("month", `${viewedDate.getFullYear()}-${String(viewedDate.getMonth() + 1).padStart(2, "0")}`);
  return url.toString();
}

function getShareBaseUrl() {
  if (window.location.protocol === "file:") {
    return publicSiteUrl;
  }

  return `${window.location.origin}${window.location.pathname}`;
}

function createEventId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}
