import { useRef, useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useEditorDraftPersistence } from "./useEditorDraftPersistence";

afterEach(() => { cleanup(); localStorage.clear(); });
function Editor({ completed = false }: { completed?: boolean }) {
  const ready = useRef(true), leave = useRef(completed);
  const [, status] = useState("");
  useEditorDraftPersistence("zhishi.editor-draft.new", "latest-input", true, ready, leave, status);
  return null;
}

it("flushes the last keystroke when navigation beats the debounce", () => {
  const view = render(<Editor />);
  view.unmount();
  expect(localStorage.getItem("zhishi.editor-draft.new")).toBe("latest-input");
});

it("does not recreate a draft after a successful save or explicit discard", () => {
  const view = render(<Editor completed />);
  view.unmount();
  expect(localStorage.getItem("zhishi.editor-draft.new")).toBeNull();
});
