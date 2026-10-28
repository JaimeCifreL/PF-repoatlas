
"use client";

import { FolderTree } from "lucide-react";

import type {
  FolderDepth,
  FolderGrouping,
} from "@/lib/folder-groups";

type Props = {
  grouping: FolderGrouping;
  depth: FolderDepth;
  selectedFolderId: string | null;
  colorByFolder: boolean;
  onDepthChange: (depth: FolderDepth) => void;
  onFolderChange: (id: string | null) => void;
  onColorModeChange: (enabled: boolean) => void;
};

export function FolderGraphControls({
  grouping,
  depth,
  selectedFolderId,
  colorByFolder,
  onDepthChange,
  onFolderChange,
  onColorModeChange,
}: Props) {
  const selected = grouping.groups.find(
    (group) => group.id === selectedFolderId
  );

  const visibleCount =
    selected?.fileCount ?? grouping.fileToGroup.size;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#294050] bg-[#101b28] p-3">

      <div className="flex items-center gap-2 px-2">
        <FolderTree size={16} className="text-[#32d9b4]" />

        <span className="font-mono text-[10px] tracking-wider text-[#99b1bf]">
          FOLDERS
        </span>
      </div>

      <div className="flex rounded-md border border-[#304453] bg-[#0b1520] p-1">
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={depth === level}
            onClick={() => onDepthChange(level)}
            className={`cursor-pointer rounded px-3 py-2 font-mono text-[11px] ${
              depth === level
                ? "bg-[#1b6656] text-[#b0ffe7]"
                : "text-[#829bad] hover:text-white"
            }`}
          >
            L{level}
          </button>
        ))}
      </div>

      <select
        aria-label="Filter by folder"
        value={selectedFolderId ?? ""}
        onChange={(event) =>
          onFolderChange(event.target.value || null)
        }
        className="min-w-0 max-w-full flex-1 cursor-pointer rounded-md border border-[#304453] bg-[#0b1520] px-3 py-2 font-mono text-[11px] text-[#d5e8ee] outline-none focus:border-[#32d9b4] sm:min-w-[180px]"
      >
        <option value="">
          ALL FOLDERS ({grouping.groups.length})
        </option>

        {grouping.groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.path} ({group.fileCount})
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-pressed={colorByFolder}
        onClick={() => onColorModeChange(!colorByFolder)}
        className={`cursor-pointer rounded-md border px-3 py-2 font-mono text-[10px] ${
          colorByFolder
            ? "border-[#2a947b] bg-[#15483d] text-[#a7ffe0]"
            : "border-[#304453] bg-[#0b1520] text-[#8ba3b5]"
        }`}
      >
        COLOR BY FOLDER
      </button>

      <div className="px-2 font-mono text-[10px] text-[#718c9e]">
        {visibleCount} / {grouping.fileToGroup.size} FILES
      </div>
    </div>
  );
}
