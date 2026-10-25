import type { ReactNode } from "react";

export type CockpitSectionLink = {
  id: string;
  label: string;
};

export function CockpitLayout({
  children,
}: {
  sections: CockpitSectionLink[];
  children: ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-8">{children}</div>
    </div>
  );
}

export function CockpitSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg bg-white p-6 shadow-md">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
