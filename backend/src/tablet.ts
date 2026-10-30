import type { FastifyRequest } from "fastify";

// The office iPad signs in to IAP as this account; it may only fill in questionnaires.
export const TABLET_EMAIL = "tablet@evalitas.com";

// IAP sends "accounts.google.com:<email>". Only IAP can invoke the Cloud Run service
// (--no-allow-unauthenticated), so the header is trusted. Locally it's absent.
export const getUserEmail = (request: FastifyRequest) => {
  const header = request.headers["x-goog-authenticated-user-email"];
  return typeof header === "string"
    ? header.replace("accounts.google.com:", "")
    : null;
};

export const isTablet = (request: FastifyRequest) =>
  getUserEmail(request) === TABLET_EMAIL;

// Client pages (GET of anything outside /api) plus the questionnaire endpoints.
export const isTabletAllowed = (method: string, url: string) => {
  const path = url.split("?")[0];

  if (!path.startsWith("/api/")) {
    return method === "GET";
  }

  if (method === "GET") {
    return (
      path === "/api/me" ||
      path === "/api/tablet/questionnaires" ||
      /^\/api\/questionnaires\/[^/]+$/.test(path)
    );
  }

  return method === "POST" && /^\/api\/questionnaires\/[^/]+\/submit$/.test(path);
};
