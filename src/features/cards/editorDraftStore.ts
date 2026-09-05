import { useSyncExternalStore } from "react";

const prefix = "zhishi.editor-draft.";
const eventName = "zhishi:editor-drafts-changed";

export function writeEditorDraft(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(eventName));
    return true;
  } catch { return false; }
}

export function removeEditorDraft(key: string) {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event(eventName));
}

export function findEditorDraftPath(mistakeIds: Set<string>): string | null {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));
    keys.sort((a, b) => a === `${prefix}new` ? -1 : b === `${prefix}new` ? 1 : a.localeCompare(b));
    for (const key of keys) {
      const id = key.slice(prefix.length);
      if (id !== "new" && !mistakeIds.has(id)) continue;
      try {
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        if (!draft?.values || !Array.isArray(draft.knowledgePoints)) continue;
        const content = Object.entries(draft.values).some(([field, value]) => field !== "subject"
          && typeof value === "string" && value.trim());
        if (!content && !draft.assets?.length && !draft.knowledgePoints.length) continue;
        return id === "new" ? "/cards/new" : `/cards/${encodeURIComponent(id)}/edit`;
      } catch { /* An unreadable draft must not hide other resumable drafts. */ }
    }
  } catch { /* Storage may be unavailable in a browser preview. */ }
  return null;
}

function subscribe(onChange: () => void) {
  window.addEventListener(eventName, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(eventName, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useEditorDraftPath(mistakeIds: Set<string>) {
  return useSyncExternalStore(subscribe, () => findEditorDraftPath(mistakeIds), () => null);
}
