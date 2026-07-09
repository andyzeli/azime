import { useForm } from "@tanstack/react-form";

export interface Contact {
  name: string;
  email: string;
  phone?: string;
  type: string;
  website?: string;
  paylinkUrl?: string;
}

interface ContactFormProps {
  onSubmit: (data: Contact) => void;
}

const ContactForm = ({ onSubmit }: ContactFormProps) => {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      type: "",
      website: "",
      paylinkUrl: "",
    },
    onSubmit: async (values) => {
      onSubmit(values.value);
      form.reset();
    },
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6"
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name *
              </label>
              <form.Field
                name="name"
                validators={{
                  onChange: (value) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="name"
                      type="text"
                      className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                htmlFor="type"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Type *
              </label>
              <form.Field
                name="type"
                validators={{
                  onChange: (value) =>
                    !value ? "Contact type is required" : undefined,
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="type"
                      type="text"
                      className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </>
                )}
              </form.Field>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email *
              </label>
              <form.Field
                name="email"
                validators={{
                  onChange: (value) => {
                    if (!value) return "Email is required";
                    // if (!value.value.includes("@"))
                    //   return "Invalid email address";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="email"
                      type="email"
                      className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone *
              </label>
              <form.Field
                name="phone"
                validators={{
                  onChange: (value) => {
                    if (!value) return "Phone is required";
                    if (value.value.length < 10)
                      return "Phone number must be at least 10 digits";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <>
                    <input
                      id="phone"
                      type="tel"
                      className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700"
              >
                Website
              </label>
              <form.Field name="website">
                {(field) => (
                  <input
                    id="website"
                    type="url"
                    className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.Field>
            </div>
          </div>
          {/* <div>
            <label
              htmlFor="otherUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Other URL
            </label>
            <form.Field name="paylinkUrl">
              {(field) => (
                <input
                  id="otherUrl"
                  type="url"
                  className="mt-1 block w-full h-12 px-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>
          </div> */}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Contact
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
