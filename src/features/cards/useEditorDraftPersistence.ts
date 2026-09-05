import { useEffect, useRef, type RefObject } from "react";
import { removeEditorDraft, writeEditorDraft } from "./editorDraftStore";

export function useEditorDraftPersistence(
  key: string, snapshot: string, dirty: boolean, initialized: RefObject<boolean>,
  discardOnLeave: RefObject<boolean>, setStatus: (message: string) => void,
) {
  const edited = useRef(false);
  useEffect(() => {
    if (!initialized.current) return;
    if (!dirty) {
      if (edited.current) { removeEditorDraft(key); setStatus("未修改"); }
      return;
    }
    edited.current = true;
    setStatus("正在暂存");
    const timer = window.setTimeout(() => {
      setStatus(writeEditorDraft(key, snapshot) ? "未保存" : "暂存失败");
    }, 700);
    return () => {
      window.clearTimeout(timer);
      if (!discardOnLeave.current) writeEditorDraft(key, snapshot);
    };
  }, [key, snapshot, dirty, initialized, discardOnLeave, setStatus]);
}
