import { useForm } from "@tanstack/react-form";
import { DbContact } from "../../../contacts/queries";

export type NewPatientCase = {
  providerAssigned?: string | null;
  patientName: string;
  patientLastName?: string;
  caseContact?: number;
  caseType?: string;
};
interface NewCaseFormProps {
  onSubmit: (data: NewPatientCase) => void;
  contacts: DbContact[];
}
const caseTypes = ["Work Injury", "Personal Injury", "Other"];
const NewCaseForm = ({ onSubmit, contacts }: NewCaseFormProps) => {
  const form = useForm({
    defaultValues: {
      patientName: "",
      patientLastName: "",
      caseContact: 0,
      caseType: "",
      //providerAssigned: null,
    },
    onSubmit: async (values) => {
      console.log(values.value);
      onSubmit(values.value);
      //form.reset();
    },
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className=" mx-auto bg-white rounded-lg shadow-md p-6"
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name *
              </label>
              <form.Field
                name="patientName"
                validators={{
                  onChange: (value) =>
                    !value ? "First name is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="firstName"
                      type="text"
                      className="mt-1 px-2 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors && (
                      <span className="text-sm text-red-600">
                        {field.state.meta.errors}
                      </span>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name *
              </label>
              <form.Field
                name="patientLastName"
                validators={{
                  onChange: (value) =>
                    !value ? "Last name is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="lastName"
                      type="text"
                      className="mt-1 px-2 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors && (
                      <span className="text-sm text-red-600">
                        {field.state.meta.errors}
                      </span>
                    )}
                  </>
                )}
              </form.Field>
            </div>
            {/* <div>
              <label
                htmlFor="documents"
                className="block text-sm font-medium text-gray-700"
              >
                Maybe document upload button
              </label>
            </div> */}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="contactId"
                className="block text-sm font-medium text-gray-700"
              >
                Contact *
              </label>
              <form.Field
                name="caseContact"
                validators={{
                  onChange: (value) =>
                    !value ? "Contact selection is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <select
                      id="contactId"
                      className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    >
                      <option value="">Select a contact...</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={Number(contact.id)}>
                          {contact.name}
                        </option>
                      ))}
                    </select>
                    {field.state.meta.errors && (
                      <span className="text-sm text-red-600">
                        {field.state.meta.errors}
                      </span>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <div>
              <label
                htmlFor="caseType"
                className="block text-sm font-medium text-gray-700"
              >
                Case Type *
              </label>
              <form.Field
                name="caseType"
                validators={{
                  onChange: (value) =>
                    !value ? "Case type is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <select
                      id="caseType"
                      className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      <option value="">Select case type...</option>
                      {caseTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {field.state.meta.errors && (
                      <span className="text-sm text-red-600">
                        {field.state.meta.errors}
                      </span>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Case
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCaseForm;
