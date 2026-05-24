import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with GFM support (bold, italic, links, lists, etc.)
 * Styled to match the app's design system via CSS variables.
 */
export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`markdown-body ${className}`}
      components={{
        // Open links in new tab safely
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline underline-offset-2 hover:opacity-75 transition-opacity break-all"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-[var(--text-color)]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--text-color)]/90">{children}</em>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[var(--color-primary)]/40 pl-4 italic text-[var(--text-color)]/70 my-3">
            {children}
          </blockquote>
        ),
        code: ({ children, className: cls }) => {
          const isBlock = cls?.includes("language-");
          return isBlock ? (
            <pre className="bg-[var(--border-color)]/20 rounded-lg p-3 overflow-x-auto my-3 text-xs font-mono">
              <code>{children}</code>
            </pre>
          ) : (
            <code className="bg-[var(--border-color)]/30 px-1.5 py-0.5 rounded text-xs font-mono text-[var(--color-primary)]">
              {children}
            </code>
          );
        },
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
        hr: () => <hr className="border-[var(--border-color)] my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
