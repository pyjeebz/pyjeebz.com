import Image from "next/image";

import { useTheme } from "@/hooks/use-theme";

import uwcsWrBlack from "@/images/icons/blackuwcswebring.svg";
import uwcsWrWhite from "@/images/icons/uwcscwebring.svg";

import { MoveLeft, MoveRight } from "lucide-react";
import { DEFAULT_ICON_SIZE } from "@/constants/icons";

export function Webring() {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  return (
    <div className="ml-2 border-pink">
      <div className="flex items-center justify-center gap-2">
        <a
          className="cs-webring-links"
          href="https://cs.uwatering.com/#https://dundeezhang.com?nav=prev"
          aria-label="Previous site in UWaterloo CS webring"
        >
          <MoveLeft size={DEFAULT_ICON_SIZE} />
        </a>
        <a
          href="https://cs.uwatering.com/#https://dundeezhang.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="UWaterloo CS webring home"
        >
          <Image
            src={isDarkMode ? uwcsWrWhite : uwcsWrBlack}
            alt="UWaterloo CS Web Ring"
            className="h-4 w-4 min-w-4 transition-all duration-300 hover:rotate-[10deg]"
          />
        </a>
        <a
          className="cs-webring-links"
          href="https://cs.uwatering.com/#https://dundeezhang.com?nav=next"
          aria-label="Next site in UWaterloo CS webring"
        >
          <MoveRight size={DEFAULT_ICON_SIZE} />
        </a>
      </div>
    </div>
  );
}
