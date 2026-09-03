import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { LoaderCircle } from "lucide-react";

type Props = {
  open: boolean;
  aiRunning: boolean;
  saving: boolean;
  canSave: boolean;
  onCancel: () => void;
  onDiscard: () => Promise<void>;
  onSave: () => Promise<void>;
};

export function NewCardLeaveDialog(props: Props) {
  const { open, aiRunning, saving, canSave, onCancel, onDiscard, onSave } = props;
  return <AlertDialog.Root open={open} onOpenChange={(next) => !next && !saving && onCancel()}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="leave-dialog-overlay" />
      <AlertDialog.Content className="leave-dialog-content">
        <AlertDialog.Title>是否将新建内容保存为草稿？</AlertDialog.Title>
        <AlertDialog.Description>
          {aiRunning
            ? "AI 正在整理。保存后可在错题库中以“草稿”状态继续查看进度和结果。"
            : "保存后会进入错题库并标记为“草稿”；不保存则清空本次新建内容。"}
        </AlertDialog.Description>
        {!canSave && <p className="leave-dialog-hint" role="alert">至少需要输入题目或添加一张图片才能保存草稿。</p>}
        <div className="leave-dialog-actions">
          <AlertDialog.Cancel asChild>
            <button type="button" className="button ghost" disabled={saving}>继续编辑</button>
          </AlertDialog.Cancel>
          <button type="button" className="button danger ghost" disabled={saving}
            onClick={() => void onDiscard()}>不保存</button>
          <button type="button" className="button primary" disabled={saving || !canSave}
            onClick={() => void onSave()}>
            {saving && <LoaderCircle className="spin" size={16} />}保存草稿
          </button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
