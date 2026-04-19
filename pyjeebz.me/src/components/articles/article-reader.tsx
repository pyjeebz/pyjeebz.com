import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_ICON_SIZE } from "@/constants/icons";
import Image from "next/image";

interface ArticleReaderProps {
  content: string;
  article: {
    title: string;
    date: string;
    subject: string;
    wordCount: number;
  };
}

export function ArticleReader({ content, article: _article }: ArticleReaderProps) {
  return (
    <div>
      {/* Back button */}
      <Link
        href="/articles"
        className="inline-flex items-center gap-2 mb-4 text-foreground opacity-80 transition-all duration-300 hover:translate-x-[-8px] hover:text-pink!"
      >
        <ArrowLeft size={DEFAULT_ICON_SIZE} />
        <span>Back to articles</span>
      </Link>

      {/* Article content */}
      <article className="prose prose-lg max-w-none text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold mb-4 text-foreground">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold mb-3 mt-6 text-foreground">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">
                {children}
              </h3>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-pink hover:underline transition-all duration-300"
                target={
                  href && typeof href === "string" && href.startsWith("http")
                    ? "_blank"
                    : undefined
                }
                rel={
                  href && typeof href === "string" && href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                {children}
              </a>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded text-sm bg-grid text-foreground">
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className={`${className} block p-4 rounded my-4 overflow-x-auto text-sm bg-grid text-foreground`}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="p-4 rounded my-4 overflow-x-auto text-sm bg-grid">
                {children}
              </pre>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-list-text">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-list-text">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="ml-4 text-list-text">
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 pl-4 my-4 italic border-pink text-list-text opacity-90">
                {children}
              </blockquote>
            ),
            img: ({ src, alt }) => {
              if (!src || typeof src !== "string") return null;

              return (
                <Image
                  src={src}
                  alt={alt || "Article image"}
                  width={1200}
                  height={800}
                  className="rounded shadow-lg w-full h-auto my-6 border border-button-border"
                />
              );
            },
            p: ({ children, node: _node, ...props }) => {
              // Check if the paragraph only contains an image
              const hasOnlyImage =
                children &&
                typeof children === "object" &&
                "type" in children &&
                children.type === "img";

              if (hasOnlyImage) {
                return <>{children}</>;
              }

              return (
                <p
                  className="mb-4 leading-relaxed text-list-text"
                  {...props}
                >
                  {children}
                </p>
              );
            },
            hr: () => (
              <hr className="my-8 border-grid opacity-50" />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>

      {/* Back to articles link at bottom */}
      <div className="mt-6">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-foreground opacity-80 transition-all duration-300 hover:translate-x-[-8px] hover:text-pink!"
        >
          <ArrowLeft size={DEFAULT_ICON_SIZE} />
          <span>Back to all articles</span>
        </Link>
      </div>
    </div>
  );
}
