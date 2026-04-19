import Image from "next/image";
import badgesData from "@/data/badges.json";

export const Badges: React.FC = () => {
  return (
    <div className="badge-container flex gap-2 flex-wrap">
      {badgesData.map((badge, index) => (
        <a
          href={badge.linkUrl}
          key={index}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center no-underline"
        >
          <Image
            src={badge.imageUrl}
            alt={badge.altText}
            width="88"
            height="31"
            unoptimized={badge.imageUrl.endsWith(".gif")}
          />
        </a>
      ))}
    </div>
  );
};
