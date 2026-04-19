import { Badges } from "./badges";
import Paragraph from "@/ui/paragraph";
import Link from "next/link";

export function BadgeContainer() {
  return (
    <div className="max-w-xl mx-auto my-4 px-4 home-page-content">
      <Paragraph>
        Here are a few{" "}
        <Link href="https://en.wikipedia.org/wiki/Web_badge" target="_blank">
          88x31px
        </Link>{" "}
        gif badges just for the fun of it:
      </Paragraph>
      <div className="my-4" />
      <Badges />
      <div className="my-4" />
    </div>
  );
}
