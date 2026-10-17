import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../rootRoutes";
import { casesQueryOptions } from "./queries";

export const casesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "cases",
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(casesQueryOptions),
}).lazy(() => import("./cases.lazy").then((d) => d.Route));
