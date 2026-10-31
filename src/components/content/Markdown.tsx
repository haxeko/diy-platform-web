import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

/**
 * Renders trusted, repo-authored GFM markdown with the site's iOS-like prose styles.
 * Output is React elements (no innerHTML).
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-ios", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props: ComponentPropsWithoutRef<"a">) => {
            const external = typeof props.href === "string" && /^https?:\/\//.test(props.href);
            return (
              <a
                {...props}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              />
            );
          },
          table: (props: ComponentPropsWithoutRef<"table">) => (
            <div className="table-wrap">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
