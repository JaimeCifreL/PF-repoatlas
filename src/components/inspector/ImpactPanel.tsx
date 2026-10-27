
"use client";

import {
  GitBranch,
  RotateCcw,
} from "lucide-react";

import {
  getImpactPath,
  type ImpactResult,
} from "@/lib/graph-impact";

type Props = {
  impact: ImpactResult;
  files: readonly { id: string; name: string }[];
  onSelect: (id: string) => void;
  onClear: () => void;
};

export function ImpactPanel({
  impact,
  files,
  onSelect,
  onClear,
}: Props) {
  const names = new Map(
    files.map((file) => [file.id, file.name])
  );

  const affected = [
    ...impact.direct.map((id) => ({
      id,
      depth: 1,
    })),
    ...impact.indirect.map((id) => ({
      id,
      depth: impact.depthById.get(id) ?? 2,
    })),
  ];

  return (
    <section className="mb-6 rounded-lg border border-[#375249] bg-[#10211f] p-4">

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch size={15} className="text-[#36dfb8]" />

          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#a4ffe1]">
            IMPACT ANALYSIS
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          title="Clear impact analysis"
          className="cursor-pointer rounded-md p-1 text-[#8da9a8] hover:bg-[#24423a] hover:text-white"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="mt-3 break-all font-mono text-[11px] text-[#bfd6d0]">
        SOURCE: {names.get(impact.selectedId) ?? impact.selectedId}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[#674832] bg-[#29221d] p-3">
          <div className="font-mono text-[9px] text-[#bca086]">
            DIRECT
          </div>

          <div className="mt-1 font-mono text-2xl text-[#eda65d]">
            {impact.direct.length}
          </div>
        </div>

        <div className="rounded-md border border-[#51456f] bg-[#211e30] p-3">
          <div className="font-mono text-[9px] text-[#b3a3d5]">
            INDIRECT
          </div>

          <div className="mt-1 font-mono text-2xl text-[#ae92f1]">
            {impact.indirect.length}
          </div>
        </div>
      </div>

      <div className="mt-5 font-mono text-[10px] tracking-wider text-[#91ada9]">
        POTENTIALLY AFFECTED FILES
      </div>

      {affected.length === 0 && (
        <p className="mt-3 text-xs leading-relaxed text-[#829a98]">
          No dependent files found in the analyzed graph.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {affected.slice(0, 8).map(({ id, depth }) => {
          const path = getImpactPath(impact, id)
            .map((fileId) => names.get(fileId) ?? fileId)
            .join(" → ");

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="w-full cursor-pointer rounded-md border border-[#30433f] bg-[#152723] px-3 py-2 text-left hover:border-[#4b8476]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="break-all font-mono text-[11px] text-[#d5e8e2]">
                  {names.get(id) ?? id}
                </span>

                <span
                  className={
                    depth === 1
                      ? "shrink-0 font-mono text-[10px] text-[#eda65d]"
                      : "shrink-0 font-mono text-[10px] text-[#ae92f1]"
                  }
                >
                  D{depth}
                </span>
              </div>

              <p className="mt-2 break-all text-[10px] leading-relaxed text-[#78948d]">
                {path}
              </p>
            </button>
          );
        })}
      </div>

      {affected.length > 8 && (
        <p className="mt-3 font-mono text-[10px] text-[#91a9a1]">
          + {affected.length - 8} more files highlighted in the graph
        </p>
      )}

      <p className="mt-4 border-t border-[#30433f] pt-3 text-[10px] leading-relaxed text-[#7c9690]">
        Potential impact based on resolved static dependencies.
      </p>
    </section>
  );
}
