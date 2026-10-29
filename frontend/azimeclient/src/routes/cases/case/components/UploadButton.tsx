import { ChangeEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProviderDisciplineLabel,
  providerDisciplineOptions,
  type CaseProviderDto,
  type CompleteRecordUploadInput,
  type CreateCaseProviderInput,
  type ProviderDiscipline,
} from "@azime/contracts";
import {
  caseProvidersQueryOptions,
  completeRecordUpload,
  createCaseProvider,
  createRecordUpload,
} from "../../queries";
import { TestRecordUploader } from "./TestRecordUploader";

type UploadDocumentType = CompleteRecordUploadInput["documentType"];

const documentTypeOptions: Array<{
  value: UploadDocumentType;
  label: string;
}> = [
  { value: "encounter", label: "Encounter" },
  { value: "therapy_note", label: "Therapy note" },
  { value: "imaging_report", label: "Imaging report" },
  { value: "surgery_report", label: "Surgery report" },
  { value: "intervention_report", label: "Intervention report" },
  { value: "legal_summary", label: "Legal summary" },
  { value: "workstatus", label: "Work status / accommodation" },
  { value: "incident_report", label: "Incident report" },
  { value: "generic", label: "Other" },
];

type UploadFormFields = {
  providerId: string;
  modality: string;
  region: string;
  author: string;
  lawFirm: string;
};

const emptyFormFields: UploadFormFields = {
  providerId: "",
  modality: "",
  region: "",
  author: "",
  lawFirm: "",
};

const inputClassName =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const eventDateLabel: Record<UploadDocumentType, string> = {
  encounter: "Date of service",
  therapy_note: "Therapy session date",
  imaging_report: "Imaging date",
  surgery_report: "Procedure date",
  intervention_report: "Intervention date",
  legal_summary: "Summary / letter date",
  workstatus: "Issued / effective date",
  incident_report: "Incident date",
  generic: "Event date",
};

const metadataIsComplete = (
  documentType: UploadDocumentType | "",
  fields: UploadFormFields,
) => {
  switch (documentType) {
    case "encounter":
    case "therapy_note":
    case "surgery_report":
    case "intervention_report":
      return Boolean(fields.providerId);
    case "imaging_report":
      return Boolean(fields.modality.trim() && fields.region.trim());
    case "legal_summary":
      return Boolean(fields.author.trim() || fields.lawFirm.trim());
    case "workstatus":
    case "incident_report":
    case "generic":
      return true;
    default:
      return false;
  }
};

const buildCompleteUploadPayload = ({
  caseId,
  objectKey,
  name,
  eventDate,
  documentType,
  fields,
}: {
  caseId: number;
  objectKey: string;
  name: string;
  eventDate: string;
  documentType: UploadDocumentType;
  fields: UploadFormFields;
}): CompleteRecordUploadInput => {
  const common = { caseId, objectKey, name, eventDate };

  switch (documentType) {
    case "encounter":
      return {
        ...common,
        documentType,
        providerId: fields.providerId,
        metadata: {},
      };
    case "therapy_note":
      return {
        ...common,
        documentType,
        providerId: fields.providerId,
        metadata: {},
      };
    case "imaging_report":
      return {
        ...common,
        documentType,
        metadata: {
          modality: fields.modality.trim(),
          region: fields.region.trim(),
        },
      };
    case "surgery_report":
      return {
        ...common,
        documentType,
        providerId: fields.providerId,
        metadata: {},
      };
    case "intervention_report":
      return {
        ...common,
        documentType,
        providerId: fields.providerId,
        metadata: {},
      };
    case "legal_summary":
      return {
        ...common,
        documentType,
        metadata: {
          ...(fields.author.trim() ? { author: fields.author.trim() } : {}),
          ...(fields.lawFirm.trim() ? { lawFirm: fields.lawFirm.trim() } : {}),
        },
      };
    case "workstatus":
    case "incident_report":
    case "generic":
      return { ...common, documentType, metadata: {} };
  }
};

type ProviderFormFields = Omit<CreateCaseProviderInput, "discipline"> & {
  discipline: ProviderDiscipline | "";
};

const emptyProviderInput: ProviderFormFields = {
  name: "",
  kind: "individual",
  discipline: "",
};

