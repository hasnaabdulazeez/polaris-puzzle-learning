// Polaris UI controller: profiles → home dashboard → puzzle session → summary.

import { levelForRating, planSession, ratingToUnit } from "./engine/adaptive.js";
import {
  createProfile,
  currentStreak,
  exportProfile,
  finishSession,
  loadState,
  recordAnswer,
  safeStorage,
  saveState,
  stars,
} from "./engine/progress.js";
import { SKILLS, generatePuzzle } from "./puzzles/index.js";
import { radarSvg } from "./ui/radar.js";
import { escapeHtml, optionInner, optionLabel, stimulusHtml } from "./ui/render.js";
import { Rng } from "./rng.js";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🐧", "🦄", "🐯", "🐨"];
const SKILL_IDS = SKILLS.map((s) => s.id);
const skillInfo = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

const storage = safeStorage();
const rng = new Rng();
const root = document.getElementById("app");

let state = loadState(storage);
let session = null;
let memoryTimer = null;

const persist = () => saveState(storage, state);
const activeProfile = () => state.profiles.find((p) => p.id === state.activeId) ?? null;

function axesFor(profile, previousRatings) {
  return SKILLS.map((s) => ({
    label: s.label,
    value: ratingToUnit(profile.ratings[s.id]),
    previous: previousRatings ? ratingToUnit(previousRatings[s.id]) : undefined,
  }));
}

// ---------- Screens ----------

function renderProfiles() {
  const cards = state.profiles
    .map(
      (p) => `<button class="profile-card" data-action="select" data-id="${p.id}">
        <span class="avatar">${p.avatar}</span><span>${escapeHtml(p.name)}</span>
        <small>${p.sessions.length} adventures</small></button>`
    )
    .join("");
  root.innerHTML = `
    <section class="screen center">
      <h1 class="logo">✦ Polaris</h1>
      <p class="tagline">Puzzle adventures that grow thinking skills</p>
      ${cards ? `<h2>Who's playing?</h2><div class="profiles">${cards}</div>` : ""}
      <form class="card add-player" data-form="add">
        <h2>${cards ? "Add a player" : "Create your player"}</h2>
        <input name="name" maxlength="24" placeholder="Your name" required autocomplete="off" />
        <div class="avatars" role="radiogroup" aria-label="Pick an avatar">
          ${AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i === 0 ? "checked" : ""}/><span>${a}</span></label>`).join("")}
        </div>
        <button class="btn primary" type="submit">Start</button>
      </form>
    </section>`;
}

function renderHome() {
  const p = activeProfile();
  const totalAttempts = SKILL_IDS.reduce((n, s) => n + p.attempts[s], 0);
  const totalCorrect = SKILL_IDS.reduce((n, s) => n + p.correct[s], 0);
  const streak = currentStreak(p.sessions);
  const skillRows = SKILLS.map((s) => {
    const level = levelForRating(p.ratings[s.id]);
    const acc = p.attempts[s.id] ? Math.round((100 * p.correct[s.id]) / p.attempts[s.id]) : null;
    return `<li><span>${s.emoji} ${s.label}</span><span class="badge">Level ${level}</span>
      <small>${acc === null ? "not tried yet" : `${acc}% correct`}</small></li>`;
  }).join("");

  root.innerHTML = `
    <section class="screen">
      <header class="topbar">
        <div class="who"><span class="avatar">${p.avatar}</span><strong>${escapeHtml(p.name)}</strong></div>
        <button class="btn ghost no-print" data-action="switch">Switch player</button>
      </header>
      <div class="stats">
        <div><strong>${p.sessions.length}</strong><small>adventures</small></div>
        <div><strong>${streak} 🔥</strong><small>day streak</small></div>
        <div><strong>${totalAttempts ? Math.round((100 * totalCorrect) / totalAttempts) : 0}%</strong><small>correct</small></div>
      </div>
      <div class="home-grid">
        <div class="card">${radarSvg(axesFor(p))}</div>
        <div class="card"><h2>Skills</h2><ul class="skills">${skillRows}</ul></div>
      </div>
      <div class="actions no-print">
        <button class="btn primary big" data-action="start" data-length="12">▶ Start adventure (12 puzzles)</button>
        <button class="btn" data-action="start" data-length="6">Quick play (6)</button>
      </div>
      <details class="parents no-print">
        <summary>For parents & teachers</summary>
        <p>Polaris picks each puzzle's level from the player's recent answers, aiming for about 3 in 4 correct.
        Progress is stored only in this browser.</p>
        <div class="actions">
          <button class="btn" data-action="export">Download progress (JSON)</button>
          <button class="btn" data-action="print">Print report</button>
          <button class="btn danger" data-action="delete">Delete player</button>
        </div>
      </details>
    </section>`;
}

