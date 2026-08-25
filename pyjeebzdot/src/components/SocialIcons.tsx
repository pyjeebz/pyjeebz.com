import {
  Github,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";

const icons = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
} as const;

type IconName = keyof typeof icons;

const socialLinks: { name: IconName; href: string; label: string }[] = [
  { name: "github", href: "https://github.com/pyjeebz", label: "GitHub" },
  { name: "twitter", href: "https://x.com/pyjeebz", label: "X / Twitter" },
  { name: "linkedin", href: "https://www.linkedin.com/in/mujeeb-lawal-saka/", label: "LinkedIn" },
  { name: "email", href: "mailto:lawalsakamujeeb@gmail.com", label: "Email" },
];

export default function SocialIcons() {
  return (
    <div className="flex items-center gap-3" aria-label="Social links">
      {socialLinks.map(({ name, href, label }) => {
        const Icon = icons[name];
        const isExternal = name !== "email";
        return (
          <a
            key={name}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : "noreferrer"}
            aria-label={label}
            className="text-muted-faint transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb))/0.5] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-[2px] p-[2px]"
          >
            <Icon width="16" height="16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </a>
        );
      })}
    </div>
  );
}