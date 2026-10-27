// Shape vocabulary shared by visual puzzles.
// Colours come from the Okabe-Ito palette, which stays distinguishable for most
// forms of colour blindness; every colour also has a spoken name for screen readers.

export const SHAPES = ["circle", "square", "triangle", "star", "diamond", "hexagon"];

export const COLORS = {
  orange: "#E69F00",
  blue: "#0072B2",
  green: "#009E73",
  red: "#D55E00",
  pink: "#CC79A7",
};
export const COLOR_NAMES = Object.keys(COLORS);

export const SIZES = ["small", "large"];
export const FILLS = ["solid", "outline"];

export const DOMAINS = { shape: SHAPES, color: COLOR_NAMES, size: SIZES, fill: FILLS };

export function makeItem({ shape = "circle", color = "blue", size = "large", fill = "solid", count = 1 } = {}) {
  return { shape, color, size, fill, count };
}

export function itemKey(item) {
  return [item.shape, item.color, item.size, item.fill, item.count].join("|");
}

export function sameItem(a, b) {
  return itemKey(a) === itemKey(b);
}

export function describe(item) {
  const words = [];
  if (item.count > 1) words.push(String(item.count));
  if (item.size === "small") words.push("small");
  if (item.fill === "outline") words.push("outlined");
  words.push(item.color, item.count > 1 ? `${item.shape}s` : item.shape);
  return words.join(" ");
}
