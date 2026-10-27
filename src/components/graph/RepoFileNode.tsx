
"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import { FileCode2 } from "lucide-react";

export type RepoFileNode = Node<
  {
    label: string;
    color: string;
    size: number;
    degree: number;
    isSelected: boolean;
    isRelated: boolean;
  },
  "repoFile"
>;

export default function RepoFileNodeView({
  data,
}: NodeProps<RepoFileNode>) {
  const {
    label,
    color,
    size,
    degree,
    isSelected,
    isRelated,
  } = data;

  return (
    <div
      className="group relative flex items-center justify-center transition-opacity duration-200"
      style={{
        width: size,
        height: size,
        opacity: isRelated ? 1 : 0.35,
      }}
      title={label}
    >
      {/* Invisible connection points */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Outer halo */}
      <div
        className="pointer-events-none absolute -inset-2 rounded-full border transition-all duration-200"
        style={{
          borderColor: isSelected
            ? `${color}99`
            : `${color}22`,
          boxShadow: isSelected
            ? `0 0 30px ${color}40`
            : "none",
        }}
      />

      {/* Main node */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center rounded-full border-2 transition-all duration-200"
        style={{
          borderColor: isSelected ? "#a2ffe7" : color,
          background:
            "radial-gradient(circle at 35% 25%, #203849 0%, #111e2a 75%)",
          boxShadow: isSelected
            ? `0 0 35px ${color}45, inset 0 0 20px #00000055`
            : "0 8px 25px #00000065",
        }}
      >
        {/* Node status light */}
        <div
          className="absolute right-[16%] top-[17%] h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 9px ${color}`,
          }}
        />

        {/* File icon */}
        <FileCode2
          size={21}
          strokeWidth={1.5}
          style={{ color }}
        />

        {/* Connection count */}
        <div className="mt-2 font-mono text-[14px] font-semibold leading-none text-[#eaf5f7]">
          {degree}
        </div>

        <div className="mt-1 font-mono text-[8px] tracking-[0.12em] text-[#7792a5]">
          LINKS
        </div>
      </div>

      {/* File name */}
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] w-[190px] -translate-x-1/2 text-center">
        <div
          className="mx-auto w-fit max-w-full truncate rounded-md border bg-[#0d1925]/95 px-2 py-1.5 font-mono text-[10px] font-medium"
          style={{
            borderColor: isSelected
              ? `${color}77`
              : "#253a4a",
            color: isSelected
              ? "#eafff8"
              : "#a8c0ce",
          }}
        >
          {label}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}
