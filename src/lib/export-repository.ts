
import type {
  AnalysisResult,
} from "../types/repository";

export type ExportFormat =
  | "json"
  | "csv"
  | "mermaid";

function escapeCsv(
  value: string | number
): string {
  return `"${String(value).replace(
    /"/g,
    '""'
  )}"`;
}

export function serializeAnalysis(
  analysis: AnalysisResult,
  format: ExportFormat
): string {
  if (format === "json") {
    return JSON.stringify(
      analysis,
      null,
      2
    );
  }

  if (format === "csv") {
    const rows = [
      [
        "path",
        "language",
        "status",
        "kind",
        "size",
      ]
        .map(escapeCsv)
        .join(","),
    ];

    for (const file of analysis.files) {
      rows.push(
        [
          file.path,
          file.language ?? "",
          file.analysisStatus ?? "indexed",
          file.kind,
          file.size ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    return rows.join("\n");
  }

  const nodes = new Map(
    analysis.files.map(
      (file, index) => [
        file.id,
        `N${index}`,
      ]
    )
  );

  const escapeLabel = (
    value: string
  ) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "#quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r?\n/g, " ");

  const lines = [
    "flowchart LR",
  ];

  for (const file of analysis.files) {
    lines.push(
      `  ${nodes.get(file.id)}["${escapeLabel(file.path)}"]`
    );
  }

  for (
    const [source, target] of analysis.connections
  ) {
    const a = nodes.get(source);
    const b = nodes.get(target);

    if (a && b) {
      lines.push(
        `  ${a} --> ${b}`
      );
    }
  }

  return lines.join("\n");
}

export function downloadAnalysis(
  analysis: AnalysisResult,
  format: ExportFormat
): void {
  const content = serializeAnalysis(
    analysis,
    format
  );

  const mime =
    format === "json"
      ? "application/json"
      : format === "csv"
        ? "text/csv"
        : "text/plain";

  const extension =
    format === "mermaid"
      ? "mmd"
      : format;

  const fileName =
    `repoatlas-${analysis.repository.replace(
      /[^\w-]+/g,
      "-"
    )}.${extension}`;

  const blob = new Blob(
    [content],
    {
      type:
        mime + ";charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}