function renderPuzzle() {
  const { puzzle, index, plan, answered, usedHint, memoryHidden } = session;
  const info = skillInfo[puzzle.skill];
  const waitingForMemory = puzzle.stimulus?.kind === "memory" && !memoryHidden;
  const dots = plan.map((_, i) => `<span class="dot ${i < index ? "done" : i === index ? "now" : ""}"></span>`).join("");

  const options = puzzle.options.map((opt, i) => {
    let cls = "option";
    if (answered) {
      if (i === puzzle.answerIndex) cls += " correct";
      else if (i === session.chosen) cls += " wrong";
    }
    return `<button class="${cls}" data-action="answer" data-index="${i}" aria-label="Option ${i + 1}: ${escapeHtml(optionLabel(opt))}"
      ${answered || waitingForMemory ? "disabled" : ""}><kbd>${i + 1}</kbd>${optionInner(opt)}</button>`;
  }).join("");

  let feedback = "";
  if (answered) {
    const right = session.chosen === puzzle.answerIndex;
    feedback = `<div class="feedback ${right ? "good" : "bad"}" role="status">
        <strong>${right ? (usedHint ? "Correct, with a hint! 👍" : "Brilliant! ⭐") : "Not quite. Here's why:"}</strong>
        <p>${escapeHtml(puzzle.explanation)}</p>
        <button class="btn primary" data-action="next" autofocus>${index + 1 < plan.length ? "Next puzzle →" : "See results"}</button>
      </div>`;
  }

  root.innerHTML = `
    <section class="screen play">
      <header class="topbar">
        <span class="skill-tag">${info.emoji} ${info.label} · level ${puzzle.level}</span>
        <button class="btn ghost" data-action="quit">✕ Stop</button>
      </header>
      <div class="dots" aria-label="Puzzle ${index + 1} of ${plan.length}">${dots}</div>
      <h2 class="prompt">${waitingForMemory ? "Remember these shapes!" : escapeHtml(puzzle.prompt)}</h2>
      ${waitingForMemory ? `<div class="timer"><span style="animation-duration:${puzzle.stimulus.showMs}ms"></span></div>` : ""}
      <div class="stimulus">${stimulusHtml(puzzle.stimulus, { hidden: memoryHidden })}</div>
      <div class="options ${puzzle.options.length > 4 ? "many" : ""}">${waitingForMemory ? "" : options}</div>
      ${!answered && !waitingForMemory && !usedHint ? `<button class="btn ghost hint-btn" data-action="hint">💡 Hint</button>` : ""}
      ${usedHint && !answered ? `<p class="hint">💡 ${escapeHtml(puzzle.hint)}</p>` : ""}
      ${feedback}
    </section>`;

  if (waitingForMemory && !memoryTimer) {
    memoryTimer = setTimeout(() => {
      memoryTimer = null;
      if (session) {
        session.memoryHidden = true;
        renderPuzzle();
      }
    }, puzzle.stimulus.showMs);
  }
}

