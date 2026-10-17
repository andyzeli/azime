import { createRootRouteWithContext, createRoute } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { RootComponent, IndexRouteComponent, NotFoundComponent } from "../App";

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRouteComponent,
});
