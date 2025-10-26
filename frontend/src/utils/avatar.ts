const PALETTES = [
  { bg: "bg-rose-100", text: "text-rose-600", ring: "ring-rose-200" },
  { bg: "bg-sky-100", text: "text-sky-600", ring: "ring-sky-200" },
  { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-200" },
  { bg: "bg-amber-100", text: "text-amber-600", ring: "ring-amber-200" },
  { bg: "bg-purple-100", text: "text-purple-600", ring: "ring-purple-200" },
  { bg: "bg-indigo-100", text: "text-indigo-600", ring: "ring-indigo-200" },
  { bg: "bg-teal-100", text: "text-teal-600", ring: "ring-teal-200" },
];

export function avatarPaletteFor(seed: string | undefined | null) {
  if (!seed || !seed.length) {
    return { bg: "bg-gray-200", text: "text-gray-600", ring: "ring-gray-200" };
  }
  const code = [...seed.toLowerCase()].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = PALETTES[code % PALETTES.length];
  return palette ?? { bg: "bg-gray-200", text: "text-gray-600", ring: "ring-gray-200" };
}

export function initialsFor(name: string | undefined | null, fallback = "?") {
  if (!name) return fallback;
  const parts = name
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

