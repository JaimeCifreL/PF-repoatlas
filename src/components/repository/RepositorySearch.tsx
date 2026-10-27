
"use client";

import { GitBranch, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AnalysisResult } from "@/lib/github-analyzer";

type RepositorySearchProps = {
  repositoryUrl: string;
  onUrlChange: (value: string) => void;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
  analysisError: string | null;
  analysis: AnalysisResult | null;
};

export function RepositorySearch({
  repositoryUrl,
  onUrlChange,
  onAnalyze,
  isAnalyzing,
  analysisError,
  analysis,
}: RepositorySearchProps) {
  return (
    <section className="mt-7">

      {/* REPOSITORY INPUT */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onAnalyze();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[#263947] bg-[#101b27] p-3 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
          <GitBranch
            size={18}
            className="shrink-0 text-[#32d7b2]"
          />

          <input
            type="url"
            required
            value={repositoryUrl}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://github.com/owner/repository"
            aria-label="GitHub repository URL"
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-xs text-[#e7f2f5] outline-none placeholder:text-[#546a7c]"
          />
        </div>

        <button
          type="submit"
          disabled={isAnalyzing}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#278c78] bg-[#145b4b] px-5 py-3 font-mono text-[11px] font-semibold tracking-wider text-[#a4ffdd] transition-colors hover:bg-[#197561] disabled:cursor-wait disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              ANALYZING...
            </>
          ) : (
            <>
              <GitBranch size={14} />
              ANALYZE REPO
            </>
          )}
        </button>
      </form>

      {/* ERROR MESSAGE */}
      {analysisError && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-3 rounded-lg border border-[#7c3947] bg-[#301c26] px-4 py-3"
        >
          <AlertTriangle
            size={16}
            className="shrink-0 text-[#ff9d9d]"
          />

          <span className="text-xs text-[#ffb8b8]">
            {analysisError}
          </span>
        </div>
      )}

      {/* ANALYSIS RESULT */}
      {analysis && (
        <div className="mt-3 rounded-lg border border-[#294438] bg-[#10241f] px-4 py-3">

          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2
              size={16}
              className="text-[#36dcb4]"
            />

            <span className="break-all font-mono text-xs font-semibold text-[#62e6c0]">
              {analysis.repository}
            </span>

            <span className="rounded border border-[#305448] px-2 py-1 font-mono text-[10px] text-[#8ba79d]">
              {analysis.branch}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] text-[#90a9ab]">

            <span>
              <strong className="text-[#d7ece8]">
                {analysis.analyzedFiles}
              </strong>
              {" / "}
              {analysis.totalCodeFiles} files analyzed
            </span>

            <span>
              <strong className="text-[#d7ece8]">
                {analysis.connections.length}
              </strong>
              {" "}connections
            </span>

            <span className={
              analysis.partial
                ? "text-[#e6b77b]"
                : "text-[#62d4ac]"
            }>
              {analysis.partial ? "PARTIAL" : "COMPLETE"}
            </span>
          </div>

          {/* WARNINGS */}
          {analysis.warnings.length > 0 && (
            <div className="mt-3 border-t border-[#294438] pt-3">
              {analysis.warnings.map((warning) => (
                <div
                  key={warning}
                  className="mt-1 flex items-start gap-2 text-[11px] text-[#e6b77b]"
                >
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </section>
  );
}
