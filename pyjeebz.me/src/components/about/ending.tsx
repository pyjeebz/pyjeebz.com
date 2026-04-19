import Paragraph from "@/ui/paragraph";
import Link from "next/link";

export function Ending() {
  return (
    <div className="px-4 space-y-4">
      <Paragraph>
        Send enquiries directly to my email:{" "}
        <Link href="mailto:lawalsakamujeeb@gmail.com">lawalsakamujeeb@gmail.com</Link>.
      </Paragraph>
      <Paragraph>
        For AssemblyHQ enquiries, reach me at:{" "}
        <Link href="mailto:lawalsakamujeeb@assemblyhq.co">lawalsakamujeeb@assemblyhq.co</Link>.
      </Paragraph>
      <Paragraph>My socials are found at the top of this site.</Paragraph>
    </div>
  );
}

