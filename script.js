/* ============================================================
   POCKET DICTIONARY — script.js
   Phase 2: Async JavaScript & API Calls
   Commit message: "API calls"
   ============================================================ */

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const HISTORY_KEY = "pocketDictionaryHistory";
const LAST_SEARCH_KEY = "pocketDictionaryLastSearch";
const HISTORY_LIMIT = 12;

// ── DOM References ──────────────────────────────────────────
const searchInput      = document.getElementById("search-input");
const searchBtn        = document.getElementById("search-btn");
const resultCard       = document.getElementById("result-card");
const loadingState     = document.getElementById("loading-state");
const errorState       = document.getElementById("error-state");
const errorMessage     = document.getElementById("error-message");
const wordTitle        = document.getElementById("word-title");
const wordPhonetic     = document.getElementById("word-phonetic");
const audioBtn         = document.getElementById("audio-btn");
const meaningsContainer= document.getElementById("meanings-container");
const synonymChips     = document.getElementById("synonym-chips");
const antonymChips     = document.getElementById("antonym-chips");
const historyToggle    = document.getElementById("history-toggle");
const historyPanel     = document.getElementById("history-panel");
const closeHistoryBtn  = document.getElementById("close-history");
const overlay          = document.getElementById("overlay");
const historyList      = document.getElementById("history-list");
const clearHistoryBtn  = document.getElementById("clear-history");
const historyBadge     = document.getElementById("history-badge");

// ── State ───────────────────────────────────────────────────
let currentAudioUrl = null;
let searchHistory = loadHistory();

// ── Local Storage Helpers ───────────────────────────────────
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[PocketDictionary] Failed to load history:", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
}

function saveLastSearch(word) {
  localStorage.setItem(LAST_SEARCH_KEY, word);
}

function loadLastSearch() {
  return localStorage.getItem(LAST_SEARCH_KEY) || "";
}

function addSearchHistory(word) {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return;

  const existingIndex = searchHistory.findIndex(item => item.word === normalized);
  if (existingIndex >= 0) searchHistory.splice(existingIndex, 1);

  searchHistory.unshift({ word: normalized, timestamp: Date.now() });
  searchHistory = searchHistory.slice(0, HISTORY_LIMIT);
  saveHistory();
  updateHistoryBadge();
  renderHistory();
}

function clearSearchHistory() {
  searchHistory = [];
  saveHistory();
  updateHistoryBadge();
  renderHistory();
}

function updateHistoryBadge() {
  historyBadge.textContent = searchHistory.length;
}

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!searchHistory.length) {
    historyList.innerHTML = `
      <li class="history-item empty">
        <span class="history-word">No previous searches yet.</span>
      </li>
    `;
    return;
  }

  searchHistory.forEach(item => {
    const listItem = document.createElement("li");
    listItem.className = "history-item";

    const wordLabel = document.createElement("span");
    wordLabel.className = "history-word";
    wordLabel.textContent = item.word;

    const timeLabel = document.createElement("span");
    timeLabel.className = "history-time";
    timeLabel.textContent = formatRelativeTime(item.timestamp);

    listItem.appendChild(wordLabel);
    listItem.appendChild(timeLabel);
    listItem.addEventListener("click", () => {
      searchInput.value = item.word;
      searchWord(item.word);
      closeHistoryPanel();
    });

    historyList.appendChild(listItem);
  });
}

function updateHistoryToggleLabel(isOpen) {
  const label = historyToggle.querySelector("span:nth-child(2)");
  if (label) {
    label.textContent = isOpen ? "Close" : "History";
  }
}

function openHistoryPanel() {
  historyPanel.classList.add("open");
  overlay.classList.add("active");
  updateHistoryToggleLabel(true);
}

function closeHistoryPanel() {
  historyPanel.classList.remove("open");
  overlay.classList.remove("active");
  updateHistoryToggleLabel(false);
}

// ── Show / Hide Helpers ──────────────────────────────────────
function showLoading() {
  loadingState.classList.add("visible");
  errorState.classList.remove("visible");
  resultCard.style.display = "none";
  console.log("[PocketDictionary] Loading...");
}

function showError(message) {
  loadingState.classList.remove("visible");
  errorState.classList.add("visible");
  resultCard.style.display = "none";
  errorMessage.textContent = message;
  console.warn("[PocketDictionary] Error:", message);
}

function showResult() {
  loadingState.classList.remove("visible");
  errorState.classList.remove("visible");
  resultCard.style.display = "block";
  console.log("[PocketDictionary] Result displayed.");
}

