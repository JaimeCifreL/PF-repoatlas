
"use client";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Search,
  ArrowUpRight,
} from "lucide-react";

import type {
  RepoFile,
} from "../../types/repository";

type TreeNode = {
  path: string;
  name: string;
  folders: TreeNode[];
  files: RepoFile[];
};

type Props = {
  files: readonly RepoFile[];
  directories?: readonly string[];
  selectedId: string | null;
  onInspect: (id: string) => void;
  onImpact: (id: string) => void;
};

function buildTree(
  files: readonly RepoFile[],
  directories: readonly string[]
): TreeNode {
  const root: TreeNode = {
    path: "",
    name: "/",
    folders: [],
    files: [],
  };

  const lookup = new Map<
    string,
    TreeNode
  >([["", root]]);

  const ensure = (
    fullPath: string
  ): TreeNode => {
    const existing = lookup.get(fullPath);

    if (existing) {
      return existing;
    }

    const index =
      fullPath.lastIndexOf("/");

    const parent = ensure(
      index < 0
        ? ""
        : fullPath.slice(0, index)
    );

    const node: TreeNode = {
      path: fullPath,
      name: fullPath.slice(index + 1),
      folders: [],
      files: [],
    };

    parent.folders.push(node);
    lookup.set(fullPath, node);

    return node;
  };

  for (const path of directories) {
    ensure(path);
  }

  for (const file of files) {
    const i = file.path.lastIndexOf("/");

    ensure(
      i < 0
        ? ""
        : file.path.slice(0, i)
    ).files.push(file);
  }

  const sort = (node: TreeNode) => {
    node.folders.sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

    node.files.sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

    node.folders.forEach(sort);
  };

  sort(root);

  return root;
}

export function FileExplorer({
  files,
  directories = [],
  selectedId,
  onInspect,
  onImpact,
}: Props) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] =
    useState("all");

  const [status, setStatus] =
    useState("all");

  const [expanded, setExpanded] =
    useState<ReadonlySet<string>>(
      () => new Set([""])
    );

  const languages = useMemo(
    () =>
      [
        ...new Set(
          files.map(
            (file) =>
              file.language ?? "Unknown"
          )
        ),
      ].sort(),
    [files]
  );

  const root = useMemo(
    () => buildTree(files, directories),
    [files, directories]
  );

  const queryText =
    query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const accepted = (file: RepoFile) =>
      (
        language === "all" ||
        (file.language ?? "Unknown") ===
          language
      ) &&
      (
        status === "all" ||
        (file.analysisStatus ?? "indexed") ===
          status
      ) &&
      (
        !queryText ||
        file.path
          .toLowerCase()
          .includes(queryText)
      );

    const prune = (
      node: TreeNode
    ): TreeNode | null => {
      const folders = node.folders
        .map(prune)
        .filter(
          (child): child is TreeNode =>
            child !== null
        );

      const matched =
        node.files.filter(accepted);

      if (
        node.path &&
        (
          queryText ||
          language !== "all" ||
          status !== "all"
        ) &&
        !folders.length &&
        !matched.length
      ) {
        return null;
      }

      return {
        ...node,
        folders,
        files: matched,
      };
    };

    return (
      prune(root) ?? {
        path: "",
        name: "/",
        folders: [],
        files: [],
      }
    );
  }, [
    root,
    queryText,
    language,
    status,
  ]);

  function toggle(path: string) {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  function renderBranch(
    node: TreeNode,
    depth: number
  ): ReactNode {
    const visible = queryText
      ? true
      : expanded.has(node.path);

    return (
      <div key={`folder-${node.path}`}>

        {node.path && (
          <button
            type="button"
            onClick={() =>
              toggle(node.path)
            }
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left font-mono text-xs text-[#a6bfcc] hover:bg-[#172b38]"
            style={{
              paddingLeft:
                12 + depth * 16,
            }}
          >
            {visible ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}

            {visible ? (
              <FolderOpen
                size={15}
                className="text-[#39cfae]"
              />
            ) : (
              <Folder
                size={15}
                className="text-[#688ba0]"
              />
            )}

            <span className="truncate">
              {node.name}
            </span>
          </button>
        )}

        {visible && (
          <>
            {node.folders.map(
              (child) =>
                renderBranch(
                  child,
                  depth + 1
                )
            )}

            {node.files.map(
              (file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-1"
                  style={{
                    paddingLeft:
                      14 +
                      (depth + 1) * 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onInspect(file.id)
                    }
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left font-mono text-[11px] hover:bg-[#17352f] ${
                      selectedId === file.id
                        ? "bg-[#15463a] text-[#9cffde]"
                        : "text-[#b1c5d1]"
                    }`}
                  >
                    <FileCode2
                      size={13}
                      className={
                        file.analysisStatus ===
                        "analyzed"
                          ? "text-[#42d6b4]"
                          : "text-[#6d8494]"
                      }
                    />

                    <span
                      className="truncate"
                      title={file.path}
                    >
                      {file.name}
                    </span>

                    <span className="ml-auto shrink-0 text-[9px] text-[#6e889b]">
                      {file.language ??
                        "Unknown"}
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Analyze impact"
                    aria-label={
                      `Analyze impact of ${file.name}`
                    }
                    onClick={() =>
                      onImpact(file.id)
                    }
                    className="shrink-0 cursor-pointer rounded px-2 py-2 text-[#7494a6] hover:text-[#42d6b4]"
                  >
                    <ArrowUpRight size={14}/>
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <main className="min-w-0 flex-1 p-5 lg:p-8">

      <p className="mb-2 font-mono text-[10px] tracking-widest text-[#24cba7]">
        03 / REPOSITORY EXPLORER
      </p>

      <h1 className="text-2xl font-semibold text-[#e8eef5]">
        File explorer
      </h1>

      <p className="mt-2 text-sm text-[#819aaa]">
        Every inventoried file stays available,
        even when its language is not analyzed.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_150px]">

        <label className="flex items-center gap-2 rounded-lg border border-[#304453] bg-[#101b27] px-3 py-2">
          <Search
            size={16}
            className="text-[#86a5b5]"
          />

          <input
            aria-label="Find files"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search file paths"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-[#60798a]"
          />
        </label>

        <select
          aria-label="Language"
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value)
          }
          className="rounded-lg border border-[#304453] bg-[#101b27] p-2 font-mono text-xs"
        >
          <option value="all">
            ALL LANGUAGES
          </option>

          {languages.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="Analysis status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          className="rounded-lg border border-[#304453] bg-[#101b27] p-2 font-mono text-xs"
        >
          <option value="all">
            ALL STATUSES
          </option>

          <option value="analyzed">
            ANALYZED
          </option>

          <option value="indexed">
            INDEXED
          </option>
        </select>
      </div>

      <div className="mt-5 rounded-xl border border-[#263947] bg-[#0e1824] p-3">

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#293947] pb-3 font-mono text-[10px] text-[#8da8b7]">

          <span>
            {files.length} INVENTORIED FILES
          </span>

          <button
            type="button"
            onClick={() =>
              setExpanded(
                new Set([
                  "",
                  ...directories,
                ])
              )
            }
            className="cursor-pointer hover:text-[#41d9b7]"
          >
            EXPAND ALL
          </button>

          <button
            type="button"
            onClick={() =>
              setExpanded(
                new Set([""])
              )
            }
            className="cursor-pointer hover:text-[#41d9b7]"
          >
            COLLAPSE ALL
          </button>
        </div>

        <div className="max-h-[650px] overflow-auto">
          {renderBranch(filtered, 0)}
        </div>
      </div>
    </main>
  );
}
