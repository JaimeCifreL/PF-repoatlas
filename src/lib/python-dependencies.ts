
import { parser } from "@lezer/python";
import type { RepoConnection } from "@/types/repository";

export type PythonImport = {
  module: string;
  names: readonly string[] | null;
};

const MODULE_NAME = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/;

/**
 * Extrae importaciones desde el árbol sintáctico.
 * No confunde comentarios o cadenas con importaciones.
 */
export function parsePythonImports(
  source: string
): PythonImport[] {
  const imports: PythonImport[] = [];

  const tree = parser.parse(source);

  tree.iterate({
    enter: ({ type, from, to }) => {
      if (type.name !== "ImportStatement") return;

      const statement = source
        .slice(from, to)
        .replace(/\\\r?\n/g, " ")
        .replace(/#.*$/gm, " ")
        .replace(/\s+/g, " ")
        .trim();

      // import os
      // import app.comparison as comparison
      // import app.a, app.b
      if (statement.startsWith("import ")) {
        const modules = statement
          .slice("import ".length)
          .split(",");

        for (const item of modules) {
          const moduleName = item
            .trim()
            .split(/\s+as\s+/)[0]
            ?.trim();

          if (moduleName && MODULE_NAME.test(moduleName)) {
            imports.push({
              module: moduleName,
              names: null,
            });
          }
        }

        return;
      }

      // from app.comparison import compare_prices
      // from . import comparison
      // from ..shared.utils import helper
      const match = statement.match(
        /^from\s+(\.*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\.+)\s+import\s+(.+)$/
      );

      if (!match) return;

      const moduleName = match[1];
      const rawNames = match[2];

      if (!moduleName || !rawNames) return;

      const names = rawNames
        .replace(/^\(\s*/, "")
        .replace(/\s*\)$/, "")
        .split(",")
        .map((item) =>
          item.trim().split(/\s+as\s+/)[0]?.trim() ?? ""
        )
        .filter((name) => MODULE_NAME.test(name));

      imports.push({
        module: moduleName,
        names,
      });
    },
  });

  return imports;
}

/**
 * Busca un módulo Python en los archivos del repositorio.
 *
 * Admite:
 * - importaciones relativas
 * - importaciones absolutas
 * - paquetes con __init__.py
 * - carpetas raíz como backend/ o src/
 */
function resolvePythonModule(
  sourcePath: string,
  moduleName: string,
  availablePaths: ReadonlySet<string>
): string | null {
  const allPaths = [...availablePaths];
  const isRelative = moduleName.startsWith(".");

  let relativePath: string;

  if (isRelative) {
    const dots = moduleName.match(/^\.+/)?.[0].length ?? 0;

    const directories = sourcePath
      .split("/")
      .slice(0, -1);

    const parentsToRemove = dots - 1;

    if (parentsToRemove > directories.length) {
      return null;
    }

    const base = directories.slice(
      0,
      directories.length - parentsToRemove
    );

    const remaining = moduleName
      .slice(dots)
      .split(".")
      .filter(Boolean);

    relativePath = [...base, ...remaining].join("/");
  } else {
    relativePath = moduleName.replace(/\./g, "/");
  }

  if (!relativePath) return null;

  const candidates = [
    `${relativePath}.py`,
    `${relativePath}/__init__.py`,
  ];

  // Primero comprobar la ruta exacta.
  for (const candidate of candidates) {
    if (availablePaths.has(candidate)) {
      return candidate;
    }
  }

  // Las importaciones relativas no necesitan buscar
  // en otras carpetas.
  if (isRelative) return null;

  // Para importaciones absolutas, admitir raíces como
  // backend/app cuando Python importa app.module.
  //
  // Solo resolver cuando existe una coincidencia única.
  const matches = allPaths.filter((path) =>
    candidates.some((candidate) =>
      path.endsWith(`/${candidate}`)
    )
  );

  return matches.length === 1
    ? matches[0]
    : null;
}

/**
 * Convierte importaciones Python en conexiones de RepoAtlas.
 *
 * Dirección:
 * archivo que importa -> archivo importado.
 *
 * No crea conexiones a paquetes externos.
 */
export function buildPythonConnections(
  sources: ReadonlyMap<string, string>,
  availablePaths: ReadonlySet<string>
): RepoConnection[] {
  const connections: RepoConnection[] = [];
  const seen = new Set<string>();

  function addConnection(
    source: string,
    target: string | null
  ) {
    if (!target || source === target) return;

    const key = JSON.stringify([source, target]);

    if (seen.has(key)) return;

    seen.add(key);
    connections.push([source, target]);
  }

  for (const [sourcePath, sourceCode] of sources) {
    const imports = parsePythonImports(sourceCode);

    for (const item of imports) {
      // Resolver el módulo principal.
      const mainTarget = resolvePythonModule(
        sourcePath,
        item.module,
        availablePaths
      );

      addConnection(sourcePath, mainTarget);

      // Resolver submódulos:
      // from app import comparison
      // from . import document_diff
      if (item.names !== null) {
        for (const name of item.names) {
          const childModule = item.module.endsWith(".")
            ? `${item.module}${name}`
            : `${item.module}.${name}`;

          const childTarget = resolvePythonModule(
            sourcePath,
            childModule,
            availablePaths
          );

          addConnection(sourcePath, childTarget);
        }
      }
    }
  }

  return connections;
}
