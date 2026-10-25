import { Link, Outlet, useLocation } from "@tanstack/react-router";

export function RootComponent() {
  const location = useLocation();
  const isPatientQuestionnaire = location.pathname.startsWith(
    "/patient/questionnaires/"
  );

  return (
    <>
      {!isPatientQuestionnaire ? (
        <>
          <div className="p-2 flex gap-4 text-lg">
            <Link
              to="/cal"
              activeProps={{
                className: "font-bold",
              }}
              activeOptions={{ exact: false }}
            >
              Dashboard
            </Link>{" "}
            <Link
              to="/cases"
              activeProps={{
                className: "font-bold",
              }}
            >
              Case Intake
            </Link>{" "}
            <Link
              to="/billing"
              activeProps={{
                className: "font-bold",
              }}
            >
              Billing
            </Link>{" "}
            <Link
              to="/contacts"
              activeProps={{
                className: "font-bold",
              }}
            >
              Contacts
            </Link>{" "}
            <Link
              to="/p_cases"
              activeProps={{
                className: "font-bold",
              }}
            >
              Physician Workspace
            </Link>{" "}
          </div>
          <hr />
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
