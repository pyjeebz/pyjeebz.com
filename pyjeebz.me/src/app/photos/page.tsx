import { PhotographyGallery } from "@/components/photos/photography-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photos - Mujeeb Lawal-Saka",
  description:
    "Photography gallery by Mujeeb Lawal-Saka featuring landscapes, street photography, and moments captured around Toronto and beyond.",
};

export default function Photos() {
  return (
    <main className="max-w-xl mx-auto mt-8 mb-12">
      <div className="px-4">
        <PhotographyGallery />
      </div>
    </main>
  );
}
