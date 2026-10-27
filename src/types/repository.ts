
export type RepoFileKind =
  | "entry"
  | "feature"
  | "shared";

export type RepoFile = {
  id: string;
  name: string;
  path: string;
  kind: RepoFileKind;
};

export type RepoConnection = readonly [
  source: string,
  target: string
];

export type RepositoryGraph = {
  files: readonly RepoFile[];
  connections: readonly RepoConnection[];
};
