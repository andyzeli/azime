import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
//import { RichTextEditor } from './RichTextEditor'; // You'll need to implement this
import { OurUploadButton } from "./UploadButton"; // You'll need to implement this
import MarkdownToRichTextEditor from "./Editor";
import AnchorQuestions from "./AnchorQuestions";
import {
  AGGREGATE_SUMMARY_SECTION,
  caseQueryOptions,
  caseSummaryQueryOptions,
  createManualCaseSummary,
  deleteRecord,
  deleteManualCaseSummary,
  fetchRecordDownloadUrl,
  recordsQueryOptions,
  summarizeCase,
  summarizeRecord,
} from "../../queries";
import { useParams } from "@tanstack/react-router";
import { CaseRecordsSummary } from "../../../../../../../backend/src/db/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ModalEditor from "./ModalEditor";
import RecordSummaryView from "./RecordSummaryView";
import AggregateSummaryView from "./AggregateSummaryView";
import PatientQuestionnairesPanel from "./PatientQuestionnairesPanel";

const CaseDetail = ({ caseId }: { caseId: string }) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [openingRecordId, setOpeningRecordId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: caseData } = useSuspenseQuery(caseQueryOptions(caseId));
  if (!caseData) {
    throw new Error("Case not found");
  }
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));

  const { data: caseSummaries } = useSuspenseQuery(
    caseSummaryQueryOptions(caseId),
  );

  const handleUpdateSummarySection = (value: string, id: string) => {
    console.log(value, id, "is the value and id");
  };

  const mutation = useMutation({
    mutationFn: createManualCaseSummary,
    mutationKey: ["casesummaries", "create"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casesummaries"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteManualCaseSummary,
    mutationKey: ["casesummaries", "delete"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casesummaries"] });
    },
  });
  const summarizeMutation = useMutation({
    mutationFn: summarizeRecord,
    mutationKey: ["records", "summarize"],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
      console.log(data);
    },
  });
  const caseSummaryMutation = useMutation({
    mutationFn: summarizeCase,
    mutationKey: ["cases", "aggregate-summary"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caseSummary"] });
    },
  });
  const deleteRecordMutation = useMutation({
    mutationFn: deleteRecord,
    mutationKey: ["records", "delete"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });

  const handleNewSummarySection = (caseSummary: {
    section: string;
    summary: string;
    caseId: number;
  }) => {
    // console.log(caseSummary, "is the value");
    mutation.mutate(caseSummary);
    setIsSummaryExpanded(false);
  };

  const handleDeleteSummarySection = (id: string) => {
    console.log(id, "is the id");
    deleteMutation.mutate(Number(id));
  };

  const handleViewDocument = async (recordId: number) => {
    try {
      setOpeningRecordId(recordId);
      const { url } = await fetchRecordDownloadUrl(recordId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Document view error", error);
      alert("Failed to open document");
    } finally {
      setOpeningRecordId(null);
    }
  };

  const handleSummarizeRecord = (recordId: number) => {
    summarizeMutation.mutate(recordId);
  };

  const handleGenerateAggregateSummary = () => {
    caseSummaryMutation.mutate(Number(caseId));
  };

  const handleDeleteRecord = (recordId: number) => {
    const confirmed = window.confirm(
      "Delete this document? This removes the uploaded file from storage.",
    );

    if (!confirmed) {
      return;
    }

    deleteRecordMutation.mutate(recordId);
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

  const aggregateSummary = caseSummaries?.find(
    (summary) => summary.section === AGGREGATE_SUMMARY_SECTION,
  );
  const manualSummaries = caseSummaries?.filter(
    (summary) => summary.section !== AGGREGATE_SUMMARY_SECTION,
  );
  const completedProviderSummaryCount =
    records?.filter((record) => record.summaryStatus === "completed").length ??
    0;
  const aggregateSummaryStatus = caseSummaryMutation.isPending
    ? "processing"
    : caseSummaryMutation.isError
      ? "failed"
      : aggregateSummary
        ? "completed"
        : "pending";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {caseData?.patientName} {caseData?.patientLastName}
              </h1>
              <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                {caseData?.caseType}
              </span>
            </div>

            {/* Contact Information Card */}
            <div className="bg-gray-50 rounded-lg p-4 w-72">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Contact Person
              </h3>
              <div className="space-y-2 text-gray-600">
                <p>{caseData?.caseContact?.name}</p>
                <p className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {caseData?.caseContact?.email}
                </p>
                {/* <p className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {caseData?.caseContact?.phone}
              </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Documents
          </h2>
          <div className="flex flex-col items-start gap-6">
            {/* Left column - empty for now */}

            {/* Middle column - upload button */}

            {/* Right column - file list */}

            {records && records.length > 0 ? (
              <div className="space-y-2">
                {records.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-700 truncate">
                        {doc.name || doc.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getSummaryStatusClassName(
                          doc.summaryStatus,
                        )}`}
                      >
                        {getSummaryStatusLabel(doc.summaryStatus)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSummarizeRecord(doc.id)}
                        disabled={
                          summarizeMutation.isPending &&
                          summarizeMutation.variables === doc.id
                        }
                        className="text-emerald-700 hover:text-emerald-900 disabled:text-emerald-300"
                      >
                        {summarizeMutation.isPending &&
                        summarizeMutation.variables === doc.id
                          ? "Summarizing..."
                          : doc.summaryStatus === "completed"
                            ? "Re-run"
                            : "Summarize"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc.id)}
                        disabled={openingRecordId === doc.id}
                        className="text-blue-600 hover:text-blue-800 disabled:text-blue-300"
                      >
                        {openingRecordId === doc.id ? "Opening..." : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(doc.id)}
                        disabled={
                          deleteRecordMutation.isPending &&
                          deleteRecordMutation.variables === doc.id
                        }
                        className="text-red-600 hover:text-red-800 disabled:text-red-300"
                      >
                        {deleteRecordMutation.isPending &&
                        deleteRecordMutation.variables === doc.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-left">
                No documents uploaded yet
              </p>
            )}
          </div>
          <div className="flex justify-start mt-6 pl-2">
            <OurUploadButton caseId={Number(caseId)} />
          </div>
        </div>
      </div>

      <PatientQuestionnairesPanel caseId={caseId} />

      {/* Summary Section */}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Case Summary
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getSummaryStatusClassName(
                aggregateSummaryStatus,
              )}`}
            >
              {getSummaryStatusLabel(aggregateSummaryStatus)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateAggregateSummary}
              disabled={
                completedProviderSummaryCount === 0 || caseSummaryMutation.isPending
              }
              className="inline-flex items-center rounded-md bg-emerald-700 px-4 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {caseSummaryMutation.isPending
                ? "Generating..."
                : aggregateSummary
                  ? "Re-run Aggregate"
                  : "Generate Aggregate"}
            </button>
            <Dialog open={isSummaryExpanded} onOpenChange={setIsSummaryExpanded}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center px-4 py-2 bg-green-700 text-white rounded-md hover:bg-blue-600 transition-colors">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Manually
                </button>
              </DialogTrigger>
              <DialogContent className="min-w-[1200px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Summary Section</DialogTitle>
                </DialogHeader>
                <ModalEditor
                  caseId={Number(caseId)}
                  onSave={handleNewSummarySection}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-800">Aggregate Summary</p>
              <p className="text-sm text-gray-500">
                Built from {completedProviderSummaryCount} summarized provider
                {completedProviderSummaryCount === 1 ? "" : "s"}
              </p>
            </div>
            {completedProviderSummaryCount === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Generate provider summaries first, then create an aggregate
                summary for the case.
              </p>
            ) : (
              <AggregateSummaryView
                summary={aggregateSummary?.parsedAggregateSummary ?? null}
                parseError={aggregateSummary?.aggregateSummaryParseError}
              />
            )}
            {caseSummaryMutation.isError ? (
              <p className="text-sm text-red-600">
                Failed to generate aggregate summary. Please try again.
              </p>
            ) : null}
          </div>

          <p>Per Provier</p>
          {records?.map((record) => (
            <Collapsible key={record.id}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-bold text-gray-700">
                  {record.providerName
                    ? `${record.providerName} - ${record.documentType}`
                    : record.name || `Record ${record.id}`}
                </span>
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2  bg-white">
                <RecordSummaryView
                  summary={record.parsedSummary}
                  parseError={record.summaryParseError}
                />
                {/* <MarkdownToRichTextEditor
                  caseId={caseId}
                  initialMarkdown={record.summary || ""}
                  onSave={(value: string) =>
                    handleUpdateSummarySection(value, record.id.toString())
                  }
                  onDelete={() =>
                    handleDeleteSummarySection(record.id.toString())
                  }
                /> */}
              </CollapsibleContent>
            </Collapsible>
          ))}
          {manualSummaries?.map((summary: CaseRecordsSummary) => (
            <Collapsible key={summary.id}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-bold text-gray-700">
                  {summary.section}
                </span>
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2  bg-white">
                <MarkdownToRichTextEditor
                  caseId={caseId}
                  initialMarkdown={summary.summary || ""}
                  onSave={(value: string) =>
                    handleUpdateSummarySection(value, summary.id.toString())
                  }
                  onDelete={() =>
                    handleDeleteSummarySection(summary.id.toString())
                  }
                />
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
        <div>
          <p>Aggregate</p>
        </div>
      </div>

      {/* Clinical Notes Section */}
      <div className="bg-white rounded-lg shadow-md p-6 my-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Clinical Note
        </h2>
        {/* <RichTextEditor
          value={caseData?.clinicalNotes}
          onChange={(value) => {
            // Handle clinical notes update
          }}
        /> */}
        <textarea>write clinical notes here</textarea>
      </div>
      <div>
        <AnchorQuestions onChange={() => {}} />
      </div>
      {/* Clinical Notes Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Final Report
        </h2>
        {/* <RichTextEditor
          value={caseData?.clinicalNotes}
          onChange={(value) => {
            // Handle clinical notes update
          }}
        /> */}
        <textarea>report</textarea>
      </div>
    </div>
  );
};

const CaseDetailComp = () => {
  const { caseId } = useParams({ from: "/cases/$caseId" });
  if (!caseId) {
    return <div>No case ID provided</div>;
  }
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CaseDetail caseId={caseId} />
    </Suspense>
  );
};

export default CaseDetailComp;
