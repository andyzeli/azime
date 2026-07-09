export const fakeContacts = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@medical.com",
    phone: "(555) 123-4567",
    type: "Primary Care Physician",
    website: "www.sjohnsonmd.com",
  },
  {
    id: "2",
    name: "James Wilson, Esq.",
    email: "jwilson@lawfirm.com",
    phone: "(555) 987-6543",
    type: "Attorney",
    website: "www.wilsonlaw.com",
  },
  {
    id: "3",
    name: "Mary Thompson",
    email: "mthompson@insurance.com",
    phone: "(555) 456-7890",
    type: "Insurance Agent",
    website: "www.insuranceco.com",
  },
];

export const fakeCaseTypes = [
  "Personal Injury",
  "Medical Malpractice",
  "Workers Compensation",
  "Disability Claim",
  "Insurance Dispute",
];

export const fakeCases = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    type: "Personal Injury",
    status: "in_progress",
    contactId: "2",
    summary:
      "Motor vehicle accident on 01/15/2024. Multiple injuries including whiplash and lower back pain.",
    clinicalNotes:
      "Patient presents with persistent neck pain and reduced range of motion. Physical therapy recommended.",
    documents: [
      {
        id: "doc1",
        name: "Initial Medical Report.pdf",
        url: "/fake-url/doc1.pdf",
        uploadedAt: "2024-01-16T10:30:00Z",
      },
      {
        id: "doc2",
        name: "MRI Results.pdf",
        url: "/fake-url/doc2.pdf",
        uploadedAt: "2024-01-20T15:45:00Z",
      },
    ],
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    type: "Medical Malpractice",
    status: "completed",
    contactId: "1",
    summary:
      "Surgical complication from procedure performed on 12/01/2023. Required additional corrective surgery.",
    clinicalNotes:
      "Post-operative recovery progressing well. Follow-up scheduled for next month.",
    documents: [
      {
        id: "doc3",
        name: "Surgical Records.pdf",
        url: "/fake-url/doc3.pdf",
        uploadedAt: "2023-12-02T09:15:00Z",
      },
    ],
  },
  {
    id: "3",
    firstName: "Robert",
    lastName: "Johnson",
    type: "Workers Compensation",
    status: "in_progress",
    contactId: "3",
    summary:
      "Workplace injury occurred on 02/01/2024. Fall from ladder resulting in back injury.",
    clinicalNotes:
      "Patient reports severe lower back pain. X-rays ordered. Temporary work restrictions advised.",
    documents: [
      {
        id: "doc4",
        name: "Incident Report.pdf",
        url: "/fake-url/doc4.pdf",
        uploadedAt: "2024-02-01T16:20:00Z",
      },
      {
        id: "doc5",
        name: "Workers Comp Form.pdf",
        url: "/fake-url/doc5.pdf",
        uploadedAt: "2024-02-02T11:30:00Z",
      },
    ],
  },
];

// Helper function to simulate API response delay
export const fakeFetch = <T>(data: T, delay = 500): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
};

// Example usage for queries:
export const fakeQueries = {
  getContacts: () => fakeFetch(fakeContacts),
  getCaseTypes: () => fakeFetch(fakeCaseTypes),
  getCases: () => fakeFetch(fakeCases),
  getCase: (id: string) => fakeFetch(fakeCases.find((c) => c.id === id)),
  getCaseDocuments: (caseId: string) =>
    fakeFetch(fakeCases.find((c) => c.id === caseId)?.documents ?? []),
  getContact: (id: string) => fakeFetch(fakeContacts.find((c) => c.id === id)),
};
