
import path from "node:path";

const ROOTS = [
  "",
  "src/",
  "app/",
  "backend/",
  "backend/app/",
  "frontend/",
  "frontend/src/",
  "lib/",
];

export function findLocalModule(
  sourcePath: string,
  reference: string,
  extensions: readonly string[],
  availablePaths: ReadonlySet<string>,
  extraRoots: readonly string[] = []
): string | null {
  const allPaths = [...availablePaths];
  const sourceDir = path.posix.dirname(sourcePath);

  const value = reference.replace(/\\/g, "/");
  const isRelative = value.startsWith(".");

  const baseNames = isRelative
    ? [
        path.posix.normalize(
          path.posix.join(sourceDir, value)
        ),
      ]
    : [...new Set([...extraRoots, ...ROOTS])].map(
        (root) => path.posix.normalize(root + value)
      );

  const candidates = new Set<string>();

  for (const name of baseNames) {
    candidates.add(name);

    for (const ext of extensions) {
      candidates.add(`${name}${ext}`);
      candidates.add(`${name}/index${ext}`);
      candidates.add(`${name}/__init__${ext}`);
    }
  }

  const directMatches = [...candidates].filter(
    (candidate) => availablePaths.has(candidate)
  );

  if (directMatches.length === 1) {
    return directMatches[0];
  }

  if (directMatches.length > 1) {
    return null;
  }

  if (isRelative) {
    return null;
  }

  const suffixMatches = allPaths.filter((candidate) =>
    [...candidates].some((wanted) =>
      candidate.endsWith(`/${wanted}`)
    )
  );

  return suffixMatches.length === 1
    ? suffixMatches[0]
    : null;
}
