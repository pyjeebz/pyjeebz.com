import { notFound } from "next/navigation";
import { ArticleReader } from "@/components/articles/article-reader";
import articlesDataRaw from "@/data/articles.json";
import type { Article } from "@/types/article";

const articlesData = articlesDataRaw as Article[];
import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static params for all articles
export async function generateStaticParams() {
  return articlesData.map((article) => ({
    slug: article.filename.replace(".md", ""),
  }));
}

// Generate metadata for each article
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articlesData.find(
    (a) => a.filename.replace(".md", "") === slug
  );

  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: `${article.title} - Mujeeb Lawal-Saka`,
    description: `${article.subject} - ${article.wordCount} words. Published on ${article.date}`,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  // Find the article metadata
  const article = articlesData.find(
    (a) => a.filename.replace(".md", "") === slug
  );

  if (!article) {
    notFound();
  }

  // Read the markdown file
  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "articles",
    article.filename
  );

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    console.error("Error reading article:", error);
    notFound();
  }

  return (
    <main className="max-w-xl mx-auto mt-4 mb-8 px-4">
      <ArticleReader content={content} article={article} />
    </main>
  );
}
