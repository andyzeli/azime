import { createRoute, Link, Outlet } from "@tanstack/react-router";
import { rootRoute } from "../rootRoutes";

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingComponent,
});

export const billingIndexRoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "/",
  loader: () => {
    return { redirect: "/billing/layout-a" }; // Redirect to layoutARoute
  },
});

function BillingComponent() {
  return (
    <div>
      <div>I'm a nested layout</div>
      <div className="flex gap-2 border-b">
        <Link
          to="/billing/layout-a"
          activeProps={{
            className: "font-bold",
          }}
        >
          Unpaid
        </Link>
        <Link
          to="/billing/layout-b"
          activeProps={{
            className: "font-bold",
          }}
        >
          Paid
        </Link>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export const layoutARoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "layout-a",
  component: LayoutAComponent,
});

function LayoutAComponent() {
  return <div>I'm layout A!</div>;
}

export const layoutBRoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "layout-b",
  component: LayoutBComponent,
});

function LayoutBComponent() {
  return <div>I'm layout B!</div>;
}
