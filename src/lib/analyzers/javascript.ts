
import ts from "typescript";

import type { LanguageAnalyzer } from "./types";
import { findLocalModule } from "./resolve";

const EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svg",
  ".vue",
  ".svelte",
];

function scriptKind(file: string): ts.ScriptKind {
  if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;

  if (/\.(js|mjs|cjs)$/i.test(file)) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function importSpecifiers(
  code: string,
  file: string
): string[] {
  const ast = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file)
  );

  const specs: string[] = [];

  const add = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteralLike(node)) {
      specs.push(node.text);
    }
  };

  const walk = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node)
    ) {
      add(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1
    ) {
      if (
        node.expression.kind ===
          ts.SyntaxKind.ImportKeyword ||
        (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        )
      ) {
        add(node.arguments[0]);
      }
    }

    ts.forEachChild(node, walk);
  };

  walk(ast);

  return specs;
}

function jsTarget(
  source: string,
  spec: string,
  paths: ReadonlySet<string>
): string | null {
  let value = spec;
  const roots: string[] = [];

  if (value.startsWith("@/")) {
    value = value.slice(2);

    const match = source.match(/^(.*?\/src\/)/);

    if (match) {
      roots.push(match[1]);
    }

    roots.push("src/", "frontend/src/");
  } else if (!value.startsWith(".")) {
    return null;
  }

  const resolved = findLocalModule(
    source,
    value,
    EXTENSIONS,
    paths,
    roots
  );

  if (resolved) {
    return resolved;
  }

  if (/\.(m?js|cjs)$/i.test(value)) {
    return findLocalModule(
      source,
      value.replace(/\.(m?js|cjs)$/i, ""),
      EXTENSIONS,
      paths,
      roots
    );
  }

  return null;
}

export const javascriptAnalyzer: LanguageAnalyzer = {
  id: "javascript-typescript",

  extensions: [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
  ],

  precision: "syntax",

  analyze({ sources, availablePaths }) {
    const edges = new Map<
      string,
      readonly [string, string]
    >();

    const warnings: string[] = [];
    const analyzedPaths: string[] = [];

    for (const [source, code] of sources) {
      try {
        for (
          const spec of importSpecifiers(code, source)
        ) {
          const target = jsTarget(
            source,
            spec,
            availablePaths
          );

          if (target && target !== source) {
            edges.set(
              JSON.stringify([source, target]),
              [source, target]
            );
          }
        }

        analyzedPaths.push(source);
      } catch (error) {
        warnings.push(
          `${source}: ${
            error instanceof Error
              ? error.message
              : "parse failed"
          }`
        );
      }
    }

    return {
      connections: [...edges.values()],
      analyzedPaths,
      warnings,
    };
  },
};
