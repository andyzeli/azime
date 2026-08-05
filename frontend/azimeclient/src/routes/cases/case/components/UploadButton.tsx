import { ChangeEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CompleteRecordUploadInput,
  DocumentType,
} from "../../../../../../../backend/src/records/documentMetadata";
import { completeRecordUpload, createRecordUpload } from "../../queries";

const documentTypeOptions: Array<{ value: DocumentType; label: string }> = [
  { value: "progress_note", label: "Progress note" },
  { value: "therapy_note", label: "Therapy note" },
  { value: "imaging_report", label: "Imaging report" },
  { value: "procedure_report", label: "Procedure report" },
  { value: "legal_summary", label: "Legal summary" },
  {
    value: "workstatus_accommodation",
    label: "Work status / accommodation",
  },
  { value: "other", label: "Other" },
];

type UploadFormFields = {
  providerType: string;
  providerName: string;
  therapyType: "" | "pt" | "ot" | "chiro";
  providerOrFacility: string;
  modality: string;
  region: string;
  procedureType: string;
  performingProvider: string;
  author: string;
  lawFirm: string;
};

const emptyFormFields: UploadFormFields = {
  providerType: "",
  providerName: "",
  therapyType: "",
  providerOrFacility: "",
  modality: "",
  region: "",
  procedureType: "",
  performingProvider: "",
  author: "",
  lawFirm: "",
};

const inputClassName =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const eventDateLabel: Record<DocumentType, string> = {
  progress_note: "Date of service",
  therapy_note: "Therapy session date",
  imaging_report: "Imaging date",
  procedure_report: "Procedure date",
  legal_summary: "Summary / letter date",
  workstatus_accommodation: "Issued / effective date",
  other: "Event date",
};

const metadataIsComplete = (
  documentType: DocumentType | "",
  fields: UploadFormFields,
) => {
  switch (documentType) {
    case "progress_note":
      return Boolean(fields.providerType.trim() && fields.providerName.trim());
    case "therapy_note":
      return Boolean(fields.therapyType && fields.providerOrFacility.trim());
    case "imaging_report":
      return Boolean(fields.modality.trim() && fields.region.trim());
    case "procedure_report":
      return Boolean(
        fields.procedureType.trim() && fields.performingProvider.trim(),
      );
    case "legal_summary":
      return Boolean(fields.author.trim() || fields.lawFirm.trim());
    case "workstatus_accommodation":
    case "other":
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
  documentType: DocumentType;
  fields: UploadFormFields;
}): CompleteRecordUploadInput => {
  const common = { caseId, objectKey, name, eventDate };

  switch (documentType) {
    case "progress_note":
      return {
        ...common,
        documentType,
        metadata: {
          providerType: fields.providerType.trim(),
          providerName: fields.providerName.trim(),
        },
      };
    case "therapy_note":
      if (!fields.therapyType) {
        throw new Error("Therapy type is required");
      }
      return {
        ...common,
        documentType,
        metadata: {
          therapyType: fields.therapyType,
          providerOrFacility: fields.providerOrFacility.trim(),
        },
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
    case "procedure_report":
      return {
        ...common,
        documentType,
        metadata: {
          procedureType: fields.procedureType.trim(),
          performingProvider: fields.performingProvider.trim(),
        },
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
    case "workstatus_accommodation":
    case "other":
      return { ...common, documentType, metadata: {} };
  }
};

export const OurUploadButton = ({ caseId }: { caseId: number }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
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
              setDocumentType(event.target.value as DocumentType | "");
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

        {documentType === "progress_note" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Provider type
              <input
                value={fields.providerType}
                onChange={(event) =>
                  updateField("providerType", event.target.value)
                }
                placeholder="e.g. Orthopedist"
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Provider name
              <input
                value={fields.providerName}
                onChange={(event) =>
                  updateField("providerName", event.target.value)
                }
                placeholder="Provider name"
                className={inputClassName}
              />
            </label>
          </>
        ) : null}

        {documentType === "therapy_note" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Therapy type
              <select
                value={fields.therapyType}
                onChange={(event) =>
                  updateField(
                    "therapyType",
                    event.target.value as UploadFormFields["therapyType"],
                  )
                }
                className={`${inputClassName} bg-white`}
              >
                <option value="">Select therapy type</option>
                <option value="pt">Physical therapy</option>
                <option value="ot">Occupational therapy</option>
                <option value="chiro">Chiropractic</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Provider or facility
              <input
                value={fields.providerOrFacility}
                onChange={(event) =>
                  updateField("providerOrFacility", event.target.value)
                }
                placeholder="Provider or facility name"
                className={inputClassName}
              />
            </label>
          </>
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

        {documentType === "procedure_report" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Procedure type
              <input
                value={fields.procedureType}
                onChange={(event) =>
                  updateField("procedureType", event.target.value)
                }
                placeholder="Procedure type"
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Performing provider
              <input
                value={fields.performingProvider}
                onChange={(event) =>
                  updateField("performingProvider", event.target.value)
                }
                placeholder="Performing provider"
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
    </div>
  );
};

export default OurUploadButton;
