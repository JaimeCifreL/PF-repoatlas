
"use client";

import { useMemo } from "react";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";

import type {
  TimeMachineReport,
  FileChangeKind,
} from "../../lib/time-machine/compare";

export type TimeMachinePhase =
  | "before"
  | "diff"
  | "after";

type Props = {
  report: TimeMachineReport;
  phase: TimeMachinePhase;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
};

const MAX_NODES = 140;
const MAX_EDGES = 450;

const COLORS = {
  added: "#48DDB0",
  removed: "#F08088",
  modified: "#E7B266",
  unchanged: "#708B9D",
};

const BACKGROUNDS = {
  added: "#103B32",
  removed: "#3A2029",
  modified: "#382D20",
  unchanged: "#13212D",
};

function edgeKey(
  source: string,
  target: string
) {
  return JSON.stringify([source, target]);
}

export function TimeMachineGraph({
  report,
  phase,
  selectedPath,
  onSelect,
}: Props) {
  const model = useMemo(() => {
    const beforeFiles = new Map(
      report.before.files.map(
        (file) => [file.path, file]
      )
    );

    const afterFiles = new Map(
      report.after.files.map(
        (file) => [file.path, file]
      )
    );

    const changes = new Map<
      string,
      FileChangeKind
    >(
      report.fileChanges.map(
        (item) => [item.path, item.change]
      )
    );

    const beforeEdges = new Set(
      report.before.connections.map(
        ([source, target]) =>
          edgeKey(source, target)
      )
    );

    const afterEdges = new Set(
      report.after.connections.map(
        ([source, target]) =>
          edgeKey(source, target)
      )
    );

    const allEdges = new Map<
      string,
      readonly [string, string]
    >();

    for (
      const connection of [
        ...report.before.connections,
        ...report.after.connections,
      ]
    ) {
      allEdges.set(
        edgeKey(
          connection[0],
          connection[1]
        ),
        connection
      );
    }

    // First show changed files and changed-link endpoints.
    const priority = new Set<string>();

    for (const file of report.fileChanges) {
      priority.add(file.path);
    }

    for (const link of report.connectionChanges) {
      priority.add(link.source);
      priority.add(link.target);
    }

    // If there are no changes, show a sample of the
    // existing architecture rather than an empty canvas.
    if (priority.size === 0) {
      for (const file of report.after.files.slice(0, 60)) {
        priority.add(file.path);
      }
    }

    // Include one-hop neighbors when capacity permits.
    const neighbors = new Set<string>();

    for (const [source, target] of allEdges.values()) {
      if (priority.has(source)) {
        neighbors.add(target);
      }

      if (priority.has(target)) {
        neighbors.add(source);
      }
    }

    const selected = [
      ...[...priority].sort(),
      ...[...neighbors]
        .filter((id) => !priority.has(id))
        .sort(),
    ].slice(0, MAX_NODES);

    const included = new Set(selected);

    // Stable positions shared by BEFORE, CHANGES and AFTER.
    const positions = new Map<
      string,
      { x: number; y: number }
    >();

    const groups = new Map<string, string[]>();

    for (const id of selected) {
      const group = id.split("/")[0] || "root";

      if (!groups.has(group)) {
        groups.set(group, []);
      }

      groups.get(group)?.push(id);
    }

    let currentY = 0;

    for (
      const group of [...groups.keys()].sort()
    ) {
      const paths = groups.get(group) ?? [];

      paths.sort();

      for (let i = 0; i < paths.length; i++) {
        const file = paths[i];

        positions.set(file, {
          x: (i % 4) * 260,
          y: currentY + Math.floor(i / 4) * 100,
        });
      }

      currentY +=
        Math.ceil(paths.length / 4) * 100 + 90;
    }

    return {
      beforeFiles,
      afterFiles,
      changes,
      beforeEdges,
      afterEdges,
      allEdges,
      selected,
      included,
      positions,
      truncated:
        priority.size + neighbors.size > MAX_NODES,
    };
  }, [report]);

  const nodes = useMemo<Node[]>(() => {
    return model.selected
      .filter((id) => {
        if (phase === "before") {
          return model.beforeFiles.has(id);
        }

        if (phase === "after") {
          return model.afterFiles.has(id);
        }

        return true;
      })
      .map((id) => {
        const file =
          model.afterFiles.get(id) ??
          model.beforeFiles.get(id);

        const status =
          model.changes.get(id) ?? "unchanged";

        const color = COLORS[status];

        const selected = selectedPath === id;

        return {
          id,
          type: "default",
          position:
            model.positions.get(id) ?? {
              x: 0,
              y: 0,
            },

          data: {
            label: (
              <div className="min-w-0 text-left">
                <div className="truncate font-mono text-[11px] font-semibold">
                  {file?.name ?? id}
                </div>

                <div className="mt-1 truncate font-mono text-[9px] opacity-70">
                  {id}
                </div>
              </div>
            ),
          },

          style: {
            width: 225,
            minHeight: 57,
            borderRadius: 10,
            padding: 9,
            background: BACKGROUNDS[status],
            border: `${selected ? 3 : 1.5}px solid ${color}`,
            boxShadow: selected
              ? `0 0 18px ${color}55`
              : "none",
            color: "#E6F2F6",
            fontSize: 11,
          },
        };
      });
  }, [
    model,
    phase,
    selectedPath,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const visible = new Set(
      nodes.map((node) => node.id)
    );

    const output: Edge[] = [];

    for (
      const [key, [source, target]]
      of model.allEdges
    ) {
      if (
        !visible.has(source) ||
        !visible.has(target)
      ) {
        continue;
      }

      const existedBefore =
        model.beforeEdges.has(key);

      const existsAfter =
        model.afterEdges.has(key);

      if (
        phase === "before" &&
        !existedBefore
      ) {
        continue;
      }

      if (
        phase === "after" &&
        !existsAfter
      ) {
        continue;
      }

      const added =
        !existedBefore && existsAfter;

      const removed =
        existedBefore && !existsAfter;

      const color = added
        ? COLORS.added
        : removed
          ? COLORS.removed
          : "#40576A";

      output.push({
        id: key,
        source,
        target,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: color,
          strokeWidth:
            added || removed ? 2.5 : 1.2,
          strokeDasharray:
            removed ? "6 5" : undefined,
          opacity:
            added || removed ? 1 : 0.55,
        },
      });

      if (output.length >= MAX_EDGES) {
        break;
      }
    }

    return output;
  }, [model, nodes, phase]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-xl border border-[#293B4B] bg-[#0A121C]">

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) =>
          onSelect(node.id)
        }
        onPaneClick={() =>
          onSelect(null)
        }
        nodesDraggable={false}
        nodesConnectable={false}
        onlyRenderVisibleElements
        fitView
        fitViewOptions={{
          padding: 0.25,
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

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded border border-[#304453] bg-[#101A27]/95 px-3 py-2 font-mono text-[10px] text-[#9BB4C2]">
        {phase.toUpperCase()} / ARCHITECTURE
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded border border-[#304453] bg-[#101A27]/95 px-3 py-2 font-mono text-[10px] text-[#91A9B8]">
        {nodes.length} NODES · {edges.length} EDGES
      </div>

      {model.truncated && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 max-w-[240px] rounded border border-[#745734] bg-[#30241A]/95 px-3 py-2 text-[11px] text-[#F0C28E]">
          Large comparison: only the first {MAX_NODES} relevant
          nodes are shown. The change lists remain complete.
        </div>
      )}
    </div>
  );
}
