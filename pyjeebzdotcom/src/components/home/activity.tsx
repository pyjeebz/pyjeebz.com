import { CustomList, CustomListItem } from "@/ui/custom-list";
import Link from "next/link";

export function Activity() {
  return (
    <div className="max-w-xl mx-auto my-4 px-4 home-page-content">
      <CustomList>
        <CustomListItem>
          <p className="font-bold">Currently:</p>
        </CustomListItem>
        <CustomListItem isSubItem>
          Founder & Building @{" "}
          <Link href="https://assemblyhq.co" target="_blank">
            AssemblyHQ
          </Link>
        </CustomListItem>
        <CustomListItem isSubItem>
          Building @{" "}
          <Link href="https://prescale.dev/" target="_blank">
            PreScale
          </Link>
        </CustomListItem>
      </CustomList>

      <div className="my-4" />

      <CustomList>
        <CustomListItem>
          <p className="font-bold">Recently:</p>
        </CustomListItem>
        <CustomListItem isSubItem>
          Cloud & Software Engineer @{" "}
          <Link href="#" target="_blank">
            DGR
          </Link>
        </CustomListItem>
        <CustomListItem isSubItem>
          IT Support Technician @{" "}
          <Link href="#" target="_blank">
            360ace
          </Link>
        </CustomListItem>
      </CustomList>

      <div className="my-4" />

      <CustomList>
        <CustomListItem>
          I&apos;m starting article writing soon.
        </CustomListItem>
      </CustomList>

      <div className="my-4" />
    </div>
  );
}

