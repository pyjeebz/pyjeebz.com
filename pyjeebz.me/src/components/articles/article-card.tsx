import Link from "next/link";

interface ArticleCardProps {
  title: string;
  date: string;
  subject: string;
  wordCount: number;
  slug: string;
}

export function ArticleCard({
  title,
  date,
  subject,
  wordCount,
  slug,
}: ArticleCardProps) {
  return (
    <div className="mb-4 last:mb-0 transition-all duration-300 hover:translate-x-[8px] group w-fit">
      <Link href={`/articles/${slug}`} className="block article-page w-fit">
        <div className="font-bold transition-colors duration-300 group-hover:text-pink">
          {title}
        </div>
        <div className="text-sm text-list-text">
          {date} • {subject} • {wordCount} words
        </div>
      </Link>
    </div>
  );
}
