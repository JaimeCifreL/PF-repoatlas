
export type RepoFileKind =
  | "entry"
  | "feature"
  | "shared";

export type RepoFile = {
  id: string;
  name: string;
  path: string;
  kind: RepoFileKind;
  analysisStatus?: "indexed" | "analyzed";

  // Se completará al añadir más lenguajes.
  language?: string;
};

export type RepoConnection = readonly [
  source: string,
  target: string
];

export type RepositoryGraph = {
  files: readonly RepoFile[];
  connections: readonly RepoConnection[];
};

// Resultado enviado por el analizador de GitHub.
export type AnalysisResult = RepositoryGraph & {
  repository: string;
  branch: string;
  totalCodeFiles: number;
  analyzedFiles: number;
  partial: boolean;
  warnings: string[];
};
