import { Blurb } from "@/components/about/blurb";
import { Experiences } from "@/components/about/experiences";
import { Ending } from "@/components/about/ending";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Mujeeb Lawal-Saka",
  description:
    "Mujeeb Lawal-Saka is an engineer with an architect's flair. Founder of AssemblyHQ, interested inbuilding predictive infrastructure systems.",
};

export default function About() {
  return (
    <main className="max-w-xl mx-auto mt-4 mb-8 home-page-content">
      <Blurb />
      <Experiences />
      <Ending />
    </main>
  );
}
