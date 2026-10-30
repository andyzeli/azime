import {
  createRootRouteWithContext,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { RootComponent, NotFoundComponent } from "../App";
import { meQueryOptions } from "./tablet/queries";

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  // The iPad account only gets the questionnaire pages (the API enforces the same).
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions);
    const allowed =
      location.pathname === "/tablet" ||
      location.pathname.startsWith("/patient/questionnaires/");
    if (me.isTablet && !allowed) {
      throw redirect({ to: "/tablet", replace: true });
    }
  },
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/cal", replace: true });
  },
});
