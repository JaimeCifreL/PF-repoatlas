
import { describe, expect, it } from "vitest";

import { buildFolderGrouping } from "./folder-groups";

import {
  createFolderClusterForce,
  getFolderCenters,
  getFolderColor,
} from "./folder-visuals";

const grouping = buildFolderGrouping(
  {
    files: [
      {
        id: "A",
        name: "A.tsx",
        path: "src/components/A.tsx",
        kind: "feature",
      },
      {
        id: "B",
        name: "B.ts",
        path: "src/lib/B.ts",
        kind: "shared",
      },
    ],
    connections: [],
  },
  2
);

describe("RepoAtlas - Folder Constellations", () => {
  it("genera colores estables", () => {
    expect(getFolderColor("folder:src/lib")).toBe(
      getFolderColor("folder:src/lib")
    );
  });

  it("genera un centro para cada grupo", () => {
    const centers = getFolderCenters(grouping);

    expect(centers.size).toBe(2);

    for (const group of grouping.groups) {
      expect(centers.has(group.id)).toBe(true);
    }
  });

  it("atrae archivos de distintos grupos hacia centros distintos", () => {
    const force = createFolderClusterForce(grouping);

    const nodes = [
      { id: "A", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
      { id: "B", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
    ];

    force.initialize(nodes);
    force(1);

    expect(nodes[0].vy).not.toBe(nodes[1].vy);
  });
});
