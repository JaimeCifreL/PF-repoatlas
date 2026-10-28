
"use client";

import { FolderTree } from "lucide-react";

import type {
  FolderDepth,
  FolderGrouping,
} from "@/lib/folder-groups";

type Props = {
  grouping: FolderGrouping;
  depth: FolderDepth;
  onDepthChange: (depth: FolderDepth) => void;
};

const levels: FolderDepth[] = [1, 2, 3];

export function FolderGroupsPanel({
  grouping,
  depth,
  onDepthChange,
}: Props) {
  const largest = Math.max(
    1,
    ...grouping.groups.map((group) => group.fileCount)
  );

  return (
    <section className="mt-6 rounded-lg border border-[#263848] bg-[#0e1824] p-5">

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FolderTree
              size={18}
              className="text-[#38dcb8]"
            />

            <h2 className="font-mono text-xs font-semibold tracking-wider">
              FOLDER STRUCTURE
            </h2>
          </div>

          <p className="mt-2 text-xs text-[#7891a2]">
            Module groups derived from repository paths.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-[#304453] bg-[#111d29] p-1">
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={depth === level}
              onClick={() => onDepthChange(level)}
              className={`cursor-pointer rounded px-3 py-2 font-mono text-[11px] ${
                depth === level
                  ? "bg-[#1c6253] text-[#a4ffe4]"
                  : "text-[#829bad] hover:text-white"
              }`}
            >
              L{level}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4 border-b border-[#293947] pb-4 font-mono text-[10px] text-[#8da9b7]">
        <span>
          GROUPS: {grouping.groups.length}
        </span>

        <span>
          CROSS-FOLDER DEPENDENCIES:{" "}
          {grouping.crossFolderConnections}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {grouping.groups.slice(0, 12).map((group) => (
          <div
            key={group.id}
            className="rounded-md border border-[#253849] bg-[#121f2d] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-all font-mono text-xs text-[#d8e9ee]">
                {group.path === "."
                  ? "/ (root)"
                  : group.path}
              </div>

              <span className="shrink-0 font-mono text-xs text-[#42dab5]">
                {group.fileCount}
              </span>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#263947]">
              <div
                className="h-full rounded-full bg-[#28c9a7]"
                style={{
                  width: `${
                    (group.fileCount / largest) * 100
                  }%`,
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-[#718b9b]">
              <span>
                INTERNAL: {group.internalConnections}
              </span>

              <span>
                IN: {group.incomingConnections}
              </span>

              <span>
                OUT: {group.outgoingConnections}
              </span>
            </div>
          </div>
        ))}
      </div>

      {grouping.groups.length === 0 && (
        <p className="mt-4 text-xs text-[#7891a2]">
          No files available.
        </p>
      )}

      {grouping.groups.length > 12 && (
        <p className="mt-4 font-mono text-[10px] text-[#7891a2]">
          {grouping.groups.length - 12} additional groups.
        </p>
      )}
    </section>
  );
}
