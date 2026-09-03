import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkMath from "remark-math";

export function normalizeMathMarkdown(value: string): string {
  return value
    .replace(/\\\[/g, () => "\n\n$$\n")
    .replace(/\\\]/g, () => "\n$$\n\n")
    .replace(/\\\(/g, () => "$")
    .replace(/\\\)/g, () => "$")
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => `\n\n$$\n${formula.trim()}\n$$\n\n`);
}

export function MathContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={["math-content", className].filter(Boolean).join(" ")}>
      <ReactMarkdown skipHtml remarkPlugins={[remarkMath]} rehypePlugins={[rehypeSanitize, rehypeKatex]}>
        {normalizeMathMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
