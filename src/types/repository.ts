
export type RepoFileKind =
  | "entry"
  | "feature"
  | "shared";

export type RepoFile = {
  id: string;
  name: string;
  path: string;
  kind: RepoFileKind;

  language?: string;
  size?: number;

  analysisStatus?: "indexed" | "analyzed";
  analysisPrecision?: "syntax" | "heuristic";
};

export type RepoConnection = readonly [
  source: string,
  target: string
];

export type RepositoryGraph = {
  files: readonly RepoFile[];
  connections: readonly RepoConnection[];
};

export type AnalysisResult = RepositoryGraph & {
  repository: string;
  branch: string;
  commitSha?: string;
  directories?: string[];

  totalCodeFiles: number;
  analyzedFiles: number;

  partial: boolean;
  inventoryComplete?: boolean;
  warnings: string[];
};
