
import { posix as path } from "node:path";
import ts from "typescript";

type GitHubRepository = {
  full_name: string;
  default_branch: string;
};

type GitHubTree = {
  truncated: boolean;
  tree: {
    path: string;
    type: string;
    size?: number;
  }[];
};

export type AnalyzedFile = {
  id: string;
  name: string;
  path: string;
  kind: "entry" | "feature" | "shared";
};

export type AnalysisResult = {
  repository: string;
  branch: string;
  files: AnalyzedFile[];
  connections: [string, string][];
  totalCodeFiles: number;
  analyzedFiles: number;
  partial: boolean;
  warnings: string[];
};

export class AnalysisError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const MAX_FILES = 80;
const MAX_FILE_SIZE = 160_000;
const EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx",
  ".mts", ".cts", ".mjs", ".cjs",
];

function parseRepositoryUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new AnalysisError("La URL no es válida.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    parts.length !== 2
  ) {
    throw new AnalysisError(
      "Introduce una URL de repositorio público de GitHub."
    );
  }

  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/i, "");

  if (
    !/^[a-zA-Z0-9-]+$/.test(owner) ||
    !/^[a-zA-Z0-9._-]+$/.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new AnalysisError("El repositorio indicado no es válido.");
  }

  return { owner, repo };
}

async function githubJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoAtlas",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    throw new AnalysisError(
      "Repositorio no encontrado o no público.",
      404
    );
  }

  if (response.status === 403 || response.status === 429) {
    throw new AnalysisError(
      "GitHub ha rechazado la consulta o ha aplicado un límite temporal.",
      429
    );
  }

  if (!response.ok) {
    throw new AnalysisError(
      "No se ha podido obtener la información de GitHub.",
      502
    );
  }

  return (await response.json()) as T;
}

function extractImports(source: string, filename: string) {
  const scriptKind = filename.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filename.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : /\.(js|mjs|cjs)$/.test(filename)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const imports = new Set<string>();

  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node)
    ) {
      const moduleSpecifier = node.moduleSpecifier;

    if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        imports.add(moduleSpecifier.text);
    }
    }

    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;

      const isRequire =
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require";

      const argument = node.arguments[0];

      if ((isImport || isRequire) && ts.isStringLiteral(argument)) {
        imports.add(argument.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...imports];
}

function resolveImport(
  from: string,
  specifier: string,
  available: Set<string>
): string | null {
  let base: string;

  if (
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    base = path.normalize(
      path.join(path.dirname(from), specifier)
    );
  } else if (specifier.startsWith("@/")) {
    const srcIndex = from.lastIndexOf("/src/");

    const root =
      srcIndex >= 0
        ? from.slice(0, srcIndex + 5)
        : from.startsWith("src/")
          ? "src/"
          : null;

    if (!root) return null;

    base = path.normalize(
      path.join(root, specifier.slice(2))
    );
  } else {
    return null;
  }

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];

  // Algunos proyectos importan .js aunque el origen sea .ts.
  if (base.endsWith(".js")) {
    candidates.push(
      base.slice(0, -3) + ".ts",
      base.slice(0, -3) + ".tsx"
    );
  }

  return candidates.find((item) => available.has(item)) ?? null;
}

function classifyFile(
  filename: string
): AnalyzedFile["kind"] {
  const name = path.basename(filename);

  if (/^(page|index|main|app)\.[cm]?[jt]sx?$/i.test(name)) {
    return "entry";
  }

  if (
    filename.includes("/lib/") ||
    filename.includes("/utils/") ||
    filename.includes("/types/")
  ) {
    return "shared";
  }

  return "feature";
}

export async function analyzeGitHubRepository(
  repositoryUrl: string
): Promise<AnalysisResult> {
  const { owner, repo } = parseRepositoryUrl(repositoryUrl);

  const baseURL = `https://api.github.com/repos/${owner}/${repo}`;

  const repository = await githubJSON<GitHubRepository>(baseURL);

  const tree = await githubJSON<GitHubTree>(
    `${baseURL}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`
  );

  const codeFiles = tree.tree
    .filter((item) =>
      item.type === "blob" &&
      /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i.test(item.path) &&
      !/\.d\.(ts|mts|cts)$/i.test(item.path) &&
      !/(^|\/)(node_modules|dist|build|coverage|\.next|vendor|out)(\/|$)/i.test(item.path)
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  const eligible = codeFiles.filter(
    (item) => (item.size ?? 0) <= MAX_FILE_SIZE
  );

  const selected = eligible.slice(0, MAX_FILES);
  const available = new Set(selected.map((item) => item.path));

  const files: AnalyzedFile[] = selected.map((item) => ({
    id: item.path,
    path: item.path,
    name: path.basename(item.path),
    kind: classifyFile(item.path),
  }));

  const connections: [string, string][] = [];
  const uniqueConnections = new Set<string>();

  let analyzedFiles = 0;
  let failedFiles = 0;

  // Descargar código en grupos pequeños.
  for (let i = 0; i < selected.length; i += 6) {
    const batch = selected.slice(i, i + 6);

    const results = await Promise.all(
      batch.map(async (file) => {
        const encodedPath = file.path
          .split("/")
          .map(encodeURIComponent)
          .join("/");

        const rawURL =
          `https://raw.githubusercontent.com/${owner}/${repo}/` +
          `${encodeURIComponent(repository.default_branch)}/${encodedPath}`;

        try {
          const response = await fetch(rawURL, {
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
          });

          if (!response.ok) return null;

          const source = await response.text();

          if (Buffer.byteLength(source, "utf8") > MAX_FILE_SIZE) {
            return null;
          }

          return {
            path: file.path,
            imports: extractImports(source, file.path),
          };
        } catch {
          return null;
        }
      })
    );

    for (let index = 0; index < results.length; index++) {
      const result = results[index];

      if (!result) {
        failedFiles++;
        continue;
      }

      analyzedFiles++;

      for (const specifier of result.imports) {
        const target = resolveImport(
          result.path,
          specifier,
          available
        );

        if (!target || target === result.path) continue;

        const key = `${result.path}\0${target}`;

        if (!uniqueConnections.has(key)) {
          uniqueConnections.add(key);
          connections.push([result.path, target]);
        }
      }
    }
  }

  const warnings: string[] = [];

  if (tree.truncated) {
    warnings.push("GitHub devolvió un árbol incompleto.");
  }

  if (eligible.length > MAX_FILES) {
    warnings.push(`Análisis limitado a ${MAX_FILES} archivos.`);
  }

  if (codeFiles.length > eligible.length) {
    warnings.push("Se omitieron archivos demasiado grandes.");
  }

  if (failedFiles > 0) {
    warnings.push(`${failedFiles} archivos no se pudieron leer.`);
  }

  return {
    repository: repository.full_name,
    branch: repository.default_branch,
    files,
    connections,
    totalCodeFiles: codeFiles.length,
    analyzedFiles,
    partial: warnings.length > 0,
    warnings,
  };
}
