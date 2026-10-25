import { createRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Globe, Mail, UserPlus } from "lucide-react";
import { rootRoute } from "../rootRoutes";
import { casesQueryOptions } from "../cases/queries";
import { ContactForm } from "./ContactForm";
import { contactQueryOptions } from "./queries";

export const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contacts",
  component: ContactsPage,
});

function ContactsPage() {
  const { data: contacts, isPending } = useQuery(contactQueryOptions);
  const { data: cases } = useQuery(casesQueryOptions);
  const caseCount = (contactId: number) =>
    cases?.filter((patientCase) => patientCase.caseContact === contactId).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Referral sources, usually attorney offices. Each case is linked to one when it is created.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <div className="grid size-9 place-items-center rounded-md bg-blue-50 text-blue-700">
            <UserPlus className="size-5" />
          </div>
          <h2 className="font-semibold text-slate-900">New contact</h2>
        </div>
        <div className="px-6 py-5">
          <ContactForm />
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg bg-white shadow-md">
        <div className="flex items-baseline gap-2 border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">All contacts</h2>
          <span className="text-sm text-slate-400">{contacts?.length ?? ""}</span>
        </div>
        {isPending ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">Loading…</p>
        ) : contacts?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Website</th>
                <th className="px-6 py-2.5 text-right font-medium">Cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{contact.name}</div>
                        {contact.type ? <div className="text-xs text-slate-500">{contact.type}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-blue-700 hover:underline"
                      >
                        <Mail className="size-3.5 shrink-0" />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {contact.website ? (
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-700 hover:underline"
                      >
                        <Globe className="size-3.5 shrink-0" />
                        {contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">{caseCount(contact.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-slate-500">
            No contacts yet. Add one above, or while creating a{" "}
            <Link to="/cases" className="font-medium text-blue-700 hover:underline">
              new case
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
