
"use client";

import {
  useMemo,
  useState,
  useCallback,
} from "react";

import dynamic from "next/dynamic";
import { LanguageDistribution } from "../components/LanguageDistribution";
import {
  Sidebar,
  type WorkspaceView,
} from "../components/layout/Sidebar";

import {
  RepoGraph2D,
} from "../components/graph/RepoGraph2D";

import {
  RepositorySearch,
} from "../components/repository/RepositorySearch";

import {
  ArchitectureOverview,
} from "../components/architecture/ArchitectureOverview";

import {
  FileInspector,
} from "../components/inspector/FileInspector";

import {
  FileExplorer,
} from "../components/explorer/FileExplorer";

import {
  FolderGraphControls,
} from "../components/graph/FolderGraphControls";

import {
  GraphScaleControls,
} from "../components/graph/GraphScaleControls";

import {
  files as sampleFiles,
  connections as sampleConnections,
} from "../lib/sample-repository";

import {
  createGraphIndex,
} from "../lib/graph-core";

import {
  calculateGraphMetrics,
} from "../lib/graph-metrics";

import {
  analyzeImpact,
} from "../lib/graph-impact";

import {
  buildFolderGrouping,
  type FolderDepth,
  type FolderGrouping,
} from "../lib/folder-groups";

import {
  getFolderColor,
} from "../lib/folder-visuals";

import {
  buildGraphProjection,
  projectGraphImpact,
  resolveGraphMode,
  MAX_GRAPH_NODES,
  type GraphScaleMode,
} from "../lib/graph-aggregation";

import {
  downloadAnalysis,
  type ExportFormat,
} from "../lib/export-repository";

import type {
  AnalysisResult,
} from "../types/repository";

const RepoGraph3D = dynamic(
  () => import("../components/graph/RepoGraph3D"),
  { ssr: false }
);

