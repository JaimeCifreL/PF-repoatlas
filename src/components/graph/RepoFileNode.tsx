"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

export type RepoFileNode = Node<
  {
    label: string;
    color: string;
    size: number;
    degree: number;
    isSelected: boolean;
    isRelated: boolean;
    impactLevel?: "source" | "direct" | "indirect" | null;
    cycleHighlighted?: boolean;
  },
  "repoFile"
>;

export default function RepoFileNodeView({
  data,
}: NodeProps<RepoFileNode>) {
    
    const impactColor =
      data.cycleHighlighted
        ? "#f4a261"
        : data.impactLevel === "source"
          ? "#31e0b9"
          : data.impactLevel === "direct"
            ? "#eda65d"
            : data.impactLevel === "indirect"
              ? "#ae92f1"
              : null;

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-full text-center transition-all duration-200"
      style={{
        
        width: data.size,
        height: data.size,
        
        background: impactColor
        ? "#172c36"
        : data.isSelected
            ? "#174338"
            : "#132431",

        border: `2px solid ${
        impactColor ??
        (data.isSelected ? "#94ffe5" : data.color)
        }`,

        boxShadow: impactColor
        ? `0 0 26px ${impactColor}40`
        : data.isSelected
            ? "0 0 0 6px #23d1ad15, 0 0 38px #23d1ad50"
            : "0 0 18px #00000060",

        opacity: data.isRelated ? 1 : 0.18,

        outline:
        data.isSelected && data.impactLevel !== "source"
            ? "2px solid #e0f5f6"
            : "none",

        outlineOffset: 3,

      }}
      title={data.label}
    >
      {/* Punto de entrada invisible */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Nombre del archivo */}
      <span className="max-w-[90%] break-all px-2 font-mono text-[10px] font-semibold leading-tight text-[#e8f4f3]">
        {data.label}
      </span>

      {/* Número de conexiones */}
      <span className="mt-2 font-mono text-[9px] text-[#82a2b1]">
        {data.degree} LINKS
      </span>

      {/* Punto de salida invisible */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}
