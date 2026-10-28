
import { buildPythonConnections } from "../python-dependencies";

import type { LanguageAnalyzer } from "./types";

export const pythonAnalyzer: LanguageAnalyzer = {
  id: "python",

  extensions: [".py", ".pyi"],

  precision: "syntax",

  analyze({ sources, availablePaths }) {
    const connections = buildPythonConnections(
      sources,
      availablePaths
    );

    return {
      connections,
      analyzedPaths: [...sources.keys()],
      warnings: [],
    };
  },
};