export default function Home() {

  // REPOSITORY
  const [repositoryUrl, setRepositoryUrl] =
    useState("");

  const [branch, setBranch] =
    useState("");

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysisError, setAnalysisError] =
    useState<string | null>(null);

  // NAVIGATION
  const [activeView, setActiveView] =
    useState<WorkspaceView>("map");

  const [viewMode, setViewMode] =
    useState<"2d" | "3d">("2d");

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  // ANALYSIS
  const [impactSourceId, setImpactSourceId] =
    useState<string | null>(null);

  const [focusedCycleIndex, setFocusedCycleIndex] =
    useState<number | null>(null);

  // FOLDERS
  const [folderDepth, setFolderDepth] =
    useState<FolderDepth>(3);

  const [selectedFolderId, setSelectedFolderId] =
    useState<string | null>(null);

  const [colorByFolder, setColorByFolder] =
    useState(true);

  // GRAPH SCALE
  const [graphMode, setGraphMode] =
    useState<GraphScaleMode>("auto");

  const [expandedFolderIds, setExpandedFolderIds] =
    useState<readonly string[]>([]);

  const [focusFileId, setFocusFileId] =
    useState<string | null>(null);

  const [graphWarning, setGraphWarning] =
    useState<string | null>(null);

  // 3D LABELS
  const [labelFontSize, setLabelFontSize] =
    useState(8);

  const [labelsVisible, setLabelsVisible] =
    useState(true);

  // EXPORTS
  const [exportFormat, setExportFormat] =
    useState<ExportFormat>("json");

  // ORIGINAL REPOSITORY GRAPH
  const files =
    analysis?.files ?? sampleFiles;

  const connections =
    analysis?.connections ?? sampleConnections;

  const graphIndex = useMemo(
    () =>
      createGraphIndex({
        files,
        connections,
      }),
    [files, connections]
  );

  const architectureMetrics = useMemo(
    () => calculateGraphMetrics(graphIndex),
    [graphIndex]
  );

  const folderGrouping = useMemo(
    () =>
      buildFolderGrouping(
        { files, connections },
        folderDepth
      ),
    [files, connections, folderDepth]
  );

  const impact = useMemo(
    () =>
      impactSourceId === null
        ? null
        : analyzeImpact(
            graphIndex,
            impactSourceId
          ),
    [graphIndex, impactSourceId]
  );

  const focusedCycleIds =
    focusedCycleIndex === null
      ? null
      : architectureMetrics.cycleGroups[
          focusedCycleIndex
        ] ?? null;

  // DISPLAY GRAPH
  const resolvedGraphMode = resolveGraphMode(
    graphMode,
    files.length
  );

  const expandedFolders = useMemo(
    () => new Set(expandedFolderIds),
    [expandedFolderIds]
  );
  
  const graphFocusId =
    resolvedGraphMode === "focus"
      ? focusFileId ?? selectedId
      : null;

  const graphProjection = useMemo(
    () =>
      buildGraphProjection(
        { files, connections },
        folderGrouping,
        resolvedGraphMode,
        expandedFolders,
        graphFocusId
      ),
    [
      files,
      connections,
      folderGrouping,
      resolvedGraphMode,
      expandedFolders,
      graphFocusId,
    ]
  );

  // Add synthetic module nodes to the folder-color index.
  const displayFolderGrouping = useMemo<FolderGrouping>(
    () => ({
      ...folderGrouping,
      fileToGroup: new Map([
        ...folderGrouping.fileToGroup,
        ...graphProjection.moduleToFolder,
      ]),
    }),
    [folderGrouping, graphProjection]
  );

  const visibleGraphIds = useMemo<
    ReadonlySet<string> | null
  >(() => {
    if (!selectedFolderId) {
      return null;
    }

    const group = folderGrouping.groups.find(
      (item) => item.id === selectedFolderId
    );

    if (!group) {
      return null;
    }

    const visible = new Set<string>();

    for (const id of group.fileIds) {
      const nodeId =
        graphProjection.fileToNode.get(id);

      if (nodeId) {
        visible.add(nodeId);
      }
    }

    return visible;
  }, [
    selectedFolderId,
    folderGrouping,
    graphProjection,
  ]);

  const displaySelectedId =
    selectedId === null
      ? null
      : graphProjection.fileToNode.get(
          selectedId
        ) ?? null;

  const displayImpact = useMemo(
    () =>
      projectGraphImpact(
        impact,
        graphProjection,
        connections
      ),
    [
      impact,
      graphProjection,
      connections,
    ]
  );

  const displayCycleIds = useMemo(() => {
    if (focusedCycleIds === null) {
      return null;
    }

    const ids = new Set<string>();

    for (const originalId of focusedCycleIds) {
      const nodeId =
        graphProjection.fileToNode.get(originalId);

      if (nodeId) {
        ids.add(nodeId);
      }
    }

    return [...ids];
  }, [
    focusedCycleIds,
    graphProjection,
  ]);

  // GRAPH COMMANDS
  const collapseAll = useCallback(() => {
    setExpandedFolderIds([]);
    setSelectedFolderId(null);
    setGraphWarning(null);
  }, []);

  function expandModule(folderId: string) {
    const group = folderGrouping.groups.find(
      (item) => item.id === folderId
    );

    if (!group || expandedFolders.has(folderId)) {
      return;
    }

    const nextNodeCount =
      graphProjection.graph.files.length -
      1 +
      group.fileCount;

    if (nextNodeCount > MAX_GRAPH_NODES) {
      setGraphWarning(
        `Module "${group.path}" contains too many files ` +
        `to expand safely in the current graph. ` +
        `Use File Explorer to select a file, ` +
        `then switch to FOCUS.`
      );
      return;
    }

    setExpandedFolderIds((previous) => [
      ...previous,
      folderId,
    ]);

    setSelectedFolderId(null);
    setGraphMode("modules");
    setGraphWarning(null);
  }

  function handleGraphSelect(id: string | null) {
    if (!id) {
      setSelectedId(null);
      return;
    }

    const moduleFolder =
      graphProjection.moduleToFolder.get(id);

    if (moduleFolder) {
      expandModule(moduleFolder);
      return;
    }

    setSelectedId(id);
  }

  function navigateToFile(
    id: string,
    targetView: "map" | "impact"
  ) {
    const folderId =
      folderGrouping.fileToGroup.get(id);

    const group = folderGrouping.groups.find(
      (item) => item.id === folderId
    );

    if (files.length <= MAX_GRAPH_NODES) {
      setGraphMode("files");
      setExpandedFolderIds([]);
    } else if (
      folderId &&
      group &&
      folderGrouping.groups.length -
        1 +
        group.fileCount <= MAX_GRAPH_NODES
    ) {
      setGraphMode("modules");
      setExpandedFolderIds([folderId]);
    } else {
      // A very large module is explored as a
      // local file-neighborhood graph.
      setGraphMode("focus");
      setFocusFileId(id);
      setExpandedFolderIds([]);
    }

    setSelectedFolderId(null);
    setSelectedId(id);
    setGraphWarning(null);

    if (targetView === "impact") {
      setImpactSourceId(id);
      setFocusedCycleIndex(null);
    }

    setActiveView(targetView);
  }

  function changeGraphMode(mode: GraphScaleMode) {
    if (
      mode === "files" &&
      files.length > MAX_GRAPH_NODES
    ) {
      setGraphWarning(
        "This repository is too large for the " +
        "all-files graph. Use MODULES or FOCUS."
      );
      return;
    }

    if (mode === "focus") {
      const target = selectedId ?? focusFileId;

      if (!target) {
        return;
      }

      setFocusFileId(target);
      setSelectedFolderId(null);
    }

    setGraphMode(mode);
    setGraphWarning(null);
  }

  function changeFolderDepth(depth: FolderDepth) {
    setFolderDepth(depth);
    setSelectedFolderId(null);
    setExpandedFolderIds([]);
    setGraphWarning(null);
  }

  function changeFolderSelection(id: string | null) {
    setSelectedFolderId(id);
    setGraphWarning(null);

    if (!id) {
      return;
    }

    const group = folderGrouping.groups.find(
      (item) => item.id === id
    );

    if (!group) {
      return;
    }

    const expected =
      folderGrouping.groups.length -
      1 +
      group.fileCount;

    setGraphMode("modules");

    if (expected <= MAX_GRAPH_NODES) {
      setExpandedFolderIds([id]);
    } else {
      setExpandedFolderIds([]);

      setGraphWarning(
        `The selected folder has ${group.fileCount} files. ` +
        `Open a specific file from File Explorer ` +
        `to inspect its local graph.`
      );
    }
  }

  function changeView(next: WorkspaceView) {
    setActiveView(next);

    if (next === "impact") {
      setFocusedCycleIndex(null);

      if (selectedId && !impactSourceId) {
        setImpactSourceId(selectedId);
      }
    }
  }

  function focusCycle(index: number) {
    setFocusedCycleIndex(index);
    setImpactSourceId(null);
    setSelectedId(null);
    setSelectedFolderId(null);

    const cycle =
      architectureMetrics.cycleGroups[index] ?? [];

    const groups = new Set<string>();

    for (const id of cycle) {
      const folder = folderGrouping.fileToGroup.get(id);

      if (folder) {
        groups.add(folder);
      }
    }

    const size =
      folderGrouping.groups.reduce(
        (total, group) =>
          total +
          (groups.has(group.id)
            ? group.fileCount
            : 1),
        0
      );

    setGraphMode("modules");
    setExpandedFolderIds(
      size <= MAX_GRAPH_NODES
        ? [...groups]
        : []
    );

    setActiveView("map");
  }

  // GITHUB ANALYSIS
  async function handleAnalyze(): Promise<void> {
    if (!repositoryUrl.trim() || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const params = new URLSearchParams({
        url: repositoryUrl.trim(),
      });

      if (branch.trim()) {
        params.set("branch", branch.trim());
      }

      const response = await fetch(
        `/api/analyze?${params.toString()}`
      );

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          payload !== null &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `HTTP ${response.status}`;

        throw new Error(message);
      }

      setAnalysis(payload as AnalysisResult);

      setSelectedId(null);
      setImpactSourceId(null);
      setFocusedCycleIndex(null);
      setSelectedFolderId(null);
      setExpandedFolderIds([]);
      setFocusFileId(null);
      setGraphMode("auto");
      setGraphWarning(null);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Unable to analyze repository."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const expandedModules = folderGrouping.groups
    .filter((group) =>
      expandedFolders.has(group.id)
    )
    .map((group) => ({
      id: group.id,
      path: group.path,
    }));

  return (
    <div className="min-h-screen bg-[#080d14] text-[#e8eef5] lg:flex">

      <Sidebar
        activeView={activeView}
        onChangeView={changeView}
      />

      <div className="flex min-w-0 flex-1 flex-col">

        {/* TOP BAR */}
        <header className="flex min-h-[74px] flex-wrap items-center justify-between gap-3 border-b border-[#1d2b38] px-5 py-3 lg:px-8">

          <div className="text-xs text-[#778d9e]">
            WORKSPACE /{" "}
            <span className="text-[#d0e0e9]">
              {activeView === "overview"
                ? "ARCHITECTURE OVERVIEW"
                : activeView === "files"
                  ? "FILE EXPLORER"
                  : activeView === "impact"
                    ? "IMPACT ANALYSIS"
                    : "DEPENDENCY MAP"}
            </span>
          </div>

          {analysis && (
            <div className="flex items-center gap-2">

              <select
                aria-label="Export format"
                value={exportFormat}
                onChange={(event) =>
                  setExportFormat(
                    event.target.value as ExportFormat
                  )
                }
                className="rounded border border-[#304453] bg-[#101b27] px-2 py-2 font-mono text-[11px]"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="mermaid">MERMAID</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  downloadAnalysis(analysis, exportFormat)
                }
                className="cursor-pointer rounded border border-[#278e79] bg-[#154437] px-3 py-2 font-mono text-[11px] text-[#a4ffe1]"
              >
                EXPORT
              </button>
            </div>
          )}
        </header>

        {/* REPOSITORY SEARCH */}
        <div className="px-5 lg:px-8">

          <RepositorySearch
            repositoryUrl={repositoryUrl}
            onUrlChange={setRepositoryUrl}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            analysis={analysis}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              htmlFor="branch-input"
              className="font-mono text-[10px] text-[#8da8b7]"
            >
              GIT BRANCH
            </label>

            <input
              id="branch-input"
              value={branch}
              onChange={(event) =>
                setBranch(event.target.value)
              }
              placeholder="Default branch"
              className="rounded border border-[#304453] bg-[#101b27] px-3 py-2 font-mono text-[11px] text-[#d6e8ed] outline-none"
            />
          </div>
        </div>
        
        {/* ARCHITECTURE OVERVIEW */}
        {activeView === "overview" && (
          <div className="space-y-6 px-5 py-6 lg:px-8">

            <ArchitectureOverview
              folderGrouping={folderGrouping}
              folderDepth={folderDepth}
              onFolderDepthChange={changeFolderDepth}
              metrics={architectureMetrics}
              files={files}
              repositoryName={analysis?.repository ?? null}
              partial={analysis?.partial ?? false}
              onInspect={(id) =>
                navigateToFile(id, "map")
              }
              onAnalyzeImpact={(id) =>
                navigateToFile(id, "impact")
              }
              onFocusCycle={focusCycle}
            />

            <LanguageDistribution files={files} />

          </div>
        )}


        {/* FILE EXPLORER */}
        {activeView === "files" && (
          <FileExplorer
            files={files}
            directories={
              analysis?.directories ?? []
            }
            selectedId={selectedId}
            onInspect={(id) =>
              navigateToFile(id, "map")
            }
            onImpact={(id) =>
              navigateToFile(id, "impact")
            }
          />
        )}

        {/* GRAPH AND INSPECTOR */}
        <div
          className={`flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] ${
            activeView === "overview" ||
            activeView === "files"
              ? "hidden"
              : "grid"
          }`}
        >

          <main className="flex min-w-0 flex-col p-5 lg:p-8">

            {/* GRAPH HEADER */}
            <div className="flex flex-wrap items-end justify-between gap-3">

              <div>
                <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#24cba7]">
                  01 / CARTOGRAPHER
                </div>

                <h1 className="text-2xl font-semibold tracking-tight lg:text-[30px]">
                  {activeView === "impact"
                    ? "Impact analysis"
                    : "Dependency graph"}
                </h1>

                <p className="mt-2 text-sm text-[#8297a8]">
                  Explore dependencies at module or file level.
                </p>

                {activeView === "impact" && (
                  <p className="mt-3 font-mono text-[11px] text-[#a0bdaf]">
                    {impact
                      ? `SOURCE: ${impact.selectedId} · ${impact.direct.length} DIRECT · ${impact.indirect.length} INDIRECT`
                      : "SELECT A FILE TO ANALYZE IMPACT"}
                  </p>
                )}
              </div>

              {/* 2D / 3D */}
              <div className="flex rounded-lg border border-[#304453] bg-[#111d29] p-1">

                {(["2d", "3d"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`cursor-pointer rounded-md px-4 py-2 font-mono text-xs ${
                      viewMode === mode
                        ? "bg-[#1c6253] text-[#a4ffe4]"
                        : "text-[#829bad] hover:text-white"
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* ORIGINAL METRICS */}
            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                {
                  title: "FILES",
                  value: files.length,
                },
                {
                  title: "CONNECTIONS",
                  value: connections.length,
                },
                {
                  title: "CYCLE GROUPS",
                  value: architectureMetrics.cycleGroups.length,
                },
              ].map((metric) => (
                <div
                  key={metric.title}
                  className="rounded-lg border border-[#233140] bg-[#101925] p-4"
                >
                  <div className="font-mono text-[10px] tracking-wider text-[#7890a3]">
                    {metric.title}
                  </div>

                  <div className="mt-2 font-mono text-2xl text-[#e4f0f5]">
                    {metric.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* GRAPH SCALE */}
            <GraphScaleControls
              mode={graphMode}
              resolvedMode={resolvedGraphMode}
              totalFiles={files.length}
              totalConnections={connections.length}
              displayedFiles={
                graphProjection.graph.files.length
              }
              displayedConnections={
                graphProjection.graph.connections.length
              }
              maxAllFiles={MAX_GRAPH_NODES}
              expandedModules={expandedModules}
              canFocus={
                selectedId !== null ||
                focusFileId !== null
              }
              warning={graphWarning}
              onChangeMode={changeGraphMode}
              onCollapseAll={collapseAll}
              onCollapseModule={(id) => {
                setExpandedFolderIds((previous) =>
                  previous.filter((item) => item !== id)
                );
                setSelectedFolderId(null);
              }}
            />

            {/* FOLDER CONTROLS */}
            <FolderGraphControls
              grouping={folderGrouping}
              depth={folderDepth}
              selectedFolderId={selectedFolderId}
              colorByFolder={colorByFolder}
              onDepthChange={changeFolderDepth}
              onFolderChange={changeFolderSelection}
              onColorModeChange={setColorByFolder}
            />

            {/* INTERACTIVE CANVAS */}
            <div className="relative mt-5 min-h-[530px] flex-1 overflow-hidden rounded-xl border border-[#263442] bg-[#0a121c]">

              <div className="pointer-events-none absolute left-5 top-5 z-10 font-mono text-[10px] text-[#70889a]">
                ARCHITECTURE / {resolvedGraphMode.toUpperCase()}
              </div>

              {displayCycleIds !== null && (
                <div className="absolute right-5 top-5 z-20 flex items-center gap-3 rounded-lg border border-[#815637] bg-[#251d1a]/95 px-4 py-3 font-mono text-[10px] text-[#f4a261]">

                  CIRCULAR FOCUS ·{" "}
                  {focusedCycleIds?.length ?? 0} FILES

                  <button
                    type="button"
                    onClick={() =>
                      setFocusedCycleIndex(null)
                    }
                    className="cursor-pointer rounded border border-[#815637] px-2 py-1"
                  >
                    CLEAR
                  </button>
                </div>
              )}

              {/* EXISTING GRAPH COMPONENTS */}
              <div className="absolute inset-0">

                {viewMode === "3d" ? (
                  <RepoGraph3D
                    key={
                      analysis
                        ? `${analysis.repository}@${analysis.commitSha ?? analysis.branch}`
                        : "sample"
                    }
                    files={graphProjection.graph.files}
                    connections={
                      graphProjection.graph.connections
                    }
                    selectedId={displaySelectedId}
                    onSelect={handleGraphSelect}
                    impact={displayImpact}
                    cycleFocusIds={displayCycleIds}
                    folderGrouping={displayFolderGrouping}
                    visibleFolderIds={visibleGraphIds}
                    colorByFolder={colorByFolder}
                    labelFontSize={labelFontSize}
                    labelsVisible={labelsVisible}
                    onLabelFontSizeChange={setLabelFontSize}
                    onLabelsVisibleChange={setLabelsVisible}
                  />
                ) : (
                  <RepoGraph2D
                    key={
                      analysis
                        ? `${analysis.repository}@${analysis.commitSha ?? analysis.branch}`
                        : "sample"
                    }
                    files={graphProjection.graph.files}
                    connections={
                      graphProjection.graph.connections
                    }
                    selectedId={displaySelectedId}
                    onSelect={handleGraphSelect}
                    impact={displayImpact}
                    cycleFocusIds={displayCycleIds}
                    folderGrouping={displayFolderGrouping}
                    visibleFolderIds={visibleGraphIds}
                    colorByFolder={colorByFolder}
                  />
                )}
              </div>

              {/* COLOR LEGEND */}
              <div className="pointer-events-none absolute bottom-4 right-4 z-10 max-w-[180px] rounded-lg border border-[#263544] bg-[#101924]/95 px-4 py-3">

                <div className="mb-2 font-mono text-[10px] text-[#71899a]">
                  LEGEND
                </div>

                {(
                  colorByFolder
                    ? folderGrouping.groups
                        .slice(0, 6)
                        .map((group) => ({
                          color: getFolderColor(group.id),
                          label: group.path,
                        }))
                    : [
                        {
                          color: "#f2a36b",
                          label: "Entry point",
                        },
                        {
                          color: "#23d1ad",
                          label: "Module",
                        },
                        {
                          color: "#6ca9d9",
                          label: "Shared",
                        },
                      ]
                ).map(({ color, label }) => (
                  <div
                    key={label}
                    className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-[#a7b9c7]"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color }}
                    />

                    <span
                      className="truncate"
                      title={label}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 font-mono text-[10px] text-[#607587]">
              INTERACTIVE CANVAS / PAN · ZOOM · INSPECT
            </div>
          </main>

          {/* ORIGINAL FILE INSPECTOR */}
          <FileInspector
            selectedId={selectedId}
            files={files}
            connections={connections}
            repositoryName={analysis?.repository}
            onSelect={(id) =>
              navigateToFile(id, activeView === "impact" ? "impact" : "map")
            }
            impact={impact}
            onAnalyzeImpact={(id) =>
              navigateToFile(id, "impact")
            }
            onClearImpact={() =>
              setImpactSourceId(null)
            }
          />
        </div>
      </div>
    </div>
  );
}
