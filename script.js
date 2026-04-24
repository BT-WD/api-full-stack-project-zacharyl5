/* ============================================================
   POCKET DICTIONARY — script.js
   Phase 2: Async JavaScript & API Calls
   Commit message: "API calls"
   ============================================================ */

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

// ── DOM References ──────────────────────────────────────────
const searchInput   = document.getElementById("search-input");
const searchBtn     = document.getElementById("search-btn");
const resultCard    = document.getElementById("result-card");
const loadingState  = document.getElementById("loading-state");
const errorState    = document.getElementById("error-state");
const errorMessage  = document.getElementById("error-message");
const wordTitle     = document.getElementById("word-title");
const wordPhonetic  = document.getElementById("word-phonetic");
const audioBtn      = document.getElementById("audio-btn");
const meaningsContainer = document.getElementById("meanings-container");
const synonymChips  = document.getElementById("synonym-chips");
const antonymChips  = document.getElementById("antonym-chips");

// ── State ────────────────────────────────────────────────────
let currentAudioUrl = null;

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
      // API returns 404 when word is not found
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || "Word not found. Check the spelling and try again.";
      showError(msg);
      return;
    }

    const data = await response.json();
    console.log("[PocketDictionary] Data received:", data);

    renderResult(data[0]);
    showResult();

  } catch (error) {
    console.error("[PocketDictionary] Network or fetch error:", error);
    showError("Something went wrong. Check your internet connection and try again.");
  }
}

// ── Render Result into DOM ───────────────────────────────────
function renderResult(entry) {
  // Word title
  wordTitle.textContent = entry.word;

  // Phonetic text
  const phoneticObj = entry.phonetics?.find(p => p.text) || {};
  wordPhonetic.textContent = phoneticObj.text || "";

  // Audio
  const audioObj = entry.phonetics?.find(p => p.audio && p.audio !== "");
  currentAudioUrl = audioObj ? audioObj.audio : null;
  audioBtn.style.opacity = currentAudioUrl ? "1" : "0.35";
  audioBtn.style.cursor  = currentAudioUrl ? "pointer" : "default";
  console.log("[PocketDictionary] Audio URL:", currentAudioUrl || "none");

  // Meanings & definitions
  meaningsContainer.innerHTML = "";
  entry.meanings?.forEach(meaning => {
    const block = document.createElement("div");
    block.className = "meaning-block";

    const pos = document.createElement("span");
    pos.className = "part-of-speech";
    pos.textContent = meaning.partOfSpeech;

    const defsList = document.createElement("ol");
    defsList.className = "definitions-list";

    // Show max 3 definitions per part of speech
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

  // Synonyms — gathered from all meanings and definitions
  const allSynonyms = [
    ...new Set(
      entry.meanings?.flatMap(m => m.synonyms || [])
        .concat(entry.meanings?.flatMap(m =>
          m.definitions?.flatMap(d => d.synonyms || []) || []
        ))
    )
  ].slice(0, 8);

  // Antonyms — gathered from all meanings and definitions
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

// ── Search Triggers ──────────────────────────────────────────
searchBtn.addEventListener("click", () => {
  searchWord(searchInput.value);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchWord(searchInput.value);
  }
});
