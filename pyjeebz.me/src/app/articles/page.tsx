import { ArticleContainer } from "@/components/articles/article-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles - Mujeeb Lawal-Saka",
  description:
    "Read technical articles and blog posts by Mujeeb Lawal-Saka covering cloud architecture, infrastructure, and software engineering.",
};

export default function Articles() {
  return (
    <main className="max-w-xl mx-auto mt-4 mb-8 px-4">
      <ArticleContainer />
    </main>
  );
}
