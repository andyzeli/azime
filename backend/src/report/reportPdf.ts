import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import pdfmake from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { lexer, type Token, type Tokens } from "marked";
import type { PracticeSettings } from "@azime/contracts";

// Embedded Roboto (shipped with pdfmake) rather than the standard PDF fonts, which
// only cover Latin-1: drafts can contain symbols such as "≥".
const require = createRequire(import.meta.url);
pdfmake.addFonts(require("pdfmake/fonts/Roboto"));
// Everything is inline: no fetching URLs, and local reads only for the fonts.
const fontDir = dirname(require.resolve("pdfmake/fonts/Roboto"));
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => path.startsWith(fontDir));

const logo = readFileSync(
  new URL("../../assets/report-logo.svg", import.meta.url),
  "utf8"
);

export type ReportPdfInput = {
  markdown: string;
  practice: PracticeSettings;
  patient: {
    name: string;
    dateOfBirth: string | null;
    dateOfInjury: string | null;
    examinationDate: string;
  };
  // Null renders an unsigned preview, watermarked DRAFT.
  signature: { name: string; license: string; signedAt: Date } | null;
};

const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
// Stored dates are "YYYY-MM-DD"; read them as calendar dates, not instants.
const calendarDate = (date: string | null) =>
  date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not documented";

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const { practice, patient, signature } = input;
  const contactLine = [
    practice.phone && `Phone ${practice.phone}`,
    practice.fax && `Fax ${practice.fax}`,
  ]
    .filter(Boolean)
    .join("   ");

  const doc: TDocumentDefinitions = {
    pageSize: "LETTER",
    pageMargins: [60, 54, 60, 60],
    info: {
      title: `Independent Medical Examination: ${patient.name}`,
      author: signature?.name ?? practice.name,
    },
    defaultStyle: { font: "Roboto", fontSize: 10.5, lineHeight: 1.25, color: "#1E293B" },
    styles: {
      h1: { fontSize: 14, bold: true, margin: [0, 14, 0, 6] },
      h2: { fontSize: 12, bold: true, margin: [0, 12, 0, 5] },
      h3: { fontSize: 10.5, bold: true, margin: [0, 8, 0, 4] },
      p: { margin: [0, 0, 0, 7] },
      list: { margin: [0, 0, 0, 7] },
      practice: { fontSize: 8.5, color: "#475569", lineHeight: 1.2 },
    },
    watermark: signature
      ? undefined
      : { text: "DRAFT", color: "#94A3B8", opacity: 0.12, bold: true },
    footer: (page, pages) => ({
      margin: [60, 20, 60, 0],
      fontSize: 8,
      color: "#64748B",
      columns: [
        `${patient.name} · Independent Medical Examination`,
        { text: `Page ${page} of ${pages}`, alignment: "right" },
      ],
    }),
    content: [
      // Letterhead
      {
        columns: [
          { svg: logo, width: 170 },
          {
            stack: [
              { text: practice.name, bold: true, fontSize: 10, color: "#1E293B" },
              ...practice.address.split("\n").filter(Boolean),
              contactLine,
              practice.email,
            ].filter(Boolean),
            style: "practice",
            alignment: "right",
          },
        ],
      },
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 492, y2: 0, lineWidth: 0.75, lineColor: "#CBD5E1" },
        ],
        margin: [0, 12, 0, 16],
      },
      {
        text: "INDEPENDENT MEDICAL EXAMINATION",
        alignment: "center",
        bold: true,
        fontSize: 13,
        characterSpacing: 0.5,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: ["auto", "*"],
          body: [
            ["Patient", patient.name],
            ["Date of birth", calendarDate(patient.dateOfBirth)],
            ["Date of injury", calendarDate(patient.dateOfInjury)],
            ["Date of examination", calendarDate(patient.examinationDate)],
          ].map(([k, v]) => [{ text: k, color: "#64748B" }, { text: v, bold: true }]),
        },
        layout: "noBorders",
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },
      ...blocks(lexer(input.markdown)),
      // Signature block, kept on one page.
      {
        unbreakable: true,
        margin: [0, 24, 0, 0],
        stack: signature
          ? [
              { text: `Electronically signed by ${signature.name}`, bold: true },
              `on ${longDate(signature.signedAt)}`,
              signature.license
                ? { text: signature.license, color: "#64748B", fontSize: 9 }
                : "",
            ]
          : [{ text: "Not signed. Draft for review only.", italics: true, color: "#64748B" }],
      },
    ],
  };

  return pdfmake.createPdf(doc).getBuffer();
}

// The draft only uses headings, paragraphs, bold, italic and lists (the editor allows
// nothing else); anything unexpected is kept as plain text.
function blocks(tokens: Token[]): Content[] {
  return tokens.flatMap((token): Content[] => {
    switch (token.type) {
      case "space":
      case "hr":
        return [];
      case "heading": {
        const t = token as Tokens.Heading;
        return [{ text: inline(t.tokens), style: `h${Math.min(t.depth, 3)}` }];
      }
      case "paragraph":
        return [{ text: inline((token as Tokens.Paragraph).tokens), style: "p" }];
      case "text": {
        const t = token as Tokens.Text;
        return [{ text: t.tokens ? inline(t.tokens) : t.text, style: "p" }];
      }
      case "list": {
        const t = token as Tokens.List;
        const items = t.items.map((item) => ({ stack: listItem(item) }));
        return [
          t.ordered
            ? { ol: items, start: typeof t.start === "number" ? t.start : 1, style: "list" }
            : { ul: items, style: "list" },
        ];
      }
      default:
        return "text" in token && typeof token.text === "string"
          ? [{ text: token.text, style: "p" }]
          : [];
    }
  });
}

// A list item's own text without the paragraph gap, then any nested lists.
const listItem = (item: Tokens.ListItem): Content[] =>
  item.tokens.flatMap((t): Content[] =>
    t.type === "text" || t.type === "paragraph"
      ? [{ text: "tokens" in t && t.tokens ? inline(t.tokens) : (t as Tokens.Text).text, margin: [0, 0, 0, 2] }]
      : blocks([t])
  );

// Flat runs: pdfmake doesn't carry bold/italics into nested text arrays.
type Run = { text: string; bold?: boolean; italics?: boolean };

function inline(tokens: Token[], style: Omit<Run, "text"> = {}): Run[] {
  return tokens.flatMap((token): Run[] => {
    switch (token.type) {
      case "strong":
        return inline((token as Tokens.Strong).tokens, { ...style, bold: true });
      case "em":
        return inline((token as Tokens.Em).tokens, { ...style, italics: true });
      case "br":
        return [{ ...style, text: "\n" }];
      case "text": {
        const t = token as Tokens.Text;
        return t.tokens ? inline(t.tokens, style) : [{ ...style, text: decode(t.text) }];
      }
      default:
        return "text" in token && typeof token.text === "string"
          ? [{ ...style, text: decode(token.text) }]
          : [];
    }
  });
}

// marked leaves entities from the source as written.
const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
