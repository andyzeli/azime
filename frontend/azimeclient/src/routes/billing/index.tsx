import { createRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ArrowLeft, CircleCheck, Clock3, ReceiptText } from "lucide-react";
import { rootRoute } from "../rootRoutes";

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingComponent,
});

export const billingIndexRoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/billing/layout-a", replace: true });
  },
});

function BillingComponent() {
  return (
    <main className="min-h-[calc(100vh-45px)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            <ReceiptText aria-hidden="true" className="size-4" />
            Practice management
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Invoices and payments for your examination cases.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <nav
            aria-label="Billing"
            className="flex gap-6 border-b border-slate-200 px-5 sm:px-8"
          >
            <Link
              to="/billing/layout-a"
              className="-mb-px flex min-h-14 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              activeProps={{ className: "!border-blue-600 !text-blue-700" }}
            >
              <Clock3 aria-hidden="true" className="size-4" />
              Unpaid
            </Link>
            <Link
              to="/billing/layout-b"
              className="-mb-px flex min-h-14 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              activeProps={{ className: "!border-blue-600 !text-blue-700" }}
            >
              <CircleCheck aria-hidden="true" className="size-4" />
              Paid
            </Link>
          </nav>
          <Outlet />
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Billing is in development. These views will become available in a
          future update.
        </p>
      </div>
    </main>
  );
}

export const layoutARoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "layout-a",
  component: LayoutAComponent,
});

function LayoutAComponent() {
  return <BillingPlaceholder paid={false} />;
}

export const layoutBRoute = createRoute({
  getParentRoute: () => billingRoute,
  path: "layout-b",
  component: LayoutBComponent,
});

function LayoutBComponent() {
  return <BillingPlaceholder paid />;
}

function BillingPlaceholder({ paid }: { paid: boolean }) {
  const StatusIcon = paid ? CircleCheck : Clock3;

  return (
    <section
      aria-labelledby="billing-placeholder-title"
      className="flex flex-col items-center px-5 py-14 text-center sm:px-10 sm:py-12"
    >
      <div
        aria-hidden="true"
        className="relative mb-8 flex size-28 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100"
      >
        <div className="flex h-24 w-[74px] -rotate-6 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <ReceiptText
            className="mb-1 size-6 text-slate-400"
            strokeWidth={1.5}
          />
          <div className="h-1.5 w-full rounded-full bg-slate-100" />
          <div className="h-1.5 w-3/4 rounded-full bg-slate-100" />
        </div>
        <span className="absolute -right-1 bottom-1 grid size-10 place-items-center rounded-full border-4 border-white bg-blue-50 text-blue-600">
          <StatusIcon className="size-4" strokeWidth={1.8} />
        </span>
      </div>

      <span className="mb-4 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        Coming soon
      </span>
      <h2
        id="billing-placeholder-title"
        className="text-2xl font-semibold tracking-tight"
      >
        {paid ? "Payment history" : "Accounts Payable"}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500"></p>
      <Link
        to="/cases"
        className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to patient cases
      </Link>
    </section>
  );
}
