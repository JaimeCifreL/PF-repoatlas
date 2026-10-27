"use client";

import { useState } from "react";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/Sidebar";
const RepoGraph3D = dynamic(
  () => import("@/components/graph/RepoGraph3D"),
  { ssr: false }
);
import { RepoGraph2D } from "@/components/graph/RepoGraph2D";

import { RepositorySearch } from "@/components/repository/RepositorySearch";
import {
  files as sampleFiles,
  connections as sampleConnections,
} from "@/lib/sample-repository";
import { FileInspector } from "@/components/inspector/FileInspector";
import type { AnalysisResult } from "@/lib/github-analyzer";


export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>("graph");

  const [repositoryUrl, setRepositoryUrl] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const files = analysis?.files ?? sampleFiles;
  const connections = analysis?.connections ?? sampleConnections;
  
  

  async function handleAnalyze() {
    if (!repositoryUrl.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch(
        `/api/analyze?url=${encodeURIComponent(repositoryUrl.trim())}`
      );

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          payload !== null &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `Error HTTP ${response.status}`;

        throw new Error(message);
      }

      const result = payload as AnalysisResult;

      setAnalysis(result);
      setSelectedId(null);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "No se pudo analizar el repositorio."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");



  return (
    <div className="min-h-screen bg-[#080d14] text-[#e8eef5] lg:flex">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* TOP BAR */}
        <header className="flex min-h-[74px] items-center justify-between gap-3 border-b border-[#1d2b38] px-5 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-[#778d9e]">
            <span>WORKSPACE</span>
            <span>/</span>
            <span className="text-[#d0e0e9]">DEPENDENCY MAP</span>
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
              
              <div className="flex rounded-lg border border-[#304453] bg-[#111d29] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  className={`cursor-pointer rounded-md px-4 py-2 font-mono text-xs ${
                    viewMode === "2d"
                      ? "bg-[#1c6253] text-[#a4ffe4]"
                      : "text-[#829bad] hover:text-white"
                  }`}
                >
                  2D
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={`cursor-pointer rounded-md px-4 py-2 font-mono text-xs ${
                    viewMode === "3d"
                      ? "bg-[#1c6253] text-[#a4ffe4]"
                      : "text-[#829bad] hover:text-white"
                  }`}
                >
                  3D
                </button>
              </div>

            </div>

            {/* REPOSITORY SEARCH */}
            <RepositorySearch
              repositoryUrl={repositoryUrl}
              onUrlChange={setRepositoryUrl}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              analysisError={analysisError}
              analysis={analysis}
            />

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
                {viewMode === "3d" ? (
                  <RepoGraph3D
                    key={analysis?.repository ?? "sample"}
                    files={files}
                    connections={connections}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ) : (
                  
                  <RepoGraph2D
                    key={analysis?.repository ?? "sample"}
                    files={files}
                    connections={connections}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />

                )}
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

          
          {/* FILE INSPECTOR */}
          <FileInspector
            selectedId={selectedId}
            files={files}
            connections={connections}
            repositoryName={analysis?.repository}
            onSelect={setSelectedId}
          />

        </div>
      </div>
    </div>
  );
}
