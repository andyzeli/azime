import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import { Contact } from "./ContactForm";
import { CaseContacts } from "../../../../../backend/src/db/schema";
export class NotFoundError extends Error {}

const API_BASE_URL = "http://localhost:4000";

// export type DbContact = Contact & {
//   id: number;
// };
export type DbContact = CaseContacts;
export const fetchContacts = async () => {
  return axios
    .get<Array<DbContact>>(`${API_BASE_URL}/contacts`)
    .then((r) => r.data);
};
export const contactQueryOptions = queryOptions({
  queryKey: ["contacts"],
  queryFn: () => fetchContacts(),
});

export const createContact = async (contact: Contact) => {
  return axios.post(`${API_BASE_URL}/contacts`, contact);
};
