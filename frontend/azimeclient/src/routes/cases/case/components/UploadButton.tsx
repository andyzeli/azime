import { ChangeEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  completeRecordUpload,
  createRecordUpload,
} from "../../queries";

const providerTypeOptions = [
  { value: "", label: "Provider Type (Optional)" },
  { value: "pcp", label: "PCP" },
  { value: "specialist", label: "Specialist" },
  { value: "legal", label: "Legal" },
  { value: "imaging", label: "Imaging" },
  { value: "therapy", label: "Therapy" },
] as const;

export const OurUploadButton = ({ caseId }: { caseId: number }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [documentType, setDocumentType] = useState<
    "" | "pcp" | "specialist" | "legal" | "imaging" | "therapy"
  >("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
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

      await completeRecordUpload({
        caseId,
        objectKey,
        name: file.name,
        providerName: providerName.trim() || undefined,
        documentType: documentType || undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ["records", { caseId: String(caseId) }],
      });

      setProviderName("");
      setDocumentType("");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={providerName}
          onChange={(event) => setProviderName(event.target.value)}
          placeholder="Provider Name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:max-w-xs"
        />
        <select
          value={documentType}
          onChange={(event) =>
            setDocumentType(
              event.target.value as
                | ""
                | "pcp"
                | "specialist"
                | "legal"
                | "imaging"
                | "therapy",
            )
          }
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:max-w-xs"
        >
          {providerTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Upload PDF"}
      </button>
    </div>
  );
};

export default OurUploadButton;
