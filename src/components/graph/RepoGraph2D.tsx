
"use client";

import {
  memo,
  useMemo,
} from "react";

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

import {
  layoutGraph,
} from "../../lib/graph-layout";

import {
  connectionKey,
  type ImpactResult,
} from "../../lib/graph-impact";

import type {
  RepoFile,
  RepoConnection,
} from "../../types/repository";

import type {
  FolderGrouping,
} from "../../lib/folder-groups";

import {
  getFolderColor,
} from "../../lib/folder-visuals";

type Props = {
  files: readonly RepoFile[];
  connections: readonly RepoConnection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  impact: ImpactResult | null;
  cycleFocusIds: readonly string[] | null;
  folderGrouping: FolderGrouping;
  visibleFolderIds: ReadonlySet<string> | null;
  colorByFolder: boolean;
};

// Stable, memoized React Flow node component.
const MemoFileNode = memo(RepoFileNodeView);

const nodeTypes = {
  repoFile: MemoFileNode,
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
  cycleFocusIds,
  folderGrouping,
  visibleFolderIds,
  colorByFolder,
}: Props) {

  const cycleSet = useMemo(
    () => new Set(cycleFocusIds ?? []),
    [cycleFocusIds]
  );

  // Build nodes only when the graph structure changes.
  const baseNodes = useMemo<RepoFileNode[]>(() => {
    const degrees = new Map<string, number>();

    for (const file of files) {
      degrees.set(file.id, 0);
    }

    for (const [source, target] of connections) {
      if (degrees.has(source)) {
        degrees.set(
          source,
          (degrees.get(source) ?? 0) + 1
        );
      }

      if (degrees.has(target)) {
        degrees.set(
          target,
          (degrees.get(target) ?? 0) + 1
        );
      }
    }

    return files.map((file) => {
      const degree = degrees.get(file.id) ?? 0;
      const size =
        84 + Math.min(degree, 5) * 10;

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

  const baseEdges = useMemo<Edge[]>(() => {
    return connections.map(([source, target]) => ({
      id: connectionKey(source, target),
      source,
      target,
      type: "default",
    }));
  }, [connections]);

  // Do not recalculate layout when selecting a node.
  const positionedNodes = useMemo(
    () => layoutGraph(baseNodes, baseEdges),
    [baseNodes, baseEdges]
  );

  const relatedIds = useMemo(() => {
    const related = new Set<string>();

    if (!selectedId) {
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

  // Appearance changes do not affect the layout.
  const nodes = useMemo<RepoFileNode[]>(() => {
    return positionedNodes.map((node) => {
      const inCycle = cycleSet.has(node.id);

      let impactLevel:
        | "source"
        | "direct"
        | "indirect"
        | null = null;

      if (impact && cycleFocusIds === null) {
        if (node.id === impact.selectedId) {
          impactLevel = "source";
        } else if (
          impact.depthById.get(node.id) === 1
        ) {
          impactLevel = "direct";
        } else if (
          impact.depthById.has(node.id)
        ) {
          impactLevel = "indirect";
        }
      }

      const related =
        cycleFocusIds !== null
          ? inCycle
          : impact
            ? impactLevel !== null
            : selectedId === null ||
              relatedIds.has(node.id);

      const hidden =
        visibleFolderIds !== null &&
        !visibleFolderIds.has(node.id);

      const folderId =
        folderGrouping.fileToGroup.get(node.id) ??
        "folder:.";

      return {
        ...node,
        hidden,
        data: {
          ...node.data,
          color: colorByFolder
            ? getFolderColor(folderId)
            : node.data.color,
          isSelected:
            node.id === selectedId,
          isRelated: related,
          impactLevel,
          cycleHighlighted: inCycle,
        },
      };
    });
  }, [
    positionedNodes,
    cycleSet,
    cycleFocusIds,
    impact,
    selectedId,
    relatedIds,
    visibleFolderIds,
    folderGrouping,
    colorByFolder,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const allowAnimation =
      baseEdges.length < 100;

    return baseEdges.map((edge) => {
      const hidden =
        visibleFolderIds !== null &&
        (
          !visibleFolderIds.has(edge.source) ||
          !visibleFolderIds.has(edge.target)
        );

      // Circular-dependency focus.
      if (cycleFocusIds !== null) {
        const highlighted =
          cycleSet.has(edge.source) &&
          cycleSet.has(edge.target);

        return {
          ...edge,
          hidden,
          animated: false,
          style: {
            stroke: highlighted
              ? "#f4a261"
              : "#293947",
            strokeWidth: highlighted
              ? 2.8
              : 0.8,
            opacity: highlighted
              ? 1
              : 0.12,
          },
        };
      }

      // Impact-analysis focus.
      if (impact) {
        const highlighted =
          impact.highlightedEdges.has(
            connectionKey(
              edge.source,
              edge.target
            )
          );

        const depth =
          impact.depthById.get(edge.source);

        return {
          ...edge,
          hidden,
          animated: false,
          style: {
            stroke: highlighted
              ? depth === 1
                ? "#eda65d"
                : "#ae92f1"
              : "#293947",
            strokeWidth: highlighted
              ? 2.7
              : 0.8,
            opacity: highlighted
              ? 1
              : 0.12,
          },
        };
      }

      const selectedConnection =
        edge.source === selectedId ||
        edge.target === selectedId;

      return {
        ...edge,
        hidden,
        animated:
          allowAnimation &&
          selectedConnection,
        style: {
          stroke: selectedConnection
            ? "#30e6c1"
            : "#365566",
          strokeWidth: selectedConnection
            ? 2
            : 1.2,
          opacity:
            selectedId !== null &&
            !selectedConnection
              ? 0.25
              : 0.9,
        },
      };
    });
  }, [
    baseEdges,
    selectedId,
    impact,
    cycleFocusIds,
    cycleSet,
    visibleFolderIds,
  ]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) =>
        onSelect(node.id)
      }
      onPaneClick={() =>
        onSelect(null)
      }
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      onlyRenderVisibleElements
      fitView
      fitViewOptions={{
        padding: 0.2,
      }}
      minZoom={0.05}
      maxZoom={2}
    >
      <Background
        variant={BackgroundVariant.Dots}
        color="#263747"
        gap={24}
        size={1}
      />

      <Controls showInteractive={false}/>
    </ReactFlow>
  );
}
