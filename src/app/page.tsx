
"use client";

import { useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import {
  GitBranch,
  Network,
  LayoutDashboard,
  FolderTree,
  Activity,
  FileCode2,
  ArrowUpRight,
} from "lucide-react";

// Datos ficticios para desarrollar la interfaz.
const files = [
  { id: "page", name: "page.tsx", path: "src/app/page.tsx", x: 0, y: 180, kind: "entry" },
  { id: "shell", name: "AppShell.tsx", path: "src/components/AppShell.tsx", x: 210, y: 30, kind: "feature" },
  { id: "graph", name: "GraphCanvas.tsx", path: "src/components/GraphCanvas.tsx", x: 210, y: 170, kind: "feature" },
  { id: "search", name: "RepositorySearch.tsx", path: "src/components/RepositorySearch.tsx", x: 210, y: 310, kind: "feature" },
  { id: "sidebar", name: "Sidebar.tsx", path: "src/components/Sidebar.tsx", x: 420, y: -40, kind: "feature" },
  { id: "inspector", name: "Inspector.tsx", path: "src/components/Inspector.tsx", x: 420, y: 100, kind: "feature" },
  { id: "analyzer", name: "analyzer.ts", path: "src/lib/analyzer.ts", x: 420, y: 240, kind: "feature" },
  { id: "github", name: "github.ts", path: "src/lib/github.ts", x: 630, y: 340, kind: "shared" },
  { id: "types", name: "graph.ts", path: "src/types/graph.ts", x: 630, y: 200, kind: "shared" },
  { id: "theme", name: "tokens.ts", path: "src/styles/tokens.ts", x: 630, y: 40, kind: "shared" },
] as const;

const connections = [
  ["page", "shell"],
  ["page", "graph"],
  ["page", "search"],
  ["shell", "sidebar"],
  ["shell", "theme"],
  ["graph", "inspector"],
  ["graph", "analyzer"],
  ["graph", "types"],
  ["inspector", "types"],
  ["inspector", "theme"],
  ["sidebar", "theme"],
  ["search", "github"],
  ["search", "types"],
  ["analyzer", "github"],
  ["analyzer", "types"],
] as const;

const colors = {
  entry: "#f2a36b",
  feature: "#23d1ad",
  shared: "#6ca9d9",
};

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>("graph");

  const selectedFile = files.find((file) => file.id === selectedId);

  const imports = connections
    .filter(([source]) => source === selectedId)
    .map(([, target]) => files.find((file) => file.id === target)?.name);

  const dependents = connections
    .filter(([, target]) => target === selectedId)
    .map(([source]) => files.find((file) => file.id === source)?.name);

  const nodes: Node[] = files.map((file) => ({
    id: file.id,
    position: { x: file.x, y: file.y },
    data: { label: file.name },
    style: {
      background: selectedId === file.id ? "#15362f" : "#111e2b",
      border: `1px solid ${
        selectedId === file.id ? "#53f5d4" : colors[file.kind]
      }`,
      boxShadow:
        selectedId === file.id
          ? "0 0 24px #23d1ad35"
          : "0 5px 20px #00000040",
      borderRadius: 8,
      color: "#eaf4f5",
      fontSize: 11,
      fontFamily: "monospace",
      padding: "12px 8px",
      width: 155,
    },
  }));

  const edges: Edge[] = connections.map(([source, target], index) => {
    const highlighted = source === selectedId || target === selectedId;

    return {
      id: `edge-${index}`,
      source,
      target,
      type: "smoothstep",
      animated: highlighted,
      style: {
        stroke: highlighted ? "#30e6c1" : "#365566",
        strokeWidth: highlighted ? 2 : 1.2,
        opacity: selectedId && !highlighted ? 0.35 : 0.9,
      },
    };
  });

  return (
    <div className="min-h-screen bg-[#080d14] text-[#e8eef5] lg:flex">

      {/* SIDEBAR */}
      <aside className="w-full border-b border-[#1d2b38] bg-[#0d1420] lg:min-h-screen lg:w-[235px] lg:shrink-0 lg:border-b-0 lg:border-r">

        <div className="flex h-[74px] items-center gap-3 border-b border-[#1d2b38] px-5">
          <div className="rounded-lg border border-[#147d70] bg-[#10312f] p-2">
            <GitBranch size={19} className="text-[#23d1ad]" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-widest">
              REPO<span className="text-[#23d1ad]">ATLAS</span>
            </div>
            <div className="text-[9px] tracking-[0.17em] text-[#71879a]">
              CODEBASE INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="px-3 py-7">
          <div className="mb-4 px-3 text-[10px] tracking-widest text-[#62778a]">
            WORKSPACE
          </div>

          <nav className="space-y-1">
            <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
              <LayoutDashboard size={17} />
              Overview
              <span className="ml-auto text-[9px]">SOON</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#185c57] bg-[#10312f] px-3 py-3 text-sm text-[#42e2bf]">
              <Network size={17} />
              Dependency map
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#42e2bf]" />
            </div>

            <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
              <Activity size={17} />
              Impact analysis
              <span className="ml-auto text-[9px]">SOON</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
              <FolderTree size={17} />
              File explorer
              <span className="ml-auto text-[9px]">SOON</span>
            </div>
          </nav>
        </div>

        <div className="mx-4 border-t border-[#253342] pt-6">
          <div className="text-[10px] tracking-widest text-[#62778a]">
            ENVIRONMENT
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-[#9db4c3]">
            <span className="h-2 w-2 rounded-full bg-[#23d1ad]" />
            Development mode
          </div>
          <div className="mt-2 font-mono text-[10px] text-[#597083]">
            v0.1.0 / LOCAL
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* TOP BAR */}
        <header className="flex min-h-[74px] items-center justify-between gap-3 border-b border-[#1d2b38] px-5 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-[#778d9e]">
            <span>WORKSPACE</span>
            <span>/</span>
            <span className="text-[#d0e0e9]">DEPENDENCY MAP</span>
          </div>
          <div className="rounded-md border border-[#27524c] bg-[#102922] px-3 py-1.5 text-[10px] tracking-wider text-[#45d9b6]">
            ● SAMPLE DATA
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">

          {/* GRAPH AREA */}
          <main className="flex min-w-0 flex-col p-5 lg:p-8">

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#24cba7]">
                  01 / CARTOGRAPHER
                </div>
                <h1 className="text-2xl font-semibold tracking-tight lg:text-[30px]">
                  Dependency graph
                </h1>
                <p className="mt-2 max-w-xl text-sm text-[#8297a8]">
                  Explore module connections and understand how
                  your codebase is structured.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#4ad6b8]">
                <span className="h-2 w-2 rounded-full bg-[#28d8ae]" />
                GRAPH READY
              </div>
            </div>

            {/* METRICS */}
            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                { title: "FILES", value: files.length.toString() },
                { title: "CONNECTIONS", value: connections.length.toString() },
                { title: "MODULE TYPES", value: "03" },
              ].map((metric) => (
                <div
                  key={metric.title}
                  className="rounded-lg border border-[#233140] bg-[#101925] p-4"
                >
                  <div className="font-mono text-[10px] tracking-wider text-[#7890a3]">
                    {metric.title}
                  </div>
                  <div className="mt-2 font-mono text-2xl text-[#e4f0f5]">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            {/* INTERACTIVE CANVAS */}
            <div className="relative mt-5 min-h-[530px] flex-1 overflow-hidden rounded-xl border border-[#263442] bg-[#0a121c]">

              <div className="pointer-events-none absolute left-5 top-5 z-10">
                <div className="text-[10px] tracking-widest text-[#70889a]">
                  ARCHITECTURE / FILE LEVEL
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#4e6979]">
                  Select a node to inspect connections
                </div>
              </div>

              <div className="absolute inset-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={(_, node) => setSelectedId(node.id)}
                  onPaneClick={() => setSelectedId(null)}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  minZoom={0.3}
                  maxZoom={2}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    color="#263747"
                    gap={24}
                    size={1}
                  />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>

              <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-lg border border-[#263544] bg-[#101924]/95 px-4 py-3">
                <div className="mb-2 font-mono text-[10px] text-[#71899a]">
                  LEGEND
                </div>
                {[
                  ["#f2a36b", "Entry point"],
                  ["#23d1ad", "Module"],
                  ["#6ca9d9", "Shared"],
                ].map(([color, label]) => (
                  <div key={label} className="mt-1 flex items-center gap-2 text-[11px] text-[#a7b9c7]">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-[#607587]">
              <span className="text-[#23d1ad]">●</span>
              INTERACTIVE CANVAS
              <span className="mx-2">/</span>
              PAN · ZOOM · INSPECT
            </div>
          </main>

          {/* INSPECTOR */}
          <aside className="border-t border-[#263442] bg-[#0c1420] p-5 xl:border-l xl:border-t-0">

            <div className="mb-6 flex items-center justify-between border-b border-[#243342] pb-4">
              <div className="font-mono text-[11px] tracking-widest text-[#90a7b7]">
                FILE INSPECTOR
              </div>
              <FileCode2 size={17} className="text-[#658093]" />
            </div>

            {selectedFile ? (
              <div>
                <div className="mb-4 inline-flex rounded-md border border-[#195b52] bg-[#12332d] px-2 py-1 font-mono text-[10px] text-[#49ddbd]">
                  SELECTED NODE
                </div>

                <h2 className="break-all font-mono text-lg font-semibold text-[#eaf4f5]">
                  {selectedFile.name}
                </h2>

                <div className="mt-2 break-all font-mono text-[11px] leading-relaxed text-[#738c9d]">
                  {selectedFile.path}
                </div>

                <div className="my-6 h-px bg-[#263443]" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#263443] bg-[#111d2a] p-3">
                    <div className="font-mono text-[10px] text-[#7990a2]">
                      IMPORTS
                    </div>
                    <div className="mt-2 font-mono text-xl text-[#2cdbb7]">
                      {imports.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#263443] bg-[#111d2a] p-3">
                    <div className="font-mono text-[10px] text-[#7990a2]">
                      DEPENDENTS
                    </div>
                    <div className="mt-2 font-mono text-xl text-[#e5b06a]">
                      {dependents.length}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-3 font-mono text-[11px] tracking-wider text-[#89a1b3]">
                    DIRECT IMPORTS
                  </h3>
                  {imports.length ? imports.map((name) => (
                    <div key={name} className="mb-2 flex items-center gap-2 rounded border border-[#243442] bg-[#111d29] px-3 py-2 font-mono text-[11px] text-[#bed1db]">
                      <ArrowUpRight size={13} className="shrink-0 text-[#2bdbb3]" />
                      <span className="break-all">{name}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-[#698092]">No direct imports.</p>
                  )}
                </div>

                <div className="mt-7">
                  <h3 className="mb-3 font-mono text-[11px] tracking-wider text-[#89a1b3]">
                    REFERENCED BY
                  </h3>
                  {dependents.length ? dependents.map((name) => (
                    <div key={name} className="mb-2 flex items-center gap-2 rounded border border-[#243442] bg-[#111d29] px-3 py-2 font-mono text-[11px] text-[#bed1db]">
                      <GitBranch size={13} className="shrink-0 text-[#e4a66d]" />
                      <span className="break-all">{name}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-[#698092]">No incoming references.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#304455] p-6 text-center text-sm text-[#7890a2]">
                Select a file on the graph to inspect its connections.
              </div>
            )}

            <div className="mt-8 border-t border-[#263443] pt-5 font-mono text-[10px] leading-relaxed text-[#61798b]">
              PREVIEW BUILD — Relationships currently use sample data.
              GitHub repository analysis will be added later.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
