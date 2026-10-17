import { Outlet, createRoute } from "@tanstack/react-router";
import { rootRoute } from "../rootRoutes";

// The case list lives in the index route, so the cockpit inherits no navigator.
export const pCasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "p_cases",
  component: Outlet,
});
