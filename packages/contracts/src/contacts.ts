// A case_contacts row as returned by GET /contacts.
export type CaseContactDto = {
  id: number;
  name: string;
  type: string | null;
  email: string | null;
  website: string | null;
};
