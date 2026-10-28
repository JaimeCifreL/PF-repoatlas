
"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileCode2,
  GitBranch,
  GitCompareArrows,
  GitCommitHorizontal,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  TimeMachineGraph,
  type TimeMachinePhase,
} from "./TimeMachineGraph";

import type {
  TimeMachineReport,
  FileChangeKind,
} from "../../lib/time-machine/compare";

import type {
  GithubRevisionList,
} from "../../lib/github/client";

type FileFilter =
  | "all"
  | FileChangeKind;

const PHASES: TimeMachinePhase[] = [
  "before",
  "diff",
  "after",
];

const PHASE_LABELS = [
  "BEFORE",
  "CHANGES",
  "AFTER",
];

const FILE_STYLES = {
  added: {
    text: "text-[#61E2B7]",
    border: "border-[#285D50]",
    background: "bg-[#103C32]",
    symbol: "+",
  },

  removed: {
    text: "text-[#F29BA2]",
    border: "border-[#72434A]",
    background: "bg-[#39232B]",
    symbol: "−",
  },

  modified: {
    text: "text-[#EAC187]",
    border: "border-[#745837]",
    background: "bg-[#35291E]",
    symbol: "~",
  },
};

function getError(
  payload: unknown,
  status: number
): string {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return `HTTP ${status}`;
}