function renderSummary(result) {
  const p = activeProfile();
  const earned = stars(result.correct, result.total);
  const rows = Object.entries(result.bySkill).map(([skill, s]) => {
    const before = levelForRating(session.ratingsBefore[skill]);
    const after = levelForRating(p.ratings[skill]);
    const change = after > before ? `<span class="up">Level up! ${before} → ${after}</span>` : `Level ${after}`;
    return `<li><span>${skillInfo[skill].emoji} ${skillInfo[skill].label}</span><span>${s.correct}/${s.total}</span><span>${change}</span></li>`;
  }).join("");

  root.innerHTML = `
    <section class="screen center">
      <div class="stars" aria-label="${earned} of 3 stars">${"★".repeat(earned)}<span class="dim">${"★".repeat(3 - earned)}</span></div>
      <h1>${earned === 3 ? "Superstar!" : earned === 2 ? "Great thinking!" : earned === 1 ? "Good effort!" : "Keep practising!"}</h1>
      <p>You solved <strong>${result.correct}</strong> of ${result.total} puzzles${result.hintsUsed ? ` (${result.hintsUsed} with hints)` : ""}.</p>
      <div class="home-grid">
        <div class="card">${radarSvg(axesFor(p, session.ratingsBefore))}<p class="legend"><span class="sw prev"></span>before <span class="sw now"></span>now</p></div>
        <div class="card"><h2>This adventure</h2><ul class="skills summary-skills">${rows}</ul></div>
      </div>
      <div class="actions">
        <button class="btn primary big" data-action="start" data-length="${result.total}">Play again</button>
        <button class="btn" data-action="home">Home</button>
      </div>
    </section>`;
  session = null;
}

// ---------- Session flow ----------

function startSession(length) {
  const p = activeProfile();
  session = {
    plan: planSession(p.ratings, length, rng),
    index: 0,
    results: [],
    ratingsBefore: { ...p.ratings },
  };
  loadPuzzle();
}

function loadPuzzle() {
  const p = activeProfile();
  const skill = session.plan[session.index];
  Object.assign(session, {
    puzzle: generatePuzzle(skill, levelForRating(p.ratings[skill]), rng),
    answered: false,
    usedHint: false,
    chosen: null,
    memoryHidden: false,
  });
  renderPuzzle();
}

function answer(i) {
  if (!session || session.answered) return;
  const { puzzle, usedHint } = session;
  if (puzzle.stimulus?.kind === "memory" && !session.memoryHidden) return; // still memorising
  const correct = i === puzzle.answerIndex;
  const score = correct ? (usedHint ? 0.5 : 1) : 0;
  const delta = recordAnswer(activeProfile(), puzzle.skill, puzzle.level, score);
  session.results.push({ skill: puzzle.skill, level: puzzle.level, score, hint: usedHint, delta });
  Object.assign(session, { answered: true, chosen: i });
  persist();
  renderPuzzle();
}

function next() {
  session.index += 1;
  if (session.index < session.plan.length) return loadPuzzle();
  const result = finishSession(activeProfile(), session.results);
  persist();
  renderSummary(result);
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Events ----------

root.addEventListener("submit", (e) => {
  if (e.target.dataset.form !== "add") return;
  e.preventDefault();
  const form = new FormData(e.target);
  const name = String(form.get("name") || "").trim();
  if (!name) return;
  const profile = createProfile(name, String(form.get("avatar")), SKILL_IDS);
  state.profiles.push(profile);
  state.activeId = profile.id;
  persist();
  renderHome();
});

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const p = activeProfile();
  switch (el.dataset.action) {
    case "select":
      state.activeId = el.dataset.id;
      persist();
      return renderHome();
    case "switch":
      return renderProfiles();
    case "start":
      return startSession(Number(el.dataset.length));
    case "answer":
      return answer(Number(el.dataset.index));
    case "hint":
      session.usedHint = true;
      return renderPuzzle();
    case "next":
      return next();
    case "quit":
      clearTimeout(memoryTimer);
      memoryTimer = null;
      session = null;
      return renderHome();
    case "home":
      return renderHome();
    case "export":
      return download(`polaris-${p.name.toLowerCase().replace(/\W+/g, "-")}.json`, exportProfile(p));
    case "print":
      return window.print();
    case "delete":
      if (confirm(`Delete ${p.name} and all their progress?`)) {
        state.profiles = state.profiles.filter((x) => x.id !== p.id);
        state.activeId = null;
        persist();
        renderProfiles();
      }
      return undefined;
    default:
      return undefined;
  }
});

document.addEventListener("keydown", (e) => {
  if (!session || e.target.tagName === "INPUT") return;
  const n = Number(e.key);
  if (!session.answered && n >= 1 && n <= session.puzzle.options.length) answer(n - 1);
  else if (session.answered && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    next();
  }
});

if (activeProfile()) renderHome();
else renderProfiles();
