
export const files = [
  { id: "page", name: "page.tsx", path: "src/app/page.tsx", x: 0, y: 180, kind: "entry" },
  { id: "shell", name: "AppShell.tsx", path: "src/components/AppShell.tsx", x: 210, y: 30, kind: "feature" },
  { id: "graph", name: "GraphCanvas.tsx", path: "src/components/GraphCanvas.tsx", x: 210, y: 170, kind: "feature" },
  { id: "search", name: "RepositorySearch.tsx", path: "src/components/RepositorySearch.tsx", x: 210, y: 310, kind: "feature" },
  { id: "sidebar", name: "Sidebar.tsx", path: "src/components/Sidebar.tsx", x: 420, y: -40, kind: "feature" },
  { id: "inspector", name: "Inspector.tsx", path: "src/components/Inspector.tsx", x: 420, y: 100, kind: "feature" },
  { id: "analyzer", name: "analyzer.ts", path: "src/lib/analyzer.ts", x: 420, y: 240, kind: "feature" },
  { id: "github", name: "github.ts", path: "src/lib/github.ts", x: 630, y: 340, kind: "shared" },
  { id: "types", name: "graph.ts", path: "src/types/graph.ts", x: 630, y: 200, kind: "shared" },
  { id: "theme", name: "tokens.ts", path: "src/styles/tokens.ts", x: 630, y: 40, kind: "shared" },
] as const;

export const connections = [
  ["page", "shell"],
  ["page", "graph"],
  ["page", "search"],
  ["shell", "sidebar"],
  ["shell", "theme"],
  ["graph", "inspector"],
  ["graph", "analyzer"],
  ["graph", "types"],
  ["inspector", "types"],
  ["inspector", "theme"],
  ["sidebar", "theme"],
  ["search", "github"],
  ["search", "types"],
  ["analyzer", "github"],
  ["analyzer", "types"],
] as const;

export const colors = {
  entry: "#f2a36b",
  feature: "#23d1ad",
  shared: "#6ca9d9",
};
