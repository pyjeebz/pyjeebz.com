import { WorksClient } from "@/components/works/works-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Works - Mujeeb Lawal-Saka",
  description:
    "Browse projects and works by Mujeeb Lawal-Saka, including PreScale, Predict, and cloud-native applications.",
};

export default function Works() {
  return (
    <main className="max-w-xl mx-auto mt-4 mb-8 px-4">
      <WorksClient />
    </main>
  );
}
