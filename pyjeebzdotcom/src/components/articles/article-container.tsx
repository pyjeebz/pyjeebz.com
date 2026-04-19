import { ArticleCard } from "./article-card";
import articlesData from "@/data/articles.json";
import type { Article } from "@/types";

export function ArticleContainer() {
  // Sort articles by date (newest first)
  const sortedArticles = [...articlesData].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Convert filename to slug (remove .md extension)
  const getSlug = (filename: string) => {
    return filename.replace(/\.md$/i, "");
  };

  return (
    <div>
      <div className="grid grid-cols-1">
        {sortedArticles.map((article: Article) => (
          <ArticleCard
            key={article.filename}
            title={article.title}
            date={article.date}
            subject={article.subject}
            wordCount={article.wordCount}
            slug={getSlug(article.filename)}
          />
        ))}
      </div>

      {sortedArticles.length === 0 && (
        <div className="text-center pt-12">
          <p className="text-lg text-foreground opacity-60">
            No articles found.
          </p>
        </div>
      )}
    </div>
  );
}
