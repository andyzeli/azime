import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import type { CaseContactDto } from "@azime/contracts";

const API_BASE_URL = "/api";

export type DbContact = CaseContactDto;
export type NewContact = Omit<CaseContactDto, "id">;

export const fetchContacts = async () => {
  return axios
    .get<Array<DbContact>>(`${API_BASE_URL}/contacts`)
    .then((r) => r.data);
};
export const contactQueryOptions = queryOptions({
  queryKey: ["contacts"],
  queryFn: () => fetchContacts(),
});

export const createContact = async (contact: NewContact) =>
  axios
    .post<{ id: number }>(`${API_BASE_URL}/contacts`, contact)
    .then((r) => r.data);
