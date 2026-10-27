// SVG rendering for shapes, puzzle stimuli and answer options.

import { COLORS, describe } from "../puzzles/shapes.js";

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function polygon(cx, cy, r, sides, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotation + (2 * Math.PI * i) / sides;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function star(cx, cy, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function shapePath(shape, cx, cy, r, paint) {
  switch (shape) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" ${paint}/>`;
    case "square":
      return `<rect x="${cx - r * 0.85}" y="${cy - r * 0.85}" width="${r * 1.7}" height="${r * 1.7}" rx="${r * 0.15}" ${paint}/>`;
    case "triangle":
      return `<polygon points="${polygon(cx, cy + r * 0.15, r * 1.05, 3)}" ${paint}/>`;
    case "star":
      return `<polygon points="${star(cx, cy, r * 1.05)}" ${paint}/>`;
    case "diamond":
      return `<polygon points="${polygon(cx, cy, r, 4)}" ${paint}/>`;
    case "hexagon":
      return `<polygon points="${polygon(cx, cy, r, 6, 0)}" ${paint}/>`;
    default:
      return "";
  }
}

/** One item (possibly several copies) drawn inside a square SVG. */
export function itemSvg(item, size = 72) {
  const color = COLORS[item.color];
  const n = item.count ?? 1;
  const scale = item.size === "small" ? 0.55 : 1;
  const paint = item.fill === "outline"
    ? `fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"`
    : `fill="${color}"`;
  const slots = n === 1 ? [[50, 50]] : n === 2 ? [[30, 50], [70, 50]] : n === 3 ? [[50, 28], [28, 70], [72, 70]]
    : [[30, 30], [70, 30], [30, 70], [70, 70]];
  const r = (n === 1 ? 34 : n === 2 ? 18 : 16) * scale;
  const body = slots.slice(0, Math.min(n, 4)).map(([x, y]) => shapePath(item.shape, x, y, r, paint)).join("");
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${escapeHtml(describe(item))}">${body}</svg>`;
}

const QUESTION = `<div class="tile question" aria-label="missing">?</div>`;

export function stimulusHtml(stimulus, { hidden = false } = {}) {
  if (!stimulus) return "";
  switch (stimulus.kind) {
    case "numbers":
      return `<div class="row numbers">${stimulus.values.map((v) => `<div class="tile num">${v}</div>`).join("")}${QUESTION}</div>`;
    case "items":
      return `<div class="row">${stimulus.items.map((it) => (it ? `<div class="tile">${itemSvg(it, 56)}</div>` : QUESTION)).join("")}</div>`;
    case "grid":
      return `<div class="grid3">${stimulus.cells.flat().map((it) => (it ? `<div class="tile">${itemSvg(it, 64)}</div>` : QUESTION)).join("")}</div>`;
    case "memory":
      return hidden
        ? `<div class="row">${stimulus.items.map((_, i) => `<div class="tile hidden">${i + 1}</div>`).join("")}</div>`
        : `<div class="row">${stimulus.items.map((it) => `<div class="tile">${itemSvg(it, 56)}</div>`).join("")}</div>`;
    case "text":
      return `<ul class="clues">${stimulus.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
    default:
      return "";
  }
}

export function optionInner(option) {
  if (option.kind === "item") return itemSvg(option.item, 64);
  return `<span class="opt-text">${escapeHtml(option.value)}</span>`;
}

export function optionLabel(option) {
  return option.kind === "item" ? describe(option.item) : String(option.value);
}
