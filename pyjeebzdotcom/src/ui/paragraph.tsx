import React from "react";

interface ParagraphProps {
  children: React.ReactNode;
  className?: string;
}

export default function Paragraph({
  children,
  className = "",
}: ParagraphProps) {
  const baseClasses =
    "transition-all duration-300 hover:translate-x-2 max-w-fit";
  const combinedClasses = className
    ? `${baseClasses} ${className}`
    : baseClasses;

  return <p className={combinedClasses}>{children}</p>;
}
