import Paragraph from "@/ui/paragraph";

export function Blurb() {
  return (
    <div className="px-4">
      <div className="space-y-4">
        <Paragraph>
          Hi, I&apos;m Mujeeb — also known as pyjeebz.
        </Paragraph>
        <Paragraph>
          I&apos;m an architect and engineer focused on building predictive infrastructure systems that help teams move from reacting to anticipating. I turn raw infrastructure data into intelligent signals, enabling better scaling decisions, reducing waste, and improving reliability before issues surface.
        </Paragraph>
        <Paragraph>
          My foundation is in cloud and distributed systems, but my focus is broader: how intelligent software is designed, operationalized, and shipped at scale. I think in systems, not just components, and care deeply about the trade-offs between performance, cost, and developer experience.
        </Paragraph>
        <Paragraph>
          I build tools that give infrastructure teams foresight, not just visibility.
        </Paragraph>
        <Paragraph>
          I&apos;m also co-founding AssemblyHQ — <i>a builders collective that thinks, makes, and ships.</i>
        </Paragraph>
      </div>
    </div>
  );
}

