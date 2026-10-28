
"use client";

import {
  Layers3,
  Minimize2,
  Focus,
} from "lucide-react";

import type {
  GraphScaleMode,
  ResolvedGraphMode,
} from "../../lib/graph-aggregation";

type ExpandedModule = {
  id: string;
  path: string;
};

type Props = {
  mode: GraphScaleMode;
  resolvedMode: ResolvedGraphMode;
  totalFiles: number;
  totalConnections: number;
  displayedFiles: number;
  displayedConnections: number;
  maxAllFiles: number;
  expandedModules: readonly ExpandedModule[];
  canFocus: boolean;
  warning: string | null;

  onChangeMode: (mode: GraphScaleMode) => void;
  onCollapseAll: () => void;
  onCollapseModule: (id: string) => void;
};

const options: Array<{
  value: GraphScaleMode;
  label: string;
}> = [
  { value: "auto", label: "AUTO" },
  { value: "modules", label: "MODULES" },
  { value: "files", label: "ALL FILES" },
  { value: "focus", label: "FOCUS" },
];

export function GraphScaleControls({
  mode,
  resolvedMode,
  totalFiles,
  totalConnections,
  displayedFiles,
  displayedConnections,
  maxAllFiles,
  expandedModules,
  canFocus,
  warning,
  onChangeMode,
  onCollapseAll,
  onCollapseModule,
}: Props) {
  return (
    <section className="mt-4 rounded-lg border border-[#294050] bg-[#101b28] p-4">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div className="flex items-center gap-2">
          <Layers3
            size={16}
            className="text-[#38dcb8]"
          />

          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#c2dbe4]">
            GRAPH DETAIL
          </span>
        </div>

        <div className="flex flex-wrap gap-1 rounded-md border border-[#304453] bg-[#0b1520] p-1">

          {options.map((option) => {
            const disabled =
              (option.value === "files" &&
                totalFiles > maxAllFiles) ||
              (option.value === "focus" &&
                !canFocus);

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={mode === option.value}
                onClick={() =>
                  onChangeMode(option.value)
                }
                title={
                  disabled
                    ? option.value === "files"
                      ? "Use modules or focus for large repositories"
                      : "Select a file first"
                    : option.label
                }
                className={`cursor-pointer rounded px-3 py-2 font-mono text-[10px] disabled:cursor-not-allowed disabled:opacity-35 ${
                  mode === option.value
                    ? "bg-[#1c6253] text-[#a4ffe4]"
                    : "text-[#829bad] hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] text-[#8aa4b4]">
        <span>
          MODE: {resolvedMode.toUpperCase()}
        </span>

        <span>
          NODES: {displayedFiles.toLocaleString()} /
          {" "}{totalFiles.toLocaleString()}
        </span>

        <span>
          EDGES: {displayedConnections.toLocaleString()} /
          {" "}{totalConnections.toLocaleString()}
        </span>
      </div>

      {resolvedMode === "modules" && (
        <div className="mt-3 border-t border-[#293947] pt-3">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-[#7996a5]">
              CLICK A MODULE TO EXPAND IT
            </span>

            {expandedModules.length > 0 && (
              <button
                type="button"
                onClick={onCollapseAll}
                className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-[#43d8b6]"
              >
                <Minimize2 size={13}/>
                COLLAPSE ALL
              </button>
            )}
          </div>

          {expandedModules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {expandedModules.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  title={`Collapse ${group.path}`}
                  onClick={() =>
                    onCollapseModule(group.id)
                  }
                  className="cursor-pointer rounded border border-[#375968] bg-[#162c37] px-3 py-2 font-mono text-[10px] text-[#b7d5df]"
                >
                  {group.path} ×
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {resolvedMode === "focus" && (
        <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-[#83a0b0]">
          <Focus size={13}/>
          SELECTED FILE AND NEARBY DEPENDENCIES
        </div>
      )}

      {warning && (
        <p
          role="status"
          className="mt-3 text-xs leading-relaxed text-[#e6b77b]"
        >
          {warning}
        </p>
      )}
    </section>
  );
}
