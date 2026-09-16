import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an assistant chat message as Markdown (bullets, bold, inline code,
 * fenced formula blocks, links). Spacing/weight only -- font size and colour
 * are inherited from the parent bubble so the same component fits both the
 * main chat (13px) and the per-finding panel (12px).
 */
export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-black/5 rounded px-1 py-0.5 font-mono text-[0.9em] break-words">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="bg-black/5 rounded p-2 font-mono text-[0.9em] overflow-x-auto my-1 whitespace-pre-wrap [&>code]:bg-transparent [&>code]:p-0">{children}</pre>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
