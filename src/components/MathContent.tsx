import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkMath from "remark-math";

export function MathContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown skipHtml remarkPlugins={[remarkMath]} rehypePlugins={[rehypeSanitize, rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
