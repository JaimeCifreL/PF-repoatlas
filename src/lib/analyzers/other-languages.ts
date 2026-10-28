
import path from "node:path";

import type { LanguageAnalyzer } from "./types";
import { findLocalModule } from "./resolve";

function makeAnalyzer(
  id: string,
  extensions: readonly string[],
  parse: (
    source: string,
    text: string,
    paths: ReadonlySet<string>
  ) => string[]
): LanguageAnalyzer {
  return {
    id,
    extensions,
    precision: "heuristic",

    analyze({ sources, availablePaths }) {
      const connections = new Map<
        string,
        readonly [string, string]
      >();

      const warnings: string[] = [];
      const analyzedPaths: string[] = [];

      for (const [source, code] of sources) {
        try {
          for (
            const target of parse(
              source,
              code,
              availablePaths
            )
          ) {
            if (
              target !== source &&
              availablePaths.has(target)
            ) {
              connections.set(
                JSON.stringify([source, target]),
                [source, target]
              );
            }
          }

          analyzedPaths.push(source);
        } catch (error) {
          warnings.push(
            `${id}: could not process ${source}: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`
          );
        }
      }

      return {
        connections: [...connections.values()],
        analyzedPaths,
        warnings,
      };
    },
  };
}

const references = (code: string, regex: RegExp) =>
  [...code.matchAll(regex)]
    .map((match) => match[1])
    .filter(
      (value): value is string => Boolean(value)
    );

// JAVA

export const javaAnalyzer = makeAnalyzer(
  "java",
  [".java"],
  (source, code, paths) => {
    const imports = references(
      code,
      /^\s*import\s+(?:static\s+)?([\w$.]+)\s*;/gm
    );

    return imports.flatMap((value) => {
      if (value.endsWith(".*")) {
        return [];
      }

      const modules = [
        value,
        value.replace(/\.[^.]+$/, ""),
      ];

      for (const candidate of modules) {
        const found = findLocalModule(
          source,
          candidate.replace(/\./g, "/"),
          [".java"],
          paths
        );

        if (found) {
          return [found];
        }
      }

      return [];
    });
  }
);

// C#
// Los using suelen referirse a espacios de nombres.
// Solo se enlazan coincidencias de archivo inequívocas.

export const csharpAnalyzer = makeAnalyzer(
  "csharp",
  [".cs"],
  (source, code, paths) =>
    references(
      code,
      /^\s*(?:global\s+)?using\s+(?:static\s+)?(?:\w+\s*=\s*)?([\w.]+)\s*;/gm
    )
      .map((value) =>
        findLocalModule(
          source,
          value.replace(/\./g, "/"),
          [".cs"],
          paths
        )
      )
      .filter(
        (value): value is string => value !== null
      )
);

// PHP

export const phpAnalyzer = makeAnalyzer(
  "php",
  [".php"],
  (source, code, paths) => {
    const output: string[] = [];

    for (
      const reference of references(
        code,
        /\b(?:require|include)(?:_once)?\s*(?:\(\s*)?(?:__DIR__\s*\.\s*)?['"]([^'"]+\.php)['"]/g
      )
    ) {
      const ref = reference.startsWith("/")
        ? `.${reference}`
        : reference;

      const target = findLocalModule(
        source,
        ref,
        [".php"],
        paths
      );

      if (target) {
        output.push(target);
      }
    }

    for (
      const value of references(
        code,
        /^\s*use\s+([A-Za-z_][\w\\]+)\s*(?:as\s+\w+)?\s*;/gm
      )
    ) {
      const target = findLocalModule(
        source,
        value.replace(/\\/g, "/"),
        [".php"],
        paths
      );

      if (target) {
        output.push(target);
      }
    }

    return output;
  }
);

// GO

export const goAnalyzer = makeAnalyzer(
  "go",
  [".go"],
  (source, code, paths) => {
    const blocks = [
      ...code.matchAll(
        /^\s*import\s*\(([^)]*)\)/gm
      ),
    ].map((match) => match[1] ?? "");

    const direct = references(
      code,
      /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm
    );

    const imports = [
      ...direct,
      ...blocks.flatMap((block) =>
        references(
          block,
          /^\s*(?:[\w.]+\s+)?"([^"]+)"/gm
        )
      ),
    ];

    const pathsArray = [...paths].filter(
      (p) => p.endsWith(".go")
    );

    const result: string[] = [];

    for (const imp of imports) {
      const segments = imp.split("/");

      for (
        let i = 0;
        i < segments.length;
        i++
      ) {
        const suffix = segments
          .slice(i)
          .join("/");

        const matching = pathsArray.filter(
          (file) => {
            const dir = path.posix.dirname(file);

            return (
              dir === suffix ||
              dir.endsWith(`/${suffix}`)
            );
          }
        );

        const dirs = new Set(
          matching.map((file) =>
            path.posix.dirname(file)
          )
        );

        if (dirs.size === 1) {
          result.push(...matching);
          break;
        }
      }
    }

    return result.filter(
      (target) => target !== source
    );
  }
);

// RUST

export const rustAnalyzer = makeAnalyzer(
  "rust",
  [".rs"],
  (source, code, paths) => {
    const results: string[] = [];

    for (
      const moduleName of references(
        code,
        /^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+)\s*;/gm
      )
    ) {
      const target = findLocalModule(
        source,
        `./${moduleName}`,
        [".rs"],
        paths
      );

      if (target) {
        results.push(target);
      }
    }

    for (
      const statement of references(
        code,
        /^\s*(?:pub\s+)?use\s+((?:crate|self|super)::[\w:]+)\s*;/gm
      )
    ) {
      const segments = statement.split("::");
      const root = segments.shift();

      const sourceDir =
        path.posix.dirname(source);

      const srcPosition =
        source.indexOf("/src/");

      const crateSrc =
        srcPosition >= 0
          ? source.slice(0, srcPosition + 4)
          : source.startsWith("src/")
            ? "src"
            : sourceDir;

      const prefix =
        root === "crate"
          ? crateSrc
          : root === "super"
            ? path.posix.dirname(sourceDir)
            : sourceDir;

      for (
        let length = segments.length;
        length > 0;
        length--
      ) {
        const candidate =
          path.posix.normalize(
            `${prefix}/${segments
              .slice(0, length)
              .join("/")}`
          );

        const found = findLocalModule(
          source,
          candidate,
          [".rs"],
          paths,
          [""]
        );

        if (found) {
          results.push(found);
          break;
        }

        const suffixes = [
          `${candidate}.rs`,
          `${candidate}/mod.rs`,
        ];

        const matched = suffixes.find(
          (p) => paths.has(p)
        );

        if (matched) {
          results.push(matched);
          break;
        }
      }
    }

    return results;
  }
);

// RUBY

export const rubyAnalyzer = makeAnalyzer(
  "ruby",
  [".rb"],
  (source, code, paths) =>
    references(
      code,
      /^\s*require_relative\s*\(?\s*['"]([^'"]+)['"]/gm
    )
      .map((value) =>
        findLocalModule(
          source,
          `./${value}`,
          [".rb"],
          paths
        )
      )
      .filter(
        (value): value is string => value !== null
      )
);

// DART

export const dartAnalyzer = makeAnalyzer(
  "dart",
  [".dart"],
  (source, code, paths) =>
    references(
      code,
      /^\s*(?:import|export|part)\s+['"]([^'"]+)['"]/gm
    )
      .filter((value) =>
        value.startsWith(".")
      )
      .map((value) =>
        findLocalModule(
          source,
          value,
          [".dart"],
          paths
        )
      )
      .filter(
        (value): value is string => value !== null
      )
);
