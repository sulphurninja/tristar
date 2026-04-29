/**
 * Tailwind-friendly colour tokens used to render pipeline stage dots, accents
 * and badges. The stored stage `color` is a key from `STAGE_COLORS` — using a
 * lookup avoids template-literal Tailwind classes that won't compile.
 */
export const STAGE_COLORS = {
  slate: { dot: "bg-slate-400", solid: "bg-slate-500", soft: "bg-slate-100", text: "text-slate-700" },
  zinc: { dot: "bg-zinc-400", solid: "bg-zinc-500", soft: "bg-zinc-100", text: "text-zinc-700" },
  stone: { dot: "bg-stone-400", solid: "bg-stone-500", soft: "bg-stone-100", text: "text-stone-700" },
  red: { dot: "bg-red-400", solid: "bg-red-500", soft: "bg-red-100", text: "text-red-700" },
  rose: { dot: "bg-rose-400", solid: "bg-rose-500", soft: "bg-rose-100", text: "text-rose-700" },
  orange: { dot: "bg-orange-400", solid: "bg-orange-500", soft: "bg-orange-100", text: "text-orange-700" },
  amber: { dot: "bg-amber-400", solid: "bg-amber-500", soft: "bg-amber-100", text: "text-amber-700" },
  yellow: { dot: "bg-yellow-400", solid: "bg-yellow-500", soft: "bg-yellow-100", text: "text-yellow-700" },
  lime: { dot: "bg-lime-400", solid: "bg-lime-500", soft: "bg-lime-100", text: "text-lime-700" },
  green: { dot: "bg-green-400", solid: "bg-green-500", soft: "bg-green-100", text: "text-green-700" },
  emerald: {
    dot: "bg-emerald-400",
    solid: "bg-emerald-500",
    soft: "bg-emerald-100",
    text: "text-emerald-700",
  },
  teal: { dot: "bg-teal-400", solid: "bg-teal-500", soft: "bg-teal-100", text: "text-teal-700" },
  cyan: { dot: "bg-cyan-400", solid: "bg-cyan-500", soft: "bg-cyan-100", text: "text-cyan-700" },
  sky: { dot: "bg-sky-400", solid: "bg-sky-500", soft: "bg-sky-100", text: "text-sky-700" },
  blue: { dot: "bg-blue-400", solid: "bg-blue-500", soft: "bg-blue-100", text: "text-blue-700" },
  indigo: {
    dot: "bg-indigo-400",
    solid: "bg-indigo-500",
    soft: "bg-indigo-100",
    text: "text-indigo-700",
  },
  violet: {
    dot: "bg-violet-400",
    solid: "bg-violet-500",
    soft: "bg-violet-100",
    text: "text-violet-700",
  },
  purple: {
    dot: "bg-purple-400",
    solid: "bg-purple-500",
    soft: "bg-purple-100",
    text: "text-purple-700",
  },
  fuchsia: {
    dot: "bg-fuchsia-400",
    solid: "bg-fuchsia-500",
    soft: "bg-fuchsia-100",
    text: "text-fuchsia-700",
  },
  pink: { dot: "bg-pink-400", solid: "bg-pink-500", soft: "bg-pink-100", text: "text-pink-700" },
} as const;

export type StageColorKey = keyof typeof STAGE_COLORS;
export const STAGE_COLOR_KEYS = Object.keys(STAGE_COLORS) as StageColorKey[];

export function stageAccent(color: string | undefined | null) {
  if (color && color in STAGE_COLORS) {
    return STAGE_COLORS[color as StageColorKey];
  }
  return STAGE_COLORS.slate;
}
