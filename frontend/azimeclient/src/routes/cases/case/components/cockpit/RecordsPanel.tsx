import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  deleteRecord,
  fetchRecordDownloadUrl,
  recordsQueryOptions,
  summarizeRecord,
} from "../../../queries";
import RecordSummaryView from "../RecordSummaryView";
import { OurUploadButton } from "../UploadButton";
import { CockpitSection } from "./CockpitLayout";

const documentTypeLabels: Record<string, string> = {
  encounter: "Encounter",
  therapy_note: "Therapy note",
  imaging_report: "Imaging report",
  surgery_report: "Surgery report",
  intervention_report: "Intervention report",
  incident_report: "Incident report",
  legal_summary: "Legal summary",
  workstatus: "Work status / accommodation",
  generic: "Other",
};

const metadataString = (metadata: unknown, key: string) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

const recordDisplayLabel = (record: {
  id: number;
  name: string | null;
  provider: { name: string } | null;
  documentType: string | null;
  eventDate: string | null;
  metadata: unknown;
}) => {
  const typeLabel = record.documentType
    ? (documentTypeLabels[record.documentType] ?? record.documentType)
    : "";
  const sourceName =
    record.provider?.name ||
    metadataString(record.metadata, "author") ||
    metadataString(record.metadata, "lawFirm") ||
    "";
  const details = [record.eventDate, typeLabel, sourceName].filter(Boolean);

  return details.length > 0
    ? details.join(" · ")
    : record.name || `Record ${record.id}`;
};

const getSummaryStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "completed":
      return "Summarized";
    case "processing":
      return "Summarizing";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
};

const getSummaryStatusClassName = (status: string | null | undefined) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "processing":
      return "bg-amber-100 text-amber-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default function RecordsPanel({ caseId }: { caseId: string }) {
  const [openingRecordId, setOpeningRecordId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const recordsQuery = useQuery(recordsQueryOptions(caseId));

  const summarizeMutation = useMutation({
    mutationFn: summarizeRecord,
    mutationKey: ["records", "summarize"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: deleteRecord,
    mutationKey: ["records", "delete"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });

  if (recordsQuery.isPending) {
    return (
      <CockpitSection
        id="records"
        title="Records"
        description="Source documents and their structured first-pass extractions."
        action={<OurUploadButton caseId={Number(caseId)} />}
      >
        <p className="text-sm text-slate-500">Loading records…</p>
      </CockpitSection>
    );
  }

  if (recordsQuery.isError) {
    return (
      <CockpitSection
        id="records"
        title="Records"
        description="Source documents and their structured first-pass extractions."
        action={<OurUploadButton caseId={Number(caseId)} />}
      >
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load records.
        </p>
      </CockpitSection>
    );
  }

  const records = recordsQuery.data;

  const handleViewDocument = async (recordId: number) => {
    try {
      setOpeningRecordId(recordId);
      const { url } = await fetchRecordDownloadUrl(recordId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Document view error", error);
      window.alert("Failed to open document");
    } finally {
      setOpeningRecordId(null);
    }
  };

  const handleDeleteRecord = (recordId: number) => {
    const confirmed = window.confirm(
      "Delete this record? Its uploaded PDF will also be removed when present.",
    );

    if (confirmed) {
      deleteRecordMutation.mutate(recordId);
    }
  };

  return (
    <CockpitSection
      id="records"
      title="Records"
      description="Source documents and their structured first-pass extractions."
      action={<OurUploadButton caseId={Number(caseId)} />}
    >
      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No documents uploaded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Collapsible key={record.id}>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                    <span className="truncate font-medium text-gray-800">
                      {recordDisplayLabel(record)}
                    </span>
                    <span className="text-sm text-slate-500">
                      View extraction
                    </span>
                  </CollapsibleTrigger>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getSummaryStatusClassName(
                        record.summaryStatus,
                      )}`}
                    >
                      {getSummaryStatusLabel(record.summaryStatus)}
                    </span>
                    {record.url ? (
                      <>
                        <button
                          type="button"
                          onClick={() => summarizeMutation.mutate(record.id)}
                          disabled={
                            summarizeMutation.isPending &&
                            summarizeMutation.variables === record.id
                          }
                          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:text-emerald-300"
                        >
                          {summarizeMutation.isPending &&
                          summarizeMutation.variables === record.id
                            ? "Summarizing..."
                            : record.summaryStatus === "completed"
                              ? "Re-run"
                              : "Summarize"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(record.id)}
                          disabled={openingRecordId === record.id}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-blue-300"
                        >
                          {openingRecordId === record.id
                            ? "Opening..."
                            : "View PDF"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                        Test data
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record.id)}
                      disabled={
                        deleteRecordMutation.isPending &&
                        deleteRecordMutation.variables === record.id
                      }
                      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:text-red-300"
                    >
                      {deleteRecordMutation.isPending &&
                      deleteRecordMutation.variables === record.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
                <CollapsibleContent className="mt-4 border-t border-slate-200 pt-4">
                  <RecordSummaryView
                    summary={record.parsedSummary}
                    parseError={record.summaryParseError}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {summarizeMutation.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to summarize the selected record. Please try again.
        </p>
      ) : null}
      {deleteRecordMutation.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to delete the selected record. Please try again.
        </p>
      ) : null}
    </CockpitSection>
  );
}
