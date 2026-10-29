import { createRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Stethoscope,
  Users,
} from "lucide-react";
import { rootRoute } from "../rootRoutes";

export const aptRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_apt",
  component: Outlet,
});

export const calistRoute = createRoute({
  getParentRoute: () => aptRoute,
  id: "_apt-2",
  component: Outlet,
});

export const calRoute = createRoute({
  getParentRoute: () => calistRoute,
  path: "/cal",
  component: DashboardComponent,
});

export const listRoute = createRoute({
  getParentRoute: () => calistRoute,
  path: "/list",
  beforeLoad: () => {
    throw redirect({ to: "/cal", replace: true });
  },
});

const plannedInsights = [
  {
    icon: Users,
    title: "Referral sources",
    description:
      "Who sends cases your way and your most active referral partners.",
  },
  {
    icon: Stethoscope,
    title: "Physicians",
    description: "The physicians you’ve hired and your examiner network.",
  },
  {
    icon: ClipboardList,
    title: "Case activity",
    description: "Case volume and progress across your practice.",
  },
];

function DashboardComponent() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            <LayoutDashboard aria-hidden="true" className="size-4" />
            Practice management
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Practice activity and insights, in one place.
          </p>
        </header>

        <section
          aria-labelledby="dashboard-placeholder-title"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col items-center px-5 py-12 text-center sm:px-10">
            <div
              aria-hidden="true"
              className="relative mb-7 flex size-28 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100"
            >
              <div className="flex size-20 -rotate-6 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <ChartNoAxesCombined
                  className="size-10 text-slate-400"
                  strokeWidth={1.25}
                />
              </div>
              <span className="absolute -right-1 bottom-1 grid size-10 place-items-center rounded-full border-4 border-white bg-blue-50 text-blue-600">
                <LayoutDashboard className="size-4" strokeWidth={1.8} />
              </span>
            </div>
            <span className="mb-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Coming soon
            </span>
            <h2
              id="dashboard-placeholder-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Relevant Stats & Info
            </h2>
            <Link
              to="/cases"
              className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              View patient cases
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <ul
            aria-label="Planned dashboard insights"
            className="grid gap-6 border-t border-slate-100 bg-slate-50/50 px-6 py-7 sm:grid-cols-3 sm:gap-8 sm:px-8"
          >
            {plannedInsights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-slate-400"
                  strokeWidth={1.5}
                />
                <div>
                  <h3 className="text-sm font-medium text-slate-800">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Dashboard features are in development.
        </p>
      </div>
    </main>
  );
}
