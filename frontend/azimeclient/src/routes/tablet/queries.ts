import axios from "redaxios";
import { queryOptions } from "@tanstack/react-query";
import type { MeDto, TabletQuestionnaireDto } from "@azime/contracts";

const API_BASE_URL = "/api";

export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: () => axios.get<MeDto>(`${API_BASE_URL}/me`).then((r) => r.data),
  staleTime: Infinity,
});

export const tabletQuestionnairesQueryOptions = queryOptions({
  queryKey: ["tabletQuestionnaires"],
  queryFn: () =>
    axios
      .get<TabletQuestionnaireDto[]>(`${API_BASE_URL}/tablet/questionnaires`)
      .then((r) => r.data),
  refetchInterval: 15_000,
});
