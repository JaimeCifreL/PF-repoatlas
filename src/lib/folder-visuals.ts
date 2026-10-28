
import type { FolderGrouping } from "./folder-groups";

type ClusterNode = {
  id?: string | number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
};

type Center = {
  x: number;
  y: number;
  z: number;
};

/**
 * Color determinista para una carpeta.
 * Una misma ruta obtiene siempre el mismo color.
 */
export function getFolderColor(groupId: string): string {
  let hash = 0;

  for (let i = 0; i < groupId.length; i++) {
    hash = (Math.imul(hash, 31) + groupId.charCodeAt(i)) | 0;
  }

  const hue = (hash >>> 0) % 360;

  return `hsl(${hue}, 76%, 67%)`;
}

/**
 * Distribuye los centros de carpeta en una esfera.
 * Es determinista y no necesita generar números aleatorios.
 */
export function getFolderCenters(
  grouping: FolderGrouping
): ReadonlyMap<string, Center> {
  const centers = new Map<string, Center>();
  const count = grouping.groups.length;

  if (count === 1) {
    const only = grouping.groups[0];

    if (only) {
      centers.set(only.id, { x: 0, y: 0, z: 0 });
    }

    return centers;
  }

  const radius = Math.max(80, Math.sqrt(count) * 34);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  grouping.groups.forEach((group, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;

    centers.set(group.id, {
      x: Math.cos(angle) * ringRadius * radius,
      y: y * radius,
      z: Math.sin(angle) * ringRadius * radius,
    });
  });

  return centers;
}

/**
 * Fuerza que atrae cada archivo al centro de su carpeta.
 *
 * Se combina con las fuerzas de enlaces y repulsión
 * que ya utiliza react-force-graph-3d.
 */
export function createFolderClusterForce(
  grouping: FolderGrouping,
  strength = 0.035
) {
  let nodes: ClusterNode[] = [];

  const centers = getFolderCenters(grouping);

  const force = (alpha: number): void => {
    for (const node of nodes) {
      if (node.id === undefined) continue;

      const groupId = grouping.fileToGroup.get(
        String(node.id)
      );

      const center = groupId
        ? centers.get(groupId)
        : undefined;

      if (!center) continue;

      const amount = strength * alpha;

      node.vx =
        (node.vx ?? 0) +
        (center.x - (node.x ?? 0)) * amount;

      node.vy =
        (node.vy ?? 0) +
        (center.y - (node.y ?? 0)) * amount;

      node.vz =
        (node.vz ?? 0) +
        (center.z - (node.z ?? 0)) * amount;
    }
  };

  force.initialize = (nextNodes: ClusterNode[]): void => {
    nodes = nextNodes;
  };

  return force;
}
