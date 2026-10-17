import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchMessage } from "./routes/cases/queries";

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
              Patient Cases
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
              to="/mockups"
              activeProps={{
                className: "font-bold",
              }}
            >
              Mockups
            </Link>{" "}
            <Link
              // @ts-expect-error
              to="/this-route-does-not-exist"
              activeProps={{
                className: "font-bold",
              }}
            >
              This Route Does Not Exist
            </Link>
            <Link
              to="/p_cases"
              activeProps={{
                className: "font-bold",
              }}
            >
              Provider Cases
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

export function IndexRouteComponent() {
  const mq = useQuery({
    queryKey: ["foo"],
    queryFn: () => fetchMessage(),
  });
  const m = mq.data;
  console.log(m);
  if (!m) return <>loading</>;
  return (
    <div className="p-2">
      <h3>Welcome Home! {m.message} </h3>
      <Outlet />
    </div>
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
