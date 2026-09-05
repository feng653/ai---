import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { emptyCardInput } from "../../domain/card";
import { CardEditorFields, type CardFormValues } from "./CardEditorFields";

function Harness({ selectImage }: { selectImage: (file?: File) => void }) {
  const form = useForm<CardFormValues>({ defaultValues: emptyCardInput() });
  return (
    <CardEditorFields
      form={form}
      assets={[]}
      knowledgePoints={[]}
      availableCards={[]}
      chapterDraft=""
      pointDraft=""
      fileInput={createRef<HTMLInputElement>()}
      setChapterDraft={vi.fn()}
      setPointDraft={vi.fn()}
      setKnowledgePoints={vi.fn()}
      addKnowledgePoint={vi.fn()}
      selectImage={selectImage}
      removeAsset={vi.fn()}
    />
  );
}

describe("CardEditorFields image input", () => {
  it("passes a dropped image into the shared image editor flow", () => {
    const selectImage = vi.fn();
    const image = new File([new Uint8Array([1, 2, 3])], "question.png", { type: "image/png" });
    render(<Harness selectImage={selectImage} />);

    fireEvent.drop(screen.getByRole("button", { name: /添加图片/ }), {
      dataTransfer: { files: [image] },
    });

    expect(selectImage).toHaveBeenCalledWith(image);
  });
});
