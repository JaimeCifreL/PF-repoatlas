
"use client";

import { useMemo } from "react";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
} from "@xyflow/react";

import RepoFileNodeView, {
  type RepoFileNode,
} from "./RepoFileNode";

import { layoutGraph } from "@/lib/graph-layout";
import {
  connectionKey,
  type ImpactResult,
} from "@/lib/graph-impact";
import type {
  RepoFile,
  RepoConnection,
} from "@/types/repository";

type Props = {
  files: readonly RepoFile[];
  connections: readonly RepoConnection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  impact: ImpactResult | null;
};

const nodeTypes = {
  repoFile: RepoFileNodeView,
};

const COLORS: Record<RepoFile["kind"], string> = {
  entry: "#f2a36b",
  feature: "#23d1ad",
  shared: "#6ca9d9",
};

export function RepoGraph2D({
  files,
  connections,
  selectedId,
  onSelect,
  impact,
}: Props) {

  // 1. Calcular las conexiones de cada archivo.
  const baseNodes = useMemo<RepoFileNode[]>(() => {
    const degrees = new Map<string, number>();

    for (const file of files) {
      degrees.set(file.id, 0);
    }

    for (const [source, target] of connections) {
      if (degrees.has(source)) {
        degrees.set(source, (degrees.get(source) ?? 0) + 1);
      }

      if (degrees.has(target)) {
        degrees.set(target, (degrees.get(target) ?? 0) + 1);
      }
    }

    return files.map((file) => {
      const degree = degrees.get(file.id) ?? 0;
      const size = 84 + Math.min(degree, 5) * 10;

      return {
        id: file.id,
        type: "repoFile",
        position: { x: 0, y: 0 },
        data: {
          label: file.name,
          color: COLORS[file.kind],
          size,
          degree,
          isSelected: false,
          isRelated: true,
        },
      };
    });
  }, [files, connections]);

  // 2. Construir las conexiones originales.
  const baseEdges = useMemo<Edge[]>(() => {
    return connections.map(([source, target]) => ({
      id: `${source}->${target}`,
      source,
      target,
      type: "default",
    }));
  }, [connections]);

  // 3. Calcular el layout solo cuando cambie
  // la estructura del repositorio.
  const positionedNodes = useMemo(() => {
    return layoutGraph(baseNodes, baseEdges);
  }, [baseNodes, baseEdges]);

  // 4. Identificar los vecinos del archivo seleccionado.
  const relatedIds = useMemo(() => {
    const related = new Set<string>();

    if (selectedId === null) {
      return related;
    }

    related.add(selectedId);

    for (const [source, target] of connections) {
      if (source === selectedId) {
        related.add(target);
      }

      if (target === selectedId) {
        related.add(source);
      }
    }

    return related;
  }, [selectedId, connections]);

  // 5. Actualizar la apariencia sin cambiar posiciones.
  
    const nodes = useMemo<RepoFileNode[]>(() => {
    return positionedNodes.map((node) => {
        let impactLevel:
        | "source"
        | "direct"
        | "indirect"
        | null = null;

        if (impact) {
        if (node.id === impact.selectedId) {
            impactLevel = "source";
        } else if (impact.depthById.get(node.id) === 1) {
            impactLevel = "direct";
        } else if (impact.depthById.has(node.id)) {
            impactLevel = "indirect";
        }
        }

        return {
        ...node,
        data: {
            ...node.data,
            isSelected: node.id === selectedId,
            isRelated: impact
            ? impactLevel !== null
            : selectedId === null || relatedIds.has(node.id),
            impactLevel,
        },
        };
    });
    }, [positionedNodes, selectedId, relatedIds, impact]);


  // 6. Destacar las conexiones seleccionadas.
  
    const edges = useMemo<Edge[]>(() => {
    return baseEdges.map((edge) => {
        const selectedConnection =
        edge.source === selectedId ||
        edge.target === selectedId;

        if (impact) {
        const inImpactPath = impact.highlightedEdges.has(
            connectionKey(edge.source, edge.target)
        );

        const depth = impact.depthById.get(edge.source);

        return {
            ...edge,
            animated: false,
            style: {
            stroke: inImpactPath
                ? depth === 1
                ? "#eda65d"
                : "#ae92f1"
                : "#293947",
            strokeWidth: inImpactPath ? 2.7 : 0.8,
            opacity: inImpactPath ? 1 : 0.12,
            },
        };
        }

        return {
        ...edge,
        animated: selectedConnection,
        style: {
            stroke: selectedConnection ? "#30e6c1" : "#365566",
            strokeWidth: selectedConnection ? 2 : 1.2,
            opacity:
            selectedId !== null && !selectedConnection
                ? 0.25
                : 0.9,
        },
        };
    });
    }, [baseEdges, selectedId, impact]);


  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.05}
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
  );
}