const ChooseOrCreateProviderForm = ({
  caseId,
  value,
  onChange,
}: {
  caseId: number;
  value: string;
  onChange: (providerId: string) => void;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newProvider, setNewProvider] =
    useState<ProviderFormFields>(emptyProviderInput);

  const queryClient = useQueryClient();
  const providersQuery = useQuery(caseProvidersQueryOptions(caseId));
  const createProviderMutation = useMutation({
    mutationFn: (input: CreateCaseProviderInput) =>
      createCaseProvider(caseId, input),
    onSuccess: (provider) => {
      queryClient.setQueryData<CaseProviderDto[]>(
        ["caseProviders", { caseId }],
        (current) =>
          [
            ...(current ?? []).filter(({ id }) => id !== provider.id),
            provider,
          ].sort((left, right) => left.name.localeCompare(right.name)),
      );
      onChange(provider.id);
      setNewProvider(emptyProviderInput);
      setIsAdding(false);
    },
  });

  const canCreate = Boolean(
    newProvider.name.trim() && newProvider.discipline.trim(),
  );

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">
          Provider or facility
        </span>
        <div className="flex flex-col gap-2 sm:flex-row">
          {providersQuery.isError ? (
            <div className="flex-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Existing providers are unavailable.
            </div>
          ) : (
            <select
              value={value}
              onChange={(event) => {
                setIsAdding(false);
                onChange(event.target.value);
              }}
              disabled={providersQuery.isPending}
              className={`${inputClassName} flex-1 bg-white`}
            >
              <option value="">
                {providersQuery.isPending
                  ? "Loading providers..."
                  : "Choose a provider"}
              </option>
              {providersQuery.data?.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ·{" "}
                  {getProviderDisciplineLabel(provider.discipline)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              onChange("");
              createProviderMutation.reset();
              setIsAdding(true);
            }}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Add new provider
          </button>
        </div>
        {providersQuery.isError ? (
          <p className="text-sm text-red-600" role="alert">
            Could not load this case&apos;s provider list. You can still add a
            new provider.
          </p>
        ) : null}
      </div>

      {isAdding ? (
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              value={newProvider.name}
              onChange={(event) =>
                setNewProvider((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Provider or facility name"
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Kind
            <select
              value={newProvider.kind}
              onChange={(event) =>
                setNewProvider((current) => ({
                  ...current,
                  kind: event.target.value as CreateCaseProviderInput["kind"],
                }))
              }
              className={`${inputClassName} bg-white`}
            >
              <option value="individual">Individual</option>
              <option value="facility">Facility</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Discipline
            <select
              value={newProvider.discipline}
              onChange={(event) =>
                setNewProvider((current) => ({
                  ...current,
                  discipline: event.target.value as ProviderDiscipline | "",
                }))
              }
              className={`${inputClassName} bg-white`}
            >
              <option value="">Select a discipline</option>
              {providerDisciplineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="button"
              disabled={!canCreate || createProviderMutation.isPending}
              onClick={() => {
                if (newProvider.discipline) {
                  createProviderMutation.mutate({
                    ...newProvider,
                    discipline: newProvider.discipline,
                  });
                }
              }}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              {createProviderMutation.isPending
                ? "Adding provider..."
                : "Add provider"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewProvider(emptyProviderInput);
                createProviderMutation.reset();
              }}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          {createProviderMutation.isError ? (
            <p className="text-sm text-red-600 sm:col-span-2">
              Failed to add provider. Please try again.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const OurUploadButton = ({ caseId }: { caseId: number }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [documentType, setDocumentType] = useState<UploadDocumentType | "">("");
  const [fields, setFields] = useState<UploadFormFields>(emptyFormFields);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const updateField = <Key extends keyof UploadFormFields>(
    key: Key,
    value: UploadFormFields[Key],
  ) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const formIsComplete = Boolean(
    eventDate && metadataIsComplete(documentType, fields),
  );

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!documentType || !formIsComplete) {
      alert("Complete the document details before uploading a PDF.");
      event.target.value = "";
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF document.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Please upload a PDF smaller than 8 MB.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const { objectKey, uploadUrl } = await createRecordUpload({
        caseId,
        fileName: file.name,
        contentType: file.type,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed");
      }

      await completeRecordUpload(
        buildCompleteUploadPayload({
          caseId,
          objectKey,
          name: file.name,
          eventDate,
          documentType,
          fields,
        }),
      );

      await queryClient.invalidateQueries({
        queryKey: ["records", { caseId: String(caseId) }],
      });

      setEventDate("");
      setDocumentType("");
      setFields(emptyFormFields);
    } catch (error) {
      console.error("Upload error: ", error);
      const message =
        error instanceof Error ? error.message : "Unknown upload error";
      alert(`Error uploading: ${message}`);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Document type
          <select
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value as UploadDocumentType | "");
              setFields(emptyFormFields);
            }}
            className={`${inputClassName} bg-white`}
          >
            <option value="">Select a document type</option>
            {documentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {documentType ? eventDateLabel[documentType] : "Event date"}
          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className={inputClassName}
          />
        </label>

        {documentType === "encounter" ||
        documentType === "therapy_note" ||
        documentType === "surgery_report" ||
        documentType === "intervention_report" ? (
          <ChooseOrCreateProviderForm
            caseId={caseId}
            value={fields.providerId}
            onChange={(providerId) => updateField("providerId", providerId)}
          />
        ) : null}

        {documentType === "imaging_report" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Modality
              <input
                value={fields.modality}
                onChange={(event) =>
                  updateField("modality", event.target.value)
                }
                placeholder="e.g. MRI, CT, X-ray"
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Region
              <input
                value={fields.region}
                onChange={(event) => updateField("region", event.target.value)}
                placeholder="e.g. Lumbar spine"
                className={inputClassName}
              />
            </label>
          </>
        ) : null}

        {documentType === "legal_summary" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Author
              <input
                value={fields.author}
                onChange={(event) => updateField("author", event.target.value)}
                placeholder="Author (optional if law firm entered)"
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Law firm
              <input
                value={fields.lawFirm}
                onChange={(event) => updateField("lawFirm", event.target.value)}
                placeholder="Law firm (optional if author entered)"
                className={inputClassName}
              />
            </label>
          </>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
        disabled={isUploading || !formIsComplete}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Choose and upload PDF"}
      </button>
      {import.meta.env.DEV ? <TestRecordUploader caseId={caseId} /> : null}
    </div>
  );
};

export default OurUploadButton;