// ── Main Search Function ─────────────────────────────────────
async function searchWord(word) {
  word = word.trim();
  if (!word) return;

  console.log(`[PocketDictionary] Searching for: "${word}"`);
  showLoading();

  try {
    const response = await fetch(API_URL + encodeURIComponent(word));
    console.log(`[PocketDictionary] API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || "Word not found. Check the spelling and try again.";
      showError(msg);
      return;
    }

    const data = await response.json();
    console.log("[PocketDictionary] Data received:", data);

    renderResult(data[0]);
    addSearchHistory(data[0].word || word);
    saveLastSearch(data[0].word || word);
    showResult();
  } catch (error) {
    console.error("[PocketDictionary] Network or fetch error:", error);
    showError("Something went wrong. Check your internet connection and try again.");
  }
}

// ── Render Result into DOM ───────────────────────────────────
function renderResult(entry) {
  wordTitle.textContent = entry.word;

  const phoneticObj = entry.phonetics?.find(p => p.text) || {};
  wordPhonetic.textContent = phoneticObj.text || "";

  const audioObj = entry.phonetics?.find(p => p.audio && p.audio !== "");
  currentAudioUrl = audioObj ? audioObj.audio : null;
  audioBtn.style.opacity = currentAudioUrl ? "1" : "0.35";
  audioBtn.style.cursor  = currentAudioUrl ? "pointer" : "default";
  console.log("[PocketDictionary] Audio URL:", currentAudioUrl || "none");

  meaningsContainer.innerHTML = "";
  entry.meanings?.forEach(meaning => {
    const block = document.createElement("div");
    block.className = "meaning-block";

    const pos = document.createElement("span");
    pos.className = "part-of-speech";
    pos.textContent = meaning.partOfSpeech;

    const defsList = document.createElement("ol");
    defsList.className = "definitions-list";

    meaning.definitions.slice(0, 3).forEach(def => {
      const li = document.createElement("li");
      li.className = "definition-item";

      const defText = document.createElement("p");
      defText.className = "definition-text";
      defText.textContent = def.definition;
      li.appendChild(defText);

      if (def.example) {
        const ex = document.createElement("p");
        ex.className = "definition-example";
        ex.textContent = `"${def.example}"`;
        li.appendChild(ex);
      }

      defsList.appendChild(li);
    });

    block.appendChild(pos);
    block.appendChild(defsList);
    meaningsContainer.appendChild(block);
  });

  const allSynonyms = [
    ...new Set(
      entry.meanings?.flatMap(m => m.synonyms || [])
        .concat(entry.meanings?.flatMap(m =>
          m.definitions?.flatMap(d => d.synonyms || []) || []
        ))
    )
  ].slice(0, 8);

  const allAntonyms = [
    ...new Set(
      entry.meanings?.flatMap(m => m.antonyms || [])
        .concat(entry.meanings?.flatMap(m =>
          m.definitions?.flatMap(d => d.antonyms || []) || []
        ))
    )
  ].slice(0, 6);

  console.log("[PocketDictionary] Synonyms:", allSynonyms);
  console.log("[PocketDictionary] Antonyms:", allAntonyms);

  renderChips(synonymChips, allSynonyms, "chip--synonym");
  renderChips(antonymChips, allAntonyms, "chip--antonym");
}

// ── Render Chips ─────────────────────────────────────────────
function renderChips(container, words, chipClass) {
  container.innerHTML = "";
  if (!words.length) {
    container.innerHTML = `<span style="font-size:.8rem;color:var(--ink-muted);font-style:italic;">None listed</span>`;
    return;
  }

  words.forEach(word => {
    const btn = document.createElement("button");
    btn.className = `chip ${chipClass}`;
    btn.textContent = word;
    btn.addEventListener("click", () => {
      searchInput.value = word;
      searchWord(word);
    });
    container.appendChild(btn);
  });
}

// ── Audio Playback ───────────────────────────────────────────
audioBtn.addEventListener("click", () => {
  if (!currentAudioUrl) return;
  const audio = new Audio(currentAudioUrl);
  audio.play().catch(err => {
    console.error("[PocketDictionary] Audio playback error:", err);
  });
});

// ── History Panel ────────────────────────────────────────────
historyToggle.addEventListener("click", openHistoryPanel);
closeHistoryBtn.addEventListener("click", closeHistoryPanel);
overlay.addEventListener("click", closeHistoryPanel);
clearHistoryBtn.addEventListener("click", clearSearchHistory);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && historyPanel.classList.contains("open")) {
    closeHistoryPanel();
  }
});

// ── Search Triggers ──────────────────────────────────────────
searchBtn.addEventListener("click", () => {
  searchWord(searchInput.value);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchWord(searchInput.value);
  }
});

// ── Bootstrap ───────────────────────────────────────────────
updateHistoryBadge();
renderHistory();

const lastSearch = loadLastSearch();
if (lastSearch) {
  searchInput.value = lastSearch;
  searchWord(lastSearch);
}
