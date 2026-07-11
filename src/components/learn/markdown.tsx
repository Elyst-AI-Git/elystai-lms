import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Sanitized markdown renderer for lesson bodies (spec A5). No raw HTML
 * pass-through: react-markdown ignores raw HTML by default and
 * rehype-sanitize scrubs anything that slips in - the plan's XSS mitigation.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="lesson-prose [&_a]:text-emerald [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-emerald/30 [&_blockquote]:pl-4 [&_blockquote]:text-fg-3 [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:text-[0.9em] [&_h1]:font-display [&_h1]:text-h3 [&_h1]:font-bold [&_h1]:tracking-display [&_h1]:text-fg [&_h2]:font-display [&_h2]:text-body [&_h2]:font-bold [&_h2]:tracking-display [&_h2]:text-fg [&_h3]:font-semibold [&_h3]:text-fg [&_li]:ml-5 [&_li+li]:mt-2 [&_ol]:list-decimal [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
