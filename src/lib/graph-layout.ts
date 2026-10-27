
import dagre from "@dagrejs/dagre";
import type { Edge } from "@xyflow/react";
import type { RepoFileNode } from "@/components/graph/RepoFileNode";

export function layoutGraph(
  nodes: RepoFileNode[],
  edges: Edge[]
): RepoFileNode[] {
  const graph = new dagre.graphlib.Graph();

  graph.setGraph({
    rankdir: "LR",
    nodesep: 55,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  graph.setDefaultEdgeLabel(() => ({}));

  // Registrar cada archivo con su tamaño real
  for (const node of nodes) {
    graph.setNode(node.id, {
      width: node.data.size,
      height: node.data.size,
    });
  }

  // Registrar las dependencias
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  // Calcular las posiciones automáticamente
  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);

    return {
      ...node,
      position: {
        x: position.x - node.data.size / 2,
        y: position.y - node.data.size / 2,
      },
    };
  });
}
