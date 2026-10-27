
"use client";

import {
  ArrowUpRight,
  FileCode2,
  GitBranch,
} from "lucide-react";

type FileRecord = {
  id: string;
  name: string;
  path: string;
};

type FileInspectorProps = {
  selectedId: string | null;
  files: readonly FileRecord[];
  connections: readonly (readonly [string, string])[];
  repositoryName?: string | null;
  onSelect: (id: string) => void;
};

export function FileInspector({
  selectedId,
  files,
  connections,
  repositoryName,
  onSelect,
}: FileInspectorProps) {

  // Archivo seleccionado
  const selectedFile = files.find(
    (file) => file.id === selectedId
  );

  // Archivos que importa el seleccionado
  const imports = connections
    .filter(([source]) => source === selectedId)
    .map(([, target]) =>
      files.find((file) => file.id === target)
    )
    .filter((file): file is FileRecord => file !== undefined);

  // Archivos que dependen del seleccionado
  const dependents = connections
    .filter(([, target]) => target === selectedId)
    .map(([source]) =>
      files.find((file) => file.id === source)
    )
    .filter((file): file is FileRecord => file !== undefined);

  return (
    <aside className="border-t border-[#263442] bg-[#0c1420] p-5 xl:border-l xl:border-t-0">

      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between border-b border-[#243342] pb-4">
        <div className="font-mono text-[11px] tracking-widest text-[#90a7b7]">
          FILE INSPECTOR
        </div>

        <FileCode2
          size={17}
          className="text-[#658093]"
        />
      </div>

      {selectedFile ? (
        <div>

          {/* SELECTED FILE */}
          <div className="mb-4 inline-flex rounded-md border border-[#195b52] bg-[#12332d] px-2 py-1 font-mono text-[10px] text-[#49ddbd]">
            SELECTED NODE
          </div>

          <h2 className="break-all font-mono text-lg font-semibold text-[#eaf4f5]">
            {selectedFile.name}
          </h2>

          <div className="mt-2 break-all font-mono text-[11px] leading-relaxed text-[#738c9d]">
            {selectedFile.path}
          </div>

          <div className="my-6 h-px bg-[#263443]" />

          {/* METRICS */}
          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-lg border border-[#263443] bg-[#111d2a] p-3">
              <div className="font-mono text-[10px] text-[#7990a2]">
                IMPORTS
              </div>

              <div className="mt-2 font-mono text-xl text-[#2cdbb7]">
                {imports.length}
              </div>
            </div>

            <div className="rounded-lg border border-[#263443] bg-[#111d2a] p-3">
              <div className="font-mono text-[10px] text-[#7990a2]">
                DEPENDENTS
              </div>

              <div className="mt-2 font-mono text-xl text-[#e5b06a]">
                {dependents.length}
              </div>
            </div>

          </div>

          {/* DIRECT IMPORTS */}
          <div className="mt-8">
            <h3 className="mb-3 font-mono text-[11px] tracking-wider text-[#89a1b3]">
              DIRECT IMPORTS
            </h3>

            {imports.length > 0 ? (
              <div className="space-y-2">
                {imports.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelect(file.id)}
                    className="group flex w-full cursor-pointer items-start gap-2 rounded-lg border border-[#243442] bg-[#111d29] px-3 py-3 text-left transition-colors hover:border-[#278e79] hover:bg-[#16332f]"
                  >
                    <ArrowUpRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[#2bdbb3]"
                    />

                    <div className="min-w-0">
                      <div className="break-all font-mono text-[11px] text-[#c6dce4] group-hover:text-[#6bf2d0]">
                        {file.name}
                      </div>

                      <div className="mt-1 break-all font-mono text-[9px] text-[#627c8d]">
                        {file.path}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#698092]">
                No resolved direct imports.
              </p>
            )}
          </div>

          {/* REFERENCED BY */}
          <div className="mt-7">
            <h3 className="mb-3 font-mono text-[11px] tracking-wider text-[#89a1b3]">
              REFERENCED BY
            </h3>

            {dependents.length > 0 ? (
              <div className="space-y-2">
                {dependents.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelect(file.id)}
                    className="group flex w-full cursor-pointer items-start gap-2 rounded-lg border border-[#243442] bg-[#111d29] px-3 py-3 text-left transition-colors hover:border-[#b77a49] hover:bg-[#30251e]"
                  >
                    <GitBranch
                      size={14}
                      className="mt-0.5 shrink-0 text-[#e4a66d]"
                    />

                    <div className="min-w-0">
                      <div className="break-all font-mono text-[11px] text-[#c6dce4] group-hover:text-[#f0bc87]">
                        {file.name}
                      </div>

                      <div className="mt-1 break-all font-mono text-[9px] text-[#627c8d]">
                        {file.path}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#698092]">
                No resolved incoming references.
              </p>
            )}
          </div>

        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#304455] p-6 text-center">
          <FileCode2
            size={27}
            className="mx-auto mb-4 text-[#496b7c]"
          />

          <p className="text-sm text-[#8ba4b5]">
            No file selected
          </p>

          <p className="mt-2 text-xs leading-relaxed text-[#617b8d]">
            Select a node on the graph to inspect
            its dependencies and connections.
          </p>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-8 border-t border-[#263443] pt-5">
        <div className="font-mono text-[10px] leading-relaxed text-[#61798b]">
          {repositoryName ? (
            <>
              <span className="text-[#38dcb8]">
                LIVE REPOSITORY
              </span>

              <div className="mt-2 break-all">
                {repositoryName}
              </div>

              <p className="mt-2">
                Relationships represent resolved
                source-code imports.
              </p>
            </>
          ) : (
            <>
              PREVIEW BUILD — Sample repository
              relationships.
            </>
          )}
        </div>
      </div>

    </aside>
  );
}
