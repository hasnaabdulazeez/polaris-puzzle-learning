// Dependency-free SVG radar chart for the skills profile.

import { escapeHtml } from "./render.js";

/**
 * @param {{label: string, value: number, previous?: number}[]} axes values in 0..1
 */
export function radarSvg(axes, size = 300) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const n = axes.length;
  const point = (i, v) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)];
  };
  const ring = (v) => axes.map((_, i) => point(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");

  const rings = [0.25, 0.5, 0.75, 1].map((v) => `<polygon points="${ring(v)}" class="radar-ring"/>`).join("");
  const spokes = axes.map((_, i) => {
    const [x, y] = point(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-ring"/>`;
  }).join("");
  const shape = (key, cls) => {
    if (!axes.every((a) => typeof a[key] === "number")) return "";
    const pts = axes.map((a, i) => point(i, Math.max(0.04, a[key])).map((x) => x.toFixed(1)).join(",")).join(" ");
    return `<polygon points="${pts}" class="${cls}"/>`;
  };
  const labels = axes.map((a, i) => {
    const [x, y] = point(i, 1.28);
    const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" class="radar-label">${escapeHtml(a.label)}</text>`;
  }).join("");

  const summary = axes.map((a) => `${a.label} ${Math.round(a.value * 100)}%`).join(", ");
  return `<svg viewBox="0 0 ${size} ${size}" class="radar" role="img" aria-label="Skills: ${escapeHtml(summary)}">
    ${rings}${spokes}${shape("previous", "radar-prev")}${shape("value", "radar-area")}${labels}</svg>`;
}
