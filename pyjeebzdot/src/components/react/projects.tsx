type Item = {
  title: string;
  url: string;
  /** Internal routes stay in the same tab and get no external-link arrow. */
  internal?: boolean;
};

const Projects = () => {
  const items: Item[] = [
    { title: "prescale", url: "https://prescale.dev" },
    { title: "why", url: "https://github.com/pyjeebz/why" },
    { title: "ports", url: "https://ports.tools" },
    { title: "toss", url: "https://toss.pyjeebz.com" },
    { title: "guestbook", url: "/guestbook", internal: true },
  ];

  return (
    <nav aria-label="Projects and pages">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.title}>
            <a
              href={item.url}
              {...(item.internal
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="group relative flex items-center justify-between py-3 font-mono text-[15px]"
            >
              <span className="text-muted transition-colors duration-200 group-hover:text-off-white">
                {item.title}
              </span>

              {!item.internal && (
                <span
                  className="text-muted-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </span>
              )}

              {/* Underline wipes in from the left on hover. */}
              <span
                className="absolute bottom-2 left-0 h-px w-0 bg-accent/40 transition-all duration-300 ease-out group-hover:w-full"
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Projects;
