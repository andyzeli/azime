import { Link, Outlet, useLocation } from "@tanstack/react-router";

// Shown at the left of the app bar. Put the logo file in public/ and set its path here.
const BUSINESS_NAME = "Evalitas";
const LOGO_SRC: string | null = "/logo.svg";

export function RootComponent() {
  const location = useLocation();
  const isPatientQuestionnaire =
    location.pathname === "/tablet" ||
    location.pathname.startsWith("/patient/questionnaires/");

  return (
    <>
      {!isPatientQuestionnaire ? (
        <>
          <nav className="flex h-14 items-center gap-1 bg-zinc-900 px-5 text-sm">
            <Link to="/cal" className="mr-6 flex items-center gap-2.5">
              {LOGO_SRC ? (
                <img
                  src={LOGO_SRC}
                  alt={BUSINESS_NAME}
                  className="h-5 w-auto"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-base font-bold text-white">
                  {BUSINESS_NAME.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <Link
              to="/cal"
              className="rounded-md px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "!bg-white/15 !text-white" }}
            >
              Dashboard
            </Link>
            <Link
              to="/cases"
              className="rounded-md px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "!bg-white/15 !text-white" }}
            >
              Case Intake
            </Link>
            <Link
              to="/p_cases"
              className="rounded-md px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "!bg-white/15 !text-white" }}
            >
              Physician Workspace
            </Link>
            {/* Admin and reference pages sit apart from the case workflow. */}
            <span className="flex-1" />
            <Link
              to="/contacts"
              className="rounded-md px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "!bg-white/15 !text-white" }}
            >
              Contacts
            </Link>
            <Link
              to="/billing"
              className="rounded-md px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "!bg-white/15 !text-white" }}
            >
              Billing
            </Link>
          </nav>
        </>
      ) : null}
      <Outlet />
      {/* <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" /> */}
    </>
  );
}

export function NotFoundComponent() {
  return (
    <div>
      <p>This is the notFoundComponent configured on root route</p>
      <Link to="/">Start Overf</Link>
    </div>
  );
}
