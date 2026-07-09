import { DbContact } from "./queries";

const ContactCard = ({ contact }: { contact: DbContact }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="grid grid-cols-3 gap-4">
        {/* Left Column - Name and Type */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-800 truncate">
            {contact.name}
          </h3>
          <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            {contact.type}
          </span>
        </div>

        {/* Middle Column - Email and Phone */}
        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <a
                href={`mailto:${contact.email}`}
                className="hover:text-blue-600 truncate"
              >
                {contact.email}
              </a>
            </div>
          )}

          {/* {contact.phone && (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <a
                href={`tel:${contact.phone}`}
                className="hover:text-blue-600 truncate"
              >
                {contact.phone}
              </a>
            </div>
          )} */}
        </div>

        {/* Right Column - Website and Other URL */}
        <div className="space-y-2">
          {contact.website && (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 truncate"
              >
                Website
              </a>
            </div>
          )}

          {/* {contact.paylinkUrl && (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <a
                href={contact.paylinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 truncate"
              >
                Other Link
              </a>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
