
"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  GitBranch,
  Network,
} from "lucide-react";

import type { ArchitectureMetrics } from "@/lib/graph-metrics";
import type { RepoFile } from "@/types/repository";

type Props = {
  metrics: ArchitectureMetrics;
  files: readonly RepoFile[];
  repositoryName: string | null;
  partial: boolean;
  onInspect: (id: string) => void;
  onAnalyzeImpact: (id: string) => void;
  onFocusCycle: (index: number) => void;
};

export function ArchitectureOverview({
  metrics,
  files,
  repositoryName,
  partial,
  onInspect,
  onAnalyzeImpact,
  onFocusCycle,
}: Props) {
  const fileById = new Map(
    files.map((file) => [file.id, file])
  );

  const isolated = [...metrics.byFile.values()]
    .filter((item) => item.isolated)
    .slice(0, 5);

  function getName(id: string) {
    return fileById.get(id)?.name ?? id;
  }

  const summary = [
    { label: "FILES", value: metrics.files },
    { label: "CONNECTIONS", value: metrics.connections },
    { label: "CIRCULAR GROUPS", value: metrics.cycleGroups.length },
    { label: "ISOLATED", value: metrics.isolatedFiles },
  ];

  return (
    <main className="flex-1 p-5 lg:p-8">

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#28d8b2]">
            00 / ARCHITECTURE INTELLIGENCE
          </div>

          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            Architecture overview
          </h1>

          <p className="mt-2 text-sm text-[#8297a8]">
            Structural metrics, dependency hotspots and potential issues.
          </p>
        </div>

        <div className="rounded-md border border-[#2c4a45] bg-[#102720] px-3 py-2 font-mono text-[10px] text-[#64d7b5]">
          {repositoryName ?? "SAMPLE GRAPH"}
        </div>
      </div>

      {partial && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#765b36] bg-[#30251a] p-3 text-xs text-[#e3bd7f]">
          <AlertTriangle size={15} />
          Partial analysis: some dependencies may be missing.
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((metric) => (
          <div
            key={metric.label}
            className="border-t border-[#385666] bg-[#101b28] px-4 py-5"
          >
            <div className="font-mono text-[10px] tracking-wider text-[#7792a3]">
              {metric.label}
            </div>

            <div className="mt-3 font-mono text-3xl text-[#e8f3f6]">
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-2">

        {/* HIGHEST IMPACT */}
        <section className="rounded-lg border border-[#263848] bg-[#0e1824] p-5">
          <div className="mb-2 flex items-center gap-3">
            <Activity size={17} className="text-[#e5a362]" />

            <h2 className="font-mono text-xs font-semibold tracking-wider">
              HIGHEST CHANGE IMPACT
            </h2>
          </div>

          <p className="mb-5 text-xs text-[#7891a2]">
            Files with the largest potential dependency reach.
          </p>

          <div className="space-y-2">
            {metrics.highestImpact.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAnalyzeImpact(item.id)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-md border border-[#253849] bg-[#121f2d] p-3 text-left hover:border-[#b77d50]"
              >
                <span className="w-6 font-mono text-xs text-[#6b8496]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="break-all font-mono text-xs text-[#d5e8ee]">
                    {getName(item.id)}
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-[#657f91]">
                    {item.id}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-lg text-[#e9a363]">
                    {item.totalImpact}
                  </div>
                  <div className="text-[9px] text-[#8e9fa8]">
                    REACH
                  </div>
                </div>

                <ArrowUpRight
                  size={14}
                  className="text-[#7892a2] group-hover:text-[#e9a363]"
                />
              </button>
            ))}

            {metrics.highestImpact.length === 0 && (
              <p className="py-5 text-xs text-[#7891a2]">
                No dependent files detected.
              </p>
            )}
          </div>
        </section>

        {/* MOST REFERENCED */}
        <section className="rounded-lg border border-[#263848] bg-[#0e1824] p-5">
          <div className="mb-2 flex items-center gap-3">
            <Network size={17} className="text-[#38dcb8]" />

            <h2 className="font-mono text-xs font-semibold tracking-wider">
              MOST REFERENCED FILES
            </h2>
          </div>

          <p className="mb-5 text-xs text-[#7891a2]">
            Files imported by the largest number of other files.
          </p>

          <div className="space-y-2">
            {metrics.mostReferenced.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onInspect(item.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-[#253849] bg-[#121f2d] p-3 text-left hover:border-[#278e79]"
              >
                <span className="w-6 font-mono text-xs text-[#6b8496]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="break-all font-mono text-xs text-[#d5e8ee]">
                    {getName(item.id)}
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-[#657f91]">
                    {item.id}
                  </div>
                </div>

                <span className="font-mono text-lg text-[#38dcb8]">
                  {item.fanIn}
                </span>
              </button>
            ))}

            {metrics.mostReferenced.length === 0 && (
              <p className="py-5 text-xs text-[#7891a2]">
                No incoming references detected.
              </p>
            )}
          </div>
        </section>

        {/* CIRCULAR DEPENDENCIES */}
        <section className="rounded-lg border border-[#263848] bg-[#0e1824] p-5">
          <div className="mb-2 flex items-center gap-3">
            <AlertTriangle size={17} className="text-[#e9a363]" />

            <h2 className="font-mono text-xs font-semibold tracking-wider">
              CIRCULAR DEPENDENCY GROUPS
            </h2>
          </div>

          <p className="mb-5 text-xs text-[#7891a2]">
            Strongly connected groups requiring architectural review.
          </p>

          {metrics.cycleGroups.length === 0 ? (
            <div className="rounded-md border border-[#265344] bg-[#112921] p-4 font-mono text-xs text-[#61d9b6]">
              No circular groups detected.
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.cycleGroups.slice(0, 5).map((group, index) => (
                <button
                  key={group.join("|")}
                  type="button"
                  onClick={() => onFocusCycle(index)}
                  className="w-full cursor-pointer rounded-md border border-[#57422e] bg-[#281f1c] p-3 text-left hover:border-[#d39b59]"
                >
                  <div className="font-mono text-xs text-[#e9b681]">
                    GROUP {index + 1} · {group.length} FILES
                  </div>

                  <div className="mt-2 break-all font-mono text-[10px] leading-relaxed text-[#aab7bb]">
                    {group.map(getName).join(" · ")}
                  </div>
                </button>
              ))}

              {metrics.cycleGroups.length > 5 && (
                <p className="text-xs text-[#8297a8]">
                  Additional groups: {metrics.cycleGroups.length - 5}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ISOLATED FILES */}
        <section className="rounded-lg border border-[#263848] bg-[#0e1824] p-5">
          <div className="mb-2 flex items-center gap-3">
            <GitBranch size={17} className="text-[#72a8d8]" />

            <h2 className="font-mono text-xs font-semibold tracking-wider">
              ISOLATED FILES
            </h2>
          </div>

          <p className="mb-5 text-xs text-[#7891a2]">
            Files without resolved incoming or outgoing dependencies.
          </p>

          {isolated.length === 0 ? (
            <p className="py-4 font-mono text-xs text-[#8297a8]">
              No isolated files detected.
            </p>
          ) : (
            <div className="space-y-2">
              {isolated.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInspect(item.id)}
                  className="w-full cursor-pointer rounded-md border border-[#253849] bg-[#121f2d] p-3 text-left hover:border-[#638fb4]"
                >
                  <div className="break-all font-mono text-xs text-[#c3d7e1]">
                    {item.id}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 border-t border-[#263848] pt-4 font-mono text-[10px] text-[#687f91]">
        METRICS BASED ON RESOLVED STATIC DEPENDENCIES.
        NO QUALITY SCORE OR ERROR PROBABILITY IS IMPLIED.
      </div>
    </main>
  );
}
