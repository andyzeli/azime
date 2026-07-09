import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../../main";
import ContactCard from "./ContactCard";
import ContactForm, { Contact } from "./ContactForm";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { createContact, fetchContacts } from "./queries";

export const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contacts",
  component: ContactComponent,
});

function ContactComponent() {
  const queryClient = useQueryClient();
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });
  // const contact = {
  //   name: "John Doe",
  //   id: 2,
  //   email: "john@example.com",
  //   phone: "+1 234 567 8900",
  //   type: "Client",
  //   website: "https://example.com",
  //   paylinkUrl: "https://linkedin.com/in/johndoe",
  // };

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: any) => {
      console.error(error);
    },
  });

  const handleSubmit = (data: Contact) => {
    mutation.mutate(data);
  };

  return (
    <div className="py-12 px-20">
      <div className="text-2xl font-bold mb-12">Contacts</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <p>Add New</p>
          <ContactForm onSubmit={handleSubmit} />
        </div>
        <div className="col-span-2 overflow-y-scroll">
          <div className="flex flex-col gap-4 px-12">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              contacts?.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
