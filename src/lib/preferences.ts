export const CONSISTENCY_BLUE_KEY = "summit-consistency-blue";
export const CONSISTENCY_BLUE_CHANGE_EVENT = "summit-consistency-blue-change";

export function getConsistencyBluePreference(): boolean {
  return localStorage.getItem(CONSISTENCY_BLUE_KEY) === "true";
}

export function setConsistencyBluePreference(enabled: boolean): void {
  localStorage.setItem(CONSISTENCY_BLUE_KEY, String(enabled));
  window.dispatchEvent(new Event(CONSISTENCY_BLUE_CHANGE_EVENT));
}

export const THEMES = [
  { id: "retro", label: "Retro", swatches: ["#f6f1e3", "#6a994e", "#d96c4f", "#4a4033"], themeColor: "#f6f1e3" },
  { id: "watercolor", label: "Watercolor", swatches: ["#fbf7f1", "#8fb8a3", "#e3a9b4", "#82a3d1"], themeColor: "#fbf7f1" },
  { id: "minimal", label: "Warm Minimal", swatches: ["#f4efe8", "#a9b18f", "#c98463", "#3b332d"], themeColor: "#f4efe8" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_KEY = "summit-theme";

export function getThemePreference(): ThemeId {
  const stored = localStorage.getItem(THEME_KEY);
  return THEMES.some((t) => t.id === stored) ? (stored as ThemeId) : "retro";
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEMES.find((t) => t.id === theme)!.themeColor);
}

export function setThemePreference(theme: ThemeId): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
