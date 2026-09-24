import { CompanyRow, type Company } from "./CompanyRow";
import { RocketIcon } from "../icons/RocketIcon";
import { ServerIcon } from "../icons/ServerIcon";
import { SparkleIcon } from "../icons/SparkleIcon";

const work: Company[] = [
  {
    company: "DGR Inc",
    tagline: "Cloud migration & solutions consulting",
    startDate: "2023",
    endDate: "2025",
    works: [
      {
        name: "Python Microservices",
        tagline: "AWS + Kubernetes",
        icon: ServerIcon,
        description: (
          <p>
            Built Python microservices and internal developer infrastructure.
            Owned the full cycle — system design, implementation, testing,
            deployment, and code reviews.
          </p>
        ),
      },
      {
        name: "predict",
        tagline: "ML-powered autoscaling on AWS",
        icon: SparkleIcon,
        href: "https://github.com/pyjeebz/predict",
        linkLabel: "See on GitHub",
        description: (
          <p>
            Predictive auto-scaling for e-commerce. It used ML on CloudWatch
            metrics to forecast traffic surges and scale the fleet ahead of
            them. Adopted in the company for an ecommerce customer.
          </p>
        ),
      },
    ],
  },
  {
    company: "360ace",
    tagline: "Software Engineer",
    startDate: "2022",
    endDate: "2023",
    works: [
      {
        name: "Software Engineer",
        tagline: "Full-time role",
        icon: RocketIcon,
      },
    ],
  },
];

type WorkSectionProps = {};

export function WorkSection(props: WorkSectionProps) {
  return (
    <section className="-mx-1">
      <h2 className="mb-2 ml-1 text-zinc-500">Work</h2>
      <div className="flex flex-col divide-y divide-zinc-100">
        {work.map((company) => (
          <CompanyRow key={company.company} company={company} />
        ))}
      </div>
    </section>
  );
}
