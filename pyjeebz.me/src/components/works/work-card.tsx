"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";

import { DEFAULT_ICON_SIZE } from "@/constants/icons";

interface WorkCardProps {
  title: string;
  tech: string;
  description: string;
  image: string;
  repo: string;
  repoLabel: string;
  buttonClass: string;
  link: string;
}

export function WorkCard({
  title,
  tech,
  description,
  image,
  repo,
  repoLabel,
  buttonClass,
  link,
}: WorkCardProps) {
  const shouldShowExternalButton = buttonClass !== "hide-button-class" && link;
  const hasImage = image && image.trim() !== "";

  return (
    <div
      className="border-0 rounded overflow-hidden shadow-lg backdrop-blur-sm bg-glass-bg"
    >
      {/* Image */}
      {hasImage && (
        <div className="relative w-full work-card-image-container">
          <Image
            src={`/images/works/${image}`}
            alt={title}
            fill
            className="object-cover work-card-image"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            {shouldShowExternalButton && (
              <Link
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="work-card-icon"
                title="View Project"
              >
                <ExternalLink
                  className="transition-all duration-300 hover:rotate-[15deg]"
                  size={DEFAULT_ICON_SIZE}
                />
              </Link>
            )}
            <Link
              href={repo}
              target="_blank"
              rel="noopener noreferrer"
              className="work-card-icon"
              title={repoLabel}
            >
              <Github
                className="transition-all duration-300 hover:rotate-[15deg] hover:text-[#6366f1]"
                size={DEFAULT_ICON_SIZE}
              />
            </Link>
          </div>
        </div>

        <p
          className="text-sm mb-3 text-list-text opacity-80"
        >
          {description}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1">
          {tech.split(", ").map((technology, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded text-xs bg-grid text-foreground"
            >
              {technology}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
