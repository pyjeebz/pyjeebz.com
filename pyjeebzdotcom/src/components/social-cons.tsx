import { Twitter, Mail, Linkedin, Github } from "lucide-react";
import { SOCIAL_ICON_SIZE } from "@/constants/icons";
import { SearchButton } from "@/components/command-palette";

const SOCIAL_LINKS = [
  {
    href: "https://x.com/pyjeebz",
    label: "Twitter profile",
    icon: Twitter,
    hoverColor: "hover:text-[#1DA1F2]",
  },
  {
    href: "https://github.com/pyjeebz",
    label: "GitHub profile",
    icon: Github,
    hoverColor: "hover:text-[#6366f1]",
  },
  {
    href: "https://www.linkedin.com/in/mujeeb-lawal-saka/",
    label: "LinkedIn profile",
    icon: Linkedin,
    hoverColor: "hover:text-[#0077B5]",
  },
  {
    href: "mailto:lawalsakamujeeb@gmail.com",
    label: "Email address",
    icon: Mail,
    hoverColor: "hover:text-[#7C3AED]",
  },
] as const;

export function SocialCons() {
  return (
    <ul className="flex space-x-1 sm:space-x-1 gap-4 sm:gap-0 pb-4 sm:pb-0">
      {SOCIAL_LINKS.map(({ href, label, icon: Icon, hoverColor }) => (
        <li key={href} className="p-0 sm:p-2">
          <a
            href={href}
            aria-label={label}
            className={`social-link ${hoverColor}`}
          >
            <Icon size={SOCIAL_ICON_SIZE} />
          </a>
        </li>
      ))}
      <li className="hidden sm:block ml-2">
        <SearchButton />
      </li>
    </ul>
  );
}
