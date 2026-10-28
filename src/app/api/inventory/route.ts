
import { NextRequest, NextResponse } from "next/server";
import { buildPythonConnections } from "@/lib/python-dependencies";
import { detectLanguage } from "@/lib/language-detection";
import type { RepoFile } from "@/types/repository";

type GitTreeEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
};

type GitTreeResponse = {
  tree: GitTreeEntry[];
  truncated: boolean;
};

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Falta la URL del repositorio." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(rawUrl);

    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "github.com"
    ) {
      throw new Error("Solo se admiten URLs HTTPS de GitHub.");
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length !== 2) {
      throw new Error("Utiliza la URL principal del repositorio.");
    }

    const [owner, rawRepo] = parts;
    const repo = rawRepo.replace(/\.git$/i, "");

    if (
      !/^[a-zA-Z0-9-]+$/.test(owner) ||
      !/^[a-zA-Z0-9._-]+$/.test(repo)
    ) {
      throw new Error("Nombre de repositorio no válido.");
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "RepoAtlas",
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Obtener la rama principal.
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers, cache: "no-store" }
    );

    if (!repoResponse.ok) {
      throw new Error(
        `No se pudo consultar GitHub (${repoResponse.status}).`
      );
    }

    const metadata = await repoResponse.json() as {
      default_branch: string;
    };

    // 2. Obtener todos los elementos del árbol.
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`,
      { headers, cache: "no-store" }
    );

    if (!treeResponse.ok) {
      throw new Error(
        `No se pudo obtener el árbol (${treeResponse.status}).`
      );
    }

    const tree = await treeResponse.json() as GitTreeResponse;

    // Nunca presentar una lista incompleta como completa.
    if (tree.truncated) {
      throw new Error(
        "GitHub ha truncado el árbol. Este repositorio necesita un recorrido paginado por subárboles."
      );
    }

    const files: RepoFile[] = tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => {
        const name = entry.path.split("/").at(-1) ?? entry.path;

        const kind: RepoFile["kind"] =
          /(^|\/)(shared|lib|utils|types)\//i.test(entry.path)
            ? "shared"
            : /^(index|main|app|page|route)\./i.test(name)
              ? "entry"
              : "feature";

        return {
          id: entry.path,
          name,
          path: entry.path,
          kind,
          language: detectLanguage(entry.path),
          analysisStatus: "indexed",
        };
      });

    const directories = tree.tree
      .filter((entry) => entry.type === "tree")
      .map((entry) => entry.path);
    
    // Analizar archivos Python sin alterar el inventario completo.
    const MAX_PYTHON_FILES = 120;
    const MAX_PYTHON_BYTES = 160_000;
    const BATCH_SIZE = 6;

    const pythonEntries = tree.tree.filter(
    (entry) =>
        entry.type === "blob" &&
        entry.path.endsWith(".py")
    );

    const pythonCandidates = pythonEntries.slice(
    0,
    MAX_PYTHON_FILES
    );

    const pythonSources = new Map<string, string>();
    const pythonWarnings: string[] = [];

    if (pythonEntries.length > MAX_PYTHON_FILES) {
    pythonWarnings.push(
        `Python analysis limited to ${MAX_PYTHON_FILES} files.`
    );
    }

    // Descargar el código en grupos pequeños.
    for (
    let start = 0;
    start < pythonCandidates.length;
    start += BATCH_SIZE
    ) {
    const batch = pythonCandidates.slice(
        start,
        start + BATCH_SIZE
    );

    await Promise.all(
        batch.map(async (entry) => {
        if (
            entry.size !== undefined &&
            entry.size > MAX_PYTHON_BYTES
        ) {
            pythonWarnings.push(
            `Python file too large: ${entry.path}`
            );
            return;
        }

        try {
            const encodedPath = entry.path
            .split("/")
            .map(encodeURIComponent)
            .join("/");

            const rawUrl =
            `https://raw.githubusercontent.com/` +
            `${owner}/${repo}/` +
            `${encodeURIComponent(metadata.default_branch)}/` +
            encodedPath;

            const fileResponse = await fetch(rawUrl, {
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
            });

            if (!fileResponse.ok) {
            pythonWarnings.push(
                `Could not fetch ${entry.path}: HTTP ${fileResponse.status}`
            );
            return;
            }

            const sourceCode = await fileResponse.text();

            if (
            Buffer.byteLength(sourceCode, "utf8") >
            MAX_PYTHON_BYTES
            ) {
            pythonWarnings.push(
                `Python file too large: ${entry.path}`
            );
            return;
            }

            pythonSources.set(entry.path, sourceCode);
        } catch {
            pythonWarnings.push(
            `Could not read Python file: ${entry.path}`
            );
        }
        })
    );
    }

    const pythonConnections = buildPythonConnections(
    pythonSources,
    new Set(files.map((file) => file.path))
    );

    const analyzedPythonPaths = [...pythonSources.keys()];

    const pythonPartial =
    analyzedPythonPaths.length < pythonEntries.length;


    return NextResponse.json({
        repository: `${owner}/${repo}`,
        branch: metadata.default_branch,
        files,
        directories,
        totalFiles: files.length,
        truncated: false,

        pythonFileCount: pythonEntries.length,
        pythonConnections,
        analyzedPythonPaths,
        pythonPartial,
        pythonWarnings,
    });
    

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener el inventario.",
      },
      { status: 502 }
    );
  }
}
