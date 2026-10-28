
import { describe, expect, it } from "vitest";

import {
  parsePythonImports,
  buildPythonConnections,
} from "./python-dependencies";

describe("RepoAtlas - Python Dependencies", () => {
  it("extrae importaciones absolutas", () => {
    const source = `
import os
import app.comparison as comparison
from app.document_diff import compare_documents
`;

    const imports = parsePythonImports(source);

    expect(imports.map((item) => item.module)).toEqual([
      "os",
      "app.comparison",
      "app.document_diff",
    ]);
  });

  it("ignora cadenas y comentarios", () => {
    const source = `
# import fake.module
message = "from fake import module"
import app.comparison
`;

    const imports = parsePythonImports(source);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.module).toBe("app.comparison");
  });

  it("resuelve las importaciones del backend de ScopeCheck", () => {
    const main = "backend/app/main.py";

    const files = new Set([
      main,
      "backend/app/comparison.py",
      "backend/app/document_diff.py",
      "backend/app/ai_review.py",
    ]);

    const sources = new Map([
      [
        main,
        `
from fastapi import FastAPI
from app.comparison import compare_prices
from app.document_diff import compare_documents
from app.ai_review import semantic_review
`,
      ],
    ]);

    const connections = buildPythonConnections(
      sources,
      files
    );

    expect(new Set(connections.map(([, target]) => target)))
      .toEqual(
        new Set([
          "backend/app/comparison.py",
          "backend/app/document_diff.py",
          "backend/app/ai_review.py",
        ])
      );

    expect(connections).toHaveLength(3);
  });

  it("resuelve importaciones relativas", () => {
    const sources = new Map([
      [
        "backend/app/services/main.py",
        `
from . import helpers
from ..shared import utils
`,
      ],
    ]);

    const available = new Set([
      "backend/app/services/main.py",
      "backend/app/services/helpers.py",
      "backend/app/shared/utils.py",
    ]);

    const connections = buildPythonConnections(
      sources,
      available
    );

    expect(connections).toContainEqual([
      "backend/app/services/main.py",
      "backend/app/services/helpers.py",
    ]);

    expect(connections).toContainEqual([
      "backend/app/services/main.py",
      "backend/app/shared/utils.py",
    ]);
  });

  it("no duplica dependencias", () => {
    const sources = new Map([
      [
        "backend/main.py",
        `
import helpers
from helpers import do_work
import helpers
`,
      ],
    ]);

    const connections = buildPythonConnections(
      sources,
      new Set([
        "backend/main.py",
        "backend/helpers.py",
      ])
    );

    expect(connections).toEqual([
      ["backend/main.py", "backend/helpers.py"],
    ]);
  });

  it("ignora importaciones externas no resueltas", () => {
    const sources = new Map([
      [
        "backend/main.py",
        `
import os
import fastapi
from pydantic import BaseModel
`,
      ],
    ]);

    const connections = buildPythonConnections(
      sources,
      new Set(["backend/main.py"])
    );

    expect(connections).toEqual([]);
  });
});
