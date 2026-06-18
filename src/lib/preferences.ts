export const CONSISTENCY_BLUE_KEY = "summit-consistency-blue";
export const CONSISTENCY_BLUE_CHANGE_EVENT = "summit-consistency-blue-change";

export function getConsistencyBluePreference(): boolean {
  return localStorage.getItem(CONSISTENCY_BLUE_KEY) === "true";
}

export function setConsistencyBluePreference(enabled: boolean): void {
  localStorage.setItem(CONSISTENCY_BLUE_KEY, String(enabled));
  window.dispatchEvent(new Event(CONSISTENCY_BLUE_CHANGE_EVENT));
}
