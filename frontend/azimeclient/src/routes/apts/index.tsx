import { createRoute, Link, Outlet } from "@tanstack/react-router";
import { indexRoute } from "../rootRoutes";

function AptComponent() {
  return (
    <div className="p-2">
      <div className="border-b">I'm a pt</div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
//TODO update css everywhere

export const aptRoute = createRoute({
  getParentRoute: () => indexRoute,
  id: "_apt",
  component: AptComponent,
});

export const calistRoute = createRoute({
  getParentRoute: () => aptRoute,
  id: "_apt-2",
  component: CalistComponent,
});

function CalistComponent() {
  return (
    <div>
      <div>Appointments</div>
      <div className="flex gap-2 border-b">
        <Link
          to="/cal"
          activeProps={{
            className: "font-bold",
          }}
        >
          Calendar
        </Link>
        <Link
          to="/list"
          activeProps={{
            className: "font-bold",
          }}
        >
          List
        </Link>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export const calRoute = createRoute({
  getParentRoute: () => calistRoute,
  path: "/cal",
  component: CalComponent,
});

function CalComponent() {
  return <div>CALENDAR</div>;
}

export const listRoute = createRoute({
  getParentRoute: () => calistRoute,
  path: "/list",
  component: ListComponent,
});

function ListComponent() {
  return <div>LIST</div>;
}
