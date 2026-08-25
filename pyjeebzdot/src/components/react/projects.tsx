type Item = {
  title: string;
  url: string;
  domain: string;
  description: string;
  /** Internal routes stay in the same tab and get no external-link arrow. */
  internal?: boolean;
};

const Projects = () => {
  const items: Item[] = [
    {
      title: "prescale",
      url: "https://prescale.dev",
      domain: "prescale.dev",
      description: "Pre-launch analytics and waitlists for product launches.",
    },
    {
      title: "why",
      url: "https://github.com/pyjeebz/why",
      domain: "github.com/pyjeebz",
      description: "Explain why a script, command, or process keeps running.",
    },
    {
      title: "ports",
      url: "https://ports.tools",
      domain: "ports.tools",
      description: "Look up which ports a service listens on, fast.",
    },
    {
      title: "toss",
      url: "https://toss.pyjeebz.com",
      domain: "toss.pyjeebz.com",
      description: "Quickly move text between devices with a short code.",
    },
  ];

  return (
    <section>
      <h2 className="font-serif text-[1.35rem] sm:text-2xl font-medium text-off-white tracking-tight mb-10 pb-4 border-b border-hairline">
        Projects
      </h2>
      <ul>
        {items.map((item) => (
          <li
            key={item.title}
            className="border-b border-hairline last:border-b-0"
          >
            <a
              href={item.url}
              {...(item.internal
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="group block py-6 sm:py-7 -mx-1 px-1 sm:px-2 -ml-2 sm:-ml-3 border-l-2 border-transparent hover:border-accent/55 pl-3 sm:pl-4 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 sm:gap-6">
                <div className="min-w-0">
                  <span className="font-serif text-[1.05rem] sm:text-lg text-off-white group-hover:text-accent transition-colors">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block font-sans text-2xs uppercase tracking-[0.14em] text-muted-faint group-hover:text-muted transition-colors">
                    {item.domain}
                  </span>
                </div>
                {!item.internal && (
                  <span
                    className="shrink-0 font-sans text-muted-faint opacity-0 group-hover:opacity-100 transition-opacity text-sm hidden sm:block"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                )}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-muted max-w-xl">
                {item.description}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Projects;