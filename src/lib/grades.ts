export const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"] as const;
export type Grade = (typeof GRADES)[number];

const lightColorMap: Record<string, string> = {
  V0: "rgba(111, 143, 78, 0.8)",
  V1: "rgba(49, 95, 141, 0.8)",
  V2: "rgba(215, 184, 59, 0.8)",
  V3: "rgba(199, 99, 120, 0.8)",
  V4: "rgba(196, 122, 45, 0.8)",
  V5: "rgba(186, 70, 67, 0.8)",
  V6: "rgba(117, 97, 154, 0.8)",
  V7: "rgba(59, 57, 52, 0.8)",
  V8: "rgba(108, 79, 58, 0.8)",
  V9: "rgba(140, 115, 113, 0.8)",
  V10: "rgba(93, 90, 85, 0.8)",
};

export const colorMap: Record<string, string> = lightColorMap;

const lightTextGrades = new Set(["V1", "V6", "V7", "V8", "V10"]);

export function gradeTextColor(grade: string): string {
  return lightTextGrades.has(grade) ? "white" : "var(--color-border)";
}

export const fadedColorMap: Record<string, string> = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, v.replace("0.8)", "0.3)")]),
);

export const borderColorMap: Record<string, string> = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => {
    // Darken RGB values by 30% for a more prominent border
    return [k, v.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, (_, r, g, b) =>
      `rgba(${Math.round(+r * 0.7)}, ${Math.round(+g * 0.7)}, ${Math.round(+b * 0.7)}, 1)`
    )];
  }),
);

export function gradeIndex(grade: string): number {
  return GRADES.indexOf(grade as Grade);
}

export function gradeToNumber(grade: string): number | null {
  const match = grade.match(/^V(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

export type HoldType = "jug" | "crimp" | "sloper";

export const holdTypeConfig: Record<HoldType, { label: string; letter: string; color: string; bgColor: string }> = {
  jug: { label: "Jug", letter: "J", color: "var(--color-primary)", bgColor: "rgba(228, 196, 77, 0.35)" },
  crimp: { label: "Crimp", letter: "C", color: "var(--color-accent)", bgColor: "rgba(89, 149, 163, 0.35)" },
  sloper: { label: "Sloper", letter: "S", color: "var(--color-tertiary)", bgColor: "rgba(106, 153, 78, 0.35)" },
};

export const GOAL_GRADE = "V5";

export const COMPETITION_DATES = [
  { date: "2026-05-15", label: "Comp" },
  { date: "2026-08-01", label: "Comp" },
];
