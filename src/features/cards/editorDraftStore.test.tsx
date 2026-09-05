import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { findEditorDraftPath, removeEditorDraft, useEditorDraftPath, writeEditorDraft } from "./editorDraftStore";

afterEach(() => { cleanup(); localStorage.clear(); });
const draft = JSON.stringify({ values: { question: "未保存的问题" }, knowledgePoints: [], assets: [] });

it("updates the capture action after draft writes and saves within the same window", () => {
  function Capture() { return <span>{useEditorDraftPath(new Set()) || "添加错题"}</span>; }
  render(<Capture />);
  act(() => { writeEditorDraft("zhishi.editor-draft.new", draft); });
  expect(screen.getByText("/cards/new")).toBeInTheDocument();
  act(() => { removeEditorDraft("zhishi.editor-draft.new"); });
  expect(screen.getByText("添加错题")).toBeInTheDocument();
});

it("ignores malformed, empty, deleted and practice drafts without deleting them", () => {
  localStorage.setItem("zhishi.editor-draft.new", "malformed");
  localStorage.setItem("zhishi.editor-draft.practice", draft);
  localStorage.setItem("zhishi.editor-draft.empty", JSON.stringify({ values: { subject: "数学" }, knowledgePoints: [] }));
  localStorage.setItem("zhishi.editor-draft.mistake", draft);
  expect(findEditorDraftPath(new Set(["mistake", "empty"]))).toBe("/cards/mistake/edit");
  expect(localStorage.getItem("zhishi.editor-draft.new")).toBe("malformed");
  expect(localStorage.getItem("zhishi.editor-draft.practice")).toBe(draft);
});