function downloadReport(
  report: TimeMachineReport
) {
  const content = JSON.stringify(
    report,
    null,
    2
  );

  const blob = new Blob([content], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download =
    `repoatlas-time-machine-${report.repository.replace(
      /[^A-Za-z0-9_-]+/g,
      "-"
    )}.json`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[#293B4B] bg-[#101D2A] p-4">

      <div className="font-mono text-[10px] tracking-wider text-[#829BAB]">
        {title}
      </div>

      <div
        className="mt-2 font-mono text-2xl font-semibold"
        style={{ color }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export function TimeMachinePage() {
  const [repositoryUrl, setRepositoryUrl] =
    useState(
      "https://github.com/JaimeCifreL/scopecheck-ai"
    );

  const [beforeRef, setBeforeRef] =
    useState("");

  const [afterRef, setAfterRef] =
    useState("");

  const [revisions, setRevisions] =
    useState<GithubRevisionList | null>(null);

  const [loadingRevisions, setLoadingRevisions] =
    useState(false);

  const [isComparing, setIsComparing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [report, setReport] =
    useState<TimeMachineReport | null>(null);

  const [phaseIndex, setPhaseIndex] =
    useState<0 | 1 | 2>(1);

  const [selectedPath, setSelectedPath] =
    useState<string | null>(null);

  const [fileFilter, setFileFilter] =
    useState<FileFilter>("all");

  const [search, setSearch] =
    useState("");

  const phase = PHASES[phaseIndex];

  const filteredFiles = useMemo(() => {
    if (!report) {
      return [];
    }

    const normalized = search
      .trim()
      .toLowerCase();

    return report.fileChanges.filter(
      (item) =>
        (
          fileFilter === "all" ||
          item.change === fileFilter
        ) &&
        (
          !normalized ||
          item.path
            .toLowerCase()
            .includes(normalized)
        )
    );
  }, [
    report,
    fileFilter,
    search,
  ]);

  const selectedChange = report?.fileChanges.find(
    (file) => file.path === selectedPath
  );

  const selectedBefore = report?.before.files.find(
    (file) => file.path === selectedPath
  );

  const selectedAfter = report?.after.files.find(
    (file) => file.path === selectedPath
  );

  async function loadRevisions() {
    if (!repositoryUrl.trim()) {
      return;
    }

    setLoadingRevisions(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        url: repositoryUrl.trim(),
      });

      const response = await fetch(
        `/api/time-machine/revisions?${params}`
      );

      const payload: unknown =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getError(payload, response.status)
        );
      }

      const result =
        payload as GithubRevisionList;

      setRevisions(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load revisions."
      );
    } finally {
      setLoadingRevisions(false);
    }
  }

  async function compare(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!repositoryUrl.trim() || !afterRef.trim()) {
      setError(
        "Enter a repository and the AFTER branch or commit."
      );

      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        url: repositoryUrl.trim(),
        after: afterRef.trim(),
      });

      if (beforeRef.trim()) {
        params.set("before", beforeRef.trim());
      }

      const response = await fetch(
        `/api/time-machine?${params}`
      );

      const payload: unknown =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getError(payload, response.status)
        );
      }

      const result =
        payload as TimeMachineReport;

      setReport(result);
      setPhaseIndex(1);
      setFileFilter("all");
      setSearch("");
      setSelectedPath(
        result.fileChanges[0]?.path ?? null
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not compare versions."
      );
    } finally {
      setIsComparing(false);
    }
  }

  function chooseFile(path: string) {
    setSelectedPath(path);
    setPhaseIndex(1);
  }

  function githubFileUrl(
    sha: string,
    path: string
  ) {
    const encodedPath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    return (
      `https://github.com/${report?.repository}` +
      `/blob/${sha}/${encodedPath}`
    );
  }

  const isHeuristic = report
    ? [...report.before.files, ...report.after.files]
        .some(
          (file) =>
            file.analysisPrecision === "heuristic"
        )
    : false;

  return (
    <div className="min-h-screen bg-[#080D14] text-[#E8EEF5]">

      {/* HEADER */}
      <header className="border-b border-[#203141] bg-[#0C1420] px-5 py-5 lg:px-10">

        <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-[#294252] bg-[#142331] px-3 py-2 font-mono text-[11px] text-[#A1BBC8] hover:border-[#2BCDAA] hover:text-white"
            >
              <ArrowLeft size={14}/>
              WORKSPACE
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-[#206C5C] bg-[#10372F] p-3">
                <Clock3
                  size={21}
                  className="text-[#43E1B8]"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
                  Architecture Time Machine
                </h1>

                <p className="mt-1 font-mono text-[10px] tracking-widest text-[#7591A2]">
                  REPOSITORY EVOLUTION INTELLIGENCE
                </p>
              </div>
            </div>
          </div>

          {report && (
            <button
              type="button"
              onClick={() =>
                downloadReport(report)
              }
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#288673] bg-[#134539] px-4 py-3 font-mono text-[11px] font-semibold text-[#A6FFE2]"
            >
              <Download size={15}/>
              EXPORT COMPARISON
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1550px] space-y-6 px-5 py-8 lg:px-10">

        {/* DESCRIPTION */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[#27D6B2]">
            04 / CHANGE INTELLIGENCE
          </div>

          <h2 className="mt-2 text-2xl font-semibold">
            Compare architectural revisions
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#869EAF]">
            Compare branches, tags or commit hashes.
            Discover changed files, dependency changes
            and newly introduced circular dependencies.
          </p>
        </div>

        {/* REPOSITORY AND REFERENCES */}
        <form
          onSubmit={(event) => {
            void compare(event);
          }}
          className="rounded-xl border border-[#2B4050] bg-[#101C29] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[#A2BBC8]">
              <GitBranch
                size={16}
                className="text-[#39D7B4]"
              />
              GITHUB REPOSITORY
            </div>

            <button
              type="button"
              disabled={loadingRevisions || isComparing}
              onClick={() => {
                void loadRevisions();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-[#355268] px-3 py-2 font-mono text-[10px] text-[#B0C9D6] hover:border-[#39D9B6] disabled:opacity-50"
            >
              {loadingRevisions ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <GitCommitHorizontal size={13}/>
              )}
              LOAD BRANCHES & COMMITS
            </button>
          </div>

          <input
            type="url"
            required
            aria-label="Repository URL"
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
              setRevisions(null);
            }}
            placeholder="https://github.com/owner/repo"
            className="mt-3 w-full rounded-lg border border-[#324A5C] bg-[#0B1520] px-4 py-3 font-mono text-xs text-[#E6F3F5] outline-none focus:border-[#38D7B3]"
          />

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">

            <div>
              <label
                htmlFor="time-before"
                className="font-mono text-[10px] tracking-wider text-[#90A8B8]"
              >
                BEFORE / BASE REFERENCE
              </label>

              <input
                id="time-before"
                value={beforeRef}
                onChange={(event) =>
                  setBeforeRef(event.target.value)
                }
                list="repoatlas-git-revisions"
                placeholder="Default branch"
                className="mt-2 w-full rounded-lg border border-[#324A5C] bg-[#0B1520] px-4 py-3 font-mono text-xs outline-none focus:border-[#38D7B3]"
              />
            </div>

            <ArrowRight
              size={20}
              className="mb-3 hidden text-[#39D7B4] md:block"
            />

            <div>
              <label
                htmlFor="time-after"
                className="font-mono text-[10px] tracking-wider text-[#90A8B8]"
              >
                AFTER / TARGET REFERENCE
              </label>

              <input
                id="time-after"
                required
                value={afterRef}
                onChange={(event) =>
                  setAfterRef(event.target.value)
                }
                list="repoatlas-git-revisions"
                placeholder="Branch, tag or commit SHA"
                className="mt-2 w-full rounded-lg border border-[#324A5C] bg-[#0B1520] px-4 py-3 font-mono text-xs outline-none focus:border-[#38D7B3]"
              />
            </div>
          </div>

          <datalist id="repoatlas-git-revisions">
            {revisions?.branches.map((name) => (
              <option
                key={`branch-${name}`}
                value={name}
              />
            ))}

            {revisions?.commits.map((commit) => (
              <option
                key={commit.sha}
                value={commit.sha}
              >
                {commit.message}
              </option>
            ))}
          </datalist>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

            <p className="text-xs text-[#718C9E]">
              Leave BEFORE empty to use the default branch.
              Use full commit hashes to compare two moments
              from the same branch.
            </p>

            <button
              type="submit"
              disabled={isComparing}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#279881] bg-[#145847] px-5 py-3 font-mono text-[11px] font-semibold tracking-wider text-[#B5FFE9] hover:bg-[#1A715B] disabled:opacity-50"
            >
              {isComparing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <GitCompareArrows size={15}/>
              )}
              {isComparing
                ? "COMPARING..."
                : "COMPARE ARCHITECTURE"}
            </button>
          </div>
        </form>

        {/* RECENT REVISIONS */}
        {revisions && (
          <section className="rounded-xl border border-[#293F4E] bg-[#101A27] p-5">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[11px] text-[#B0CBD5]">
                RECENT REVISIONS
              </div>

              <div className="font-mono text-[10px] text-[#7795A5]">
                DEFAULT: {revisions.defaultBranch}
              </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {revisions.commits.slice(0, 8).map(
                (commit) => (
                  <div
                    key={commit.sha}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#283C4B] bg-[#0C1621] p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[11px] text-[#CEDFE5]">
                        {commit.message}
                      </div>

                      <div className="mt-1 font-mono text-[10px] text-[#7691A2]">
                        {commit.sha.slice(0, 10)}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBeforeRef(commit.sha)
                        }
                        className="cursor-pointer rounded border border-[#40586A] px-2 py-1 font-mono text-[9px] text-[#A8BECD]"
                      >
                        BASE
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAfterRef(commit.sha)
                        }
                        className="cursor-pointer rounded border border-[#29836F] px-2 py-1 font-mono text-[9px] text-[#65E7C3]"
                      >
                        TARGET
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#85434D] bg-[#341E28] p-4 text-sm text-[#FFB9BF]"
          >
            {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!report && !isComparing && (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[#344A5C] bg-[#0D1723] p-8 text-center">
            <Clock3
              size={39}
              className="text-[#44BFA5]"
            />

            <h3 className="mt-4 text-lg font-semibold">
              Your architecture timeline starts here
            </h3>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#7F9CAD]">
              Select two commits or branches to reveal
              how the repository has evolved.
            </p>
          </div>
        )}

        {/* COMPARISON RESULTS */}
        {report && (
          <>
            {/* VERSION SUMMARY */}
            <section className="grid gap-3 md:grid-cols-2">

              <div className="rounded-xl border border-[#2C4353] bg-[#101D2A] p-4">
                <div className="font-mono text-[10px] text-[#839DAC]">
                  BEFORE
                </div>

                <div className="mt-2 break-all font-mono text-sm font-semibold text-[#DDEBF0]">
                  {report.beforeRef}
                </div>

                <div className="mt-2 font-mono text-[10px] text-[#7F99A8]">
                  {report.before.commitSha?.slice(0, 12)}
                </div>

                <div className="mt-3 text-xs text-[#93ACBA]">
                  {report.before.files.length} files ·{" "}
                  {report.before.connections.length} dependencies
                </div>
              </div>

              <div className="rounded-xl border border-[#276C5C] bg-[#102B27] p-4">
                <div className="font-mono text-[10px] text-[#5DDDB9]">
                  AFTER
                </div>

                <div className="mt-2 break-all font-mono text-sm font-semibold text-[#DDEBF0]">
                  {report.afterRef}
                </div>

                <div className="mt-2 font-mono text-[10px] text-[#7F99A8]">
                  {report.after.commitSha?.slice(0, 12)}
                </div>

                <div className="mt-3 text-xs text-[#93ACBA]">
                  {report.after.files.length} files ·{" "}
                  {report.after.connections.length} dependencies
                </div>
              </div>
            </section>

            {/* SUMMARY METRICS */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                title="FILES ADDED"
                value={report.summary.addedFiles}
                color="#59DFB4"
              />

              <MetricCard
                title="FILES REMOVED"
                value={report.summary.removedFiles}
                color="#F18F99"
              />

              <MetricCard
                title="FILES MODIFIED"
                value={report.summary.modifiedFiles}
                color="#EABC76"
              />

              <MetricCard
                title="NEW DEPENDENCIES"
                value={report.summary.addedConnections}
                color="#59DFB4"
              />

              <MetricCard
                title="REMOVED DEPENDENCIES"
                value={report.summary.removedConnections}
                color="#F18F99"
              />

              <MetricCard
                title="NEW CYCLE GROUPS"
                value={report.summary.introducedCycles}
                color="#F18F99"
              />

              <MetricCard
                title="RESOLVED CYCLE GROUPS"
                value={report.summary.resolvedCycles}
                color="#59DFB4"
              />

              <MetricCard
                title="UNCHANGED FILES"
                value={report.summary.unchangedFiles}
                color="#D7E7ED"
              />
            </section>

            {/* COVERAGE WARNING */}
            {(report.coverageLimited || isHeuristic) && (
              <div className="flex items-start gap-3 rounded-lg border border-[#755D36] bg-[#2C251B] p-4">
                <ShieldAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-[#E8BC78]"
                />

                <p className="text-xs leading-relaxed text-[#E5C496]">
                  File changes are compared using Git blob hashes.
                  Dependency changes and cycle differences
                  depend on analyzer coverage and may be
                  incomplete, especially for heuristic
                  language analyzers or skipped source files.
                </p>
              </div>
            )}

            {/* TIME SLIDER */}
            <section className="rounded-xl border border-[#2B4352] bg-[#101D29] p-5">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3
                    size={17}
                    className="text-[#38DDB5]"
                  />

                  <span className="font-mono text-[11px] font-semibold tracking-wider text-[#C8E0E9]">
                    TIME TRAVEL
                  </span>
                </div>

                <span className="rounded border border-[#2B806E] bg-[#143D34] px-3 py-1 font-mono text-[10px] text-[#74ECC9]">
                  {PHASE_LABELS[phaseIndex]}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={phaseIndex}
                aria-label="Architecture timeline"
                onChange={(event) =>
                  setPhaseIndex(
                    Number(event.target.value) as
                      0 | 1 | 2
                  )
                }
                className="mt-5 w-full cursor-pointer accent-[#3BDAB5]"
              />

              <div className="mt-2 flex justify-between font-mono text-[10px] text-[#849EAE]">
                {PHASE_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setPhaseIndex(index as 0 | 1 | 2)
                    }
                    className={`cursor-pointer ${
                      phaseIndex === index
                        ? "text-[#59E8C1]"
                        : "hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* GRAPH AND FILE CHANGES */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">

              <section className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-xs tracking-wider text-[#B7D0DB]">
                    ARCHITECTURE EVOLUTION
                  </h3>

                  <div className="flex flex-wrap gap-3 font-mono text-[10px]">
                    <span className="text-[#62E8BB]">
                      + ADDED
                    </span>

                    <span className="text-[#F39AA2]">
                      − REMOVED
                    </span>

                    <span className="text-[#EAC087]">
                      ~ MODIFIED
                    </span>
                  </div>
                </div>

                <TimeMachineGraph
                  report={report}
                  phase={phase}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                />
              </section>

              {/* FILE CHANGES */}
              <aside className="min-w-0 rounded-xl border border-[#2B3F4D] bg-[#101B27] p-4">

                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-xs font-semibold tracking-wider text-[#BCD5DF]">
                    CHANGED FILES
                  </h3>

                  <span className="font-mono text-[10px] text-[#829BAB]">
                    {report.fileChanges.length}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      "all",
                      "added",
                      "removed",
                      "modified",
                    ] as FileFilter[]
                  ).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() =>
                        setFileFilter(filter)
                      }
                      className={`cursor-pointer rounded-md border px-2 py-2 font-mono text-[9px] ${
                        fileFilter === filter
                          ? "border-[#278E79] bg-[#19493E] text-[#9CFCE0]"
                          : "border-[#304555] text-[#8CA5B5]"
                      }`}
                    >
                      {filter.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#304555] bg-[#0B1520] px-3 py-2">
                  <Search
                    size={14}
                    className="text-[#7792A2]"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search changed files"
                    aria-label="Search changed files"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none"
                  />
                </div>

                <div className="mt-4 max-h-[445px] space-y-2 overflow-auto">

                  {filteredFiles.length === 0 && (
                    <p className="p-3 text-xs text-[#7893A4]">
                      No files match these filters.
                    </p>
                  )}

                  {filteredFiles.map((item) => {
                    const style =
                      FILE_STYLES[item.change];

                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() =>
                          chooseFile(item.path)
                        }
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left ${
                          selectedPath === item.path
                            ? "border-[#4AA68F] bg-[#19352F]"
                            : "border-[#273E4E] bg-[#0D1824] hover:border-[#467D76]"
                        }`}
                      >
                        <span
                          className={`rounded px-2 py-1 font-mono text-xs font-bold ${style.text} ${style.background} ${style.border} border`}
                        >
                          {style.symbol}
                        </span>

                        <div className="min-w-0">
                          <div className="break-all font-mono text-[11px] text-[#D6E5EB]">
                            {item.path.split("/").at(-1)}
                          </div>

                          <div className="mt-1 break-all font-mono text-[9px] text-[#7790A1]">
                            {item.path}
                          </div>

                          <div className="mt-2 font-mono text-[9px] text-[#8EAEBC]">
                            {item.language}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>

            {/* SELECTED FILE DETAILS */}
            {selectedPath && (
              <section className="rounded-xl border border-[#2B4252] bg-[#101D29] p-5">

                <div className="flex items-center gap-2">
                  <FileCode2
                    size={17}
                    className="text-[#44D9B5]"
                  />

                  <h3 className="font-mono text-[11px] tracking-wider text-[#BBD4DF]">
                    FILE CHANGE INSPECTOR
                  </h3>
                </div>

                <p className="mt-4 break-all font-mono text-sm text-[#E5EFF2]">
                  {selectedPath}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-[#89A5B5]">
                  <span>
                    STATUS:{" "}
                    <strong className="text-[#DCECF0]">
                      {selectedChange?.change.toUpperCase() ??
                        "UNCHANGED"}
                    </strong>
                  </span>

                  <span>
                    BEFORE: {selectedBefore ? "PRESENT" : "ABSENT"}
                  </span>

                  <span>
                    AFTER: {selectedAfter ? "PRESENT" : "ABSENT"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">

                  {selectedBefore && report.before.commitSha && (
                    <a
                      href={githubFileUrl(
                        report.before.commitSha,
                        selectedPath
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-[#40596B] px-3 py-2 font-mono text-[10px] text-[#A9C2D0] hover:text-white"
                    >
                      OPEN BEFORE FILE
                    </a>
                  )}

                  {selectedAfter && report.after.commitSha && (
                    <a
                      href={githubFileUrl(
                        report.after.commitSha,
                        selectedPath
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-[#278E79] px-3 py-2 font-mono text-[10px] text-[#73E5C3] hover:text-white"
                    >
                      OPEN AFTER FILE
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* DEPENDENCY CHANGES */}
            <section className="grid gap-5 xl:grid-cols-2">

              <div className="rounded-xl border border-[#2A4050] bg-[#101B27] p-5">
                <div className="flex items-center gap-2">
                  <GitCompareArrows
                    size={16}
                    className="text-[#42D9B5]"
                  />

                  <h3 className="font-mono text-[11px] tracking-wider text-[#BCD4DF]">
                    DEPENDENCY CHANGES
                  </h3>
                </div>

                <div className="mt-4 max-h-[340px] space-y-2 overflow-auto">
                  {report.connectionChanges.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-[#829DAD]">
                      <CheckCircle2 size={15}/>
                      No dependency changes detected.
                    </div>
                  )}

                  {report.connectionChanges
                    .slice(0, 80)
                    .map((connection) => (
                      <div
                        key={`${connection.change}-${connection.source}-${connection.target}`}
                        className="rounded-lg border border-[#293F4E] bg-[#0D1823] p-3"
                      >
                        <div className={`font-mono text-[10px] ${
                          connection.change === "added"
                            ? "text-[#62E8BB]"
                            : "text-[#F39AA2]"
                        }`}>
                          {connection.change === "added"
                            ? "+ NEW DEPENDENCY"
                            : "− REMOVED DEPENDENCY"}
                        </div>

                        <div className="mt-2 break-all font-mono text-[10px] text-[#C7DAE3]">
                          {connection.source}
                        </div>

                        <div className="my-1 text-[#7795A4]">
                          ↓
                        </div>

                        <div className="break-all font-mono text-[10px] text-[#C7DAE3]">
                          {connection.target}
                        </div>

                        {connection.confidence === "limited" && (
                          <div className="mt-2 font-mono text-[9px] text-[#E5BB80]">
                            LIMITED ANALYZER COVERAGE
                          </div>
                        )}
                      </div>
                    ))}

                  {report.connectionChanges.length > 80 && (
                    <p className="text-xs text-[#829DAD]">
                      Showing 80 of{" "}
                      {report.connectionChanges.length} changes.
                      Export JSON for the complete result.
                    </p>
                  )}
                </div>
              </div>

              {/* CYCLE CHANGES */}
              <div className="rounded-xl border border-[#2A4050] bg-[#101B27] p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    size={16}
                    className="text-[#E7B26D]"
                  />

                  <h3 className="font-mono text-[11px] tracking-wider text-[#BCD4DF]">
                    CIRCULAR DEPENDENCY CHANGES
                  </h3>
                </div>

                <div className="mt-4 max-h-[340px] space-y-3 overflow-auto">

                  {report.cycleChanges.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-[#829DAD]">
                      <CheckCircle2 size={15}/>
                      No cycle-group changes detected.
                    </div>
                  )}

                  {report.cycleChanges.map(
                    (cycle, index) => (
                      <div
                        key={`${cycle.change}-${index}`}
                        className="rounded-lg border border-[#334A59] bg-[#0D1823] p-3"
                      >
                        <div className={`font-mono text-[10px] font-semibold ${
                          cycle.change === "introduced"
                            ? "text-[#F09A9E]"
                            : "text-[#66DEB8]"
                        }`}>
                          {cycle.change === "introduced"
                            ? "NEW CYCLE GROUP"
                            : "RESOLVED CYCLE GROUP"}
                        </div>

                        <div className="mt-2 space-y-1">
                          {cycle.members.map((path) => (
                            <button
                              key={path}
                              type="button"
                              onClick={() =>
                                chooseFile(path)
                              }
                              className="block w-full cursor-pointer break-all text-left font-mono text-[10px] text-[#AFC8D5] hover:text-[#63E3BE]"
                            >
                              {path}
                            </button>
                          ))}
                        </div>

                        {cycle.confidence === "limited" && (
                          <p className="mt-2 text-[10px] text-[#E1B77C]">
                            Result may be incomplete.
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>

            {/* WARNINGS */}
            {report.warnings.length > 0 && (
              <section className="rounded-lg border border-[#645334] bg-[#29231B] p-4">
                <h3 className="font-mono text-[11px] text-[#E9BD7C]">
                  ANALYSIS WARNINGS
                </h3>

                <div className="mt-3 space-y-2">
                  {report.warnings.slice(0, 20).map(
                    (warning, index) => (
                      <p
                        key={index}
                        className="break-all font-mono text-[10px] leading-relaxed text-[#CBB28D]"
                      >
                        {warning}
                      </p>
                    )
                  )}
                </div>
              </section>
            )}

          </>
        )}
      </div>
    </div>
  );
}
