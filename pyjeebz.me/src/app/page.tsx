import { Activity } from "@/components/home/activity";
import { BadgeContainer } from "@/components/home/badge-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mujeeb Lawal-Saka - Architect",
  description:
    "Mujeeb Lawal-Saka is an engineer with an architect's flair. Founder of AssemblyHQ, building intelligent infrastructure with PreScale.",
};

export default function Home() {
  return (
    <main className="max-w-xl mx-auto mt-4 mb-8 home-page-content">
      <Activity />
      <BadgeContainer />
    </main>
  );
}
