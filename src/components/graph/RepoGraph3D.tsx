"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { ForceGraphMethods } from "react-force-graph-3d";
import { MOUSE } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  connectionKey,
  type ImpactResult,
} from "@/lib/graph-impact";
import type { FolderGrouping } from "@/lib/folder-groups";

import {
  createFolderClusterForce,
  getFolderColor,
} from "@/lib/folder-visuals";


type RepoFile = {
  id: string;
  name: string;
  kind: "entry" | "feature" | "shared";
};

type Props = {
  files: readonly RepoFile[];
  connections: readonly (readonly [string, string])[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  impact?: ImpactResult | null;
  cycleFocusIds: readonly string[] | null;
  folderGrouping: FolderGrouping;
  visibleFolderIds: ReadonlySet<string> | null;
  colorByFolder: boolean;
  labelFontSize: number;
  labelsVisible: boolean;
  onLabelFontSizeChange: (size: number) => void;
  onLabelsVisibleChange: (visible: boolean) => void;
};

const COLORS = {
  entry: "#f2a36b",
  feature: "#23d1ad",
  shared: "#6ca9d9",
};

function endpointId(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object" && "id" in value) {
    return String(value.id);
  }

  return "";
}

export default function RepoGraph3D({
  files,
  connections,
  selectedId,
  onSelect,
  impact,
  cycleFocusIds,
  folderGrouping,
  visibleFolderIds,
  colorByFolder,
  labelFontSize,
  labelsVisible,
  onLabelFontSizeChange,
  onLabelsVisibleChange,
}: Props) {
  
  const cycleSet = useMemo(
    () => new Set(cycleFocusIds ?? []),
    [cycleFocusIds]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  
  const didInitialFit = useRef(false);

  // Renderizador para las etiquetas 2D.
  const extraRenderers = useMemo(() => {
    const renderer = new CSS2DRenderer();

    // Las etiquetas no deben bloquear el ratón.
    renderer.domElement.style.pointerEvents = "none";

    return [renderer];
  }, []);

  // Actualizar las etiquetas sin reconstruir el grafo 3D.
  useEffect(() => {
    const renderer = extraRenderers[0];

    if (!renderer) return;

    renderer.domElement.style.setProperty(
      "--repoatlas-label-font-size",
      `${labelFontSize}px`
    );

    renderer.domElement.style.setProperty(
      "--repoatlas-label-visibility",
      labelsVisible ? "visible" : "hidden"
    );
  }, [extraRenderers, labelFontSize, labelsVisible]);

  // Crear una etiqueta para cada archivo.
  const renderNodeLabel = useCallback(
    (node: {
      id?: string | number;
      name?: string;
      degree?: number;
    }) => {
      const element = document.createElement("div");

      element.textContent = node.name ?? String(node.id ?? "");

      element.style.cssText = `
        font-family: Consolas, monospace;
        font-size: var(--repoatlas-label-font-size, 8px);
        font-weight: 600;
        line-height: 1.2;
        color: #e6f4f6;
        background: rgba(10, 20, 31, 0.88);
        border: 1px solid #365261;
        border-radius: 4px;
        padding: 2px 5px;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
        visibility: var(--repoatlas-label-visibility, visible);
      `;

      const label = new CSS2DObject(element);

      // Colocar la etiqueta encima de la esfera.
      const radius =
        5 * Math.cbrt(Math.max(1, node.degree ?? 1));

      label.position.set(0, radius + 5, 0);

      return label;
    },
    []
  );


  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });
  // Agrupar físicamente los nodos por carpetas.
  // No modificar la cámara al cambiar de grupo.
  useEffect(() => {
    if (size.width === 0 || size.height === 0) {
      return;
    }

    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    graph.d3Force(
      "folder-cluster",
      createFolderClusterForce(folderGrouping)
    );

    graph.d3ReheatSimulation();
  }, [folderGrouping, size.width, size.height]);


  // Construir el grafo una sola vez por conjunto de datos.
  const graphData = useMemo(() => ({
    nodes: files.map((file) => ({
      id: file.id,
      name: file.name,
      degree:
        1 +
        connections.filter(
          ([source, target]) =>
            source === file.id || target === file.id
        ).length,
    })),
    links: connections.map(([source, target]) => ({
      source,
      target,
    })),
  }), [files, connections]);

  const fileColors = useMemo(
    () => new Map(
      files.map((file) => [file.id, COLORS[file.kind]])
    ),
    [files]
  );

  // Archivos relacionados con el seleccionado.
  const related = useMemo(() => {
    const result = new Set<string>();

    if (!selectedId) return result;

    result.add(selectedId);

    for (const [source, target] of connections) {
      if (source === selectedId) result.add(target);
      if (target === selectedId) result.add(source);
    }

    return result;
  }, [selectedId, connections]);

  // Adaptar el canvas al tamaño del panel.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Botón derecho: girar la cámara.
  // Botón izquierdo: desplazar la vista.
  useEffect(() => {
    if (!size.width || !size.height) return;

    const controls = graphRef.current?.controls() as
      | OrbitControls
      | undefined;

    if (!controls) return;

    controls.mouseButtons = {
      LEFT: MOUSE.PAN,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    };
  }, [size.width, size.height]);

  function isSelectedLink(
    source: unknown,
    target: unknown
  ) {
    return (
      selectedId !== null &&
      (endpointId(source) === selectedId ||
        endpointId(target) === selectedId)
    );
  }

  function isImpactLink(
  source: unknown,
  target: unknown
): boolean {
  if (!impact) return false;

  return impact.highlightedEdges.has(
    connectionKey(
      endpointId(source),
      endpointId(target)
    )
  );
}

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      onContextMenu={(event) => event.preventDefault()}
    >
      {size.width > 0 && size.height > 0 && (
        <ForceGraph3D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          extraRenderers={extraRenderers}
          nodeThreeObject={renderNodeLabel}
          nodeThreeObjectExtend={true}
          backgroundColor="#0a121c"
          controlType="orbit"
          showNavInfo={false}
          enableNodeDrag={false}
          nodeLabel={labelsVisible ? "name" : ""}
          nodeVal="degree"
          nodeRelSize={5}
          nodeResolution={10}
          nodeOpacity={0.9}
          nodeColor={(node) => {
            const id = String(node.id);
            
            if (cycleFocusIds !== null) {
              return cycleSet.has(id)
                ? "#f4a261"
                : "#293c4a";
            }

            if (impact) {
              if (id === impact.selectedId) {
                return "#31e0b9";
              }

              if (impact.depthById.get(id) === 1) {
                return "#eda65d";
              }

              if (impact.depthById.has(id)) {
                return "#ae92f1";
              }

              return "#293c4a";
            }

            if (selectedId && !related.has(id)) {
              return "#293c4a";
            }

            if (id === selectedId) {
              return "#91ffe3";
            }

            if (colorByFolder) {
              return getFolderColor(
                folderGrouping.fileToGroup.get(id) ?? "folder:."
              );
            }

            return fileColors.get(id) ?? "#23d1ad";
          }}
                    
          linkColor={(link) => {
            if (cycleFocusIds !== null) {
              const source = endpointId(link.source);
              const target = endpointId(link.target);

              return cycleSet.has(source) && cycleSet.has(target)
                ? "#f4a261"
                : "#263847";
            }

            if (impact) {
              if (!isImpactLink(link.source, link.target)) {
                return "#263847";
              }

              const depth = impact.depthById.get(
                endpointId(link.source)
              );

              return depth === 1
                ? "#eda65d"
                : "#ae92f1";
            }

            return selectedId === null
              ? "#426577"
              : isSelectedLink(link.source, link.target)
                ? "#36edc2"
                : "#243744";
          }}

          linkWidth={(link) => {
            if (cycleFocusIds !== null) {
              const highlighted =
                cycleSet.has(endpointId(link.source)) &&
                cycleSet.has(endpointId(link.target));

              return highlighted ? 2.8 : 0.4;
            }

            if (impact) {
              return isImpactLink(link.source, link.target)
                ? 2.5
                : 0.4;
            }

            return isSelectedLink(link.source, link.target)
              ? 2
              : 0.7;
          }}

          linkOpacity={0.75}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalParticles={(link) =>
            cycleFocusIds !== null || impact
              ? 0
              : isSelectedLink(link.source, link.target)
                ? 2
                : 0
          }
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          cooldownTicks={120}
          onEngineStop={() => {
            if (didInitialFit.current) return;

            didInitialFit.current = true;
            graphRef.current?.zoomToFit(400, 80);
          }}
          onNodeClick={(node) => onSelect(String(node.id))}
          onBackgroundClick={() => onSelect(null)}
          
          nodeVisibility={(node) =>
            visibleFolderIds === null ||
            visibleFolderIds.has(String(node.id))
          }

          linkVisibility={(link) =>
            visibleFolderIds === null ||
            (
              visibleFolderIds.has(endpointId(link.source)) &&
              visibleFolderIds.has(endpointId(link.target))
            )
          }

        />
      )}

      {/* 3D LABEL CONTROLS */}
      <div className="pointer-events-auto absolute bottom-4 left-4 z-20 w-[230px] rounded-lg border border-[#293d4b] bg-[#0d1824]/95 p-4 shadow-lg">

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#a9c3cc]">
            3D LABELS
          </span>

          <button
            type="button"
            onClick={() => onLabelsVisibleChange(!labelsVisible)}
            aria-label={
              labelsVisible
                ? "Ocultar etiquetas 3D"
                : "Mostrar etiquetas 3D"
            }
            className={`cursor-pointer rounded-md border px-3 py-1.5 font-mono text-[10px] transition-colors ${
              labelsVisible
                ? "border-[#278e79] bg-[#154b3e] text-[#a4ffe1]"
                : "border-[#405365] bg-[#1a2733] text-[#9aafbd]"
            }`}
          >
            {labelsVisible ? "VISIBLE" : "HIDDEN"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label
            htmlFor="repoatlas-label-size"
            className="font-mono text-[10px] text-[#819eae]"
          >
            LABEL SIZE
          </label>

          <span className="font-mono text-xs text-[#36dbb8]">
            {labelFontSize} px
          </span>
        </div>

        <input
          id="repoatlas-label-size"
          type="range"
          min={6}
          max={16}
          step={1}
          value={labelFontSize}
          onChange={(event) =>
            onLabelFontSizeChange(Number(event.target.value))
          }
          aria-label="Tamaño de las etiquetas 3D"
          className="mt-3 w-full cursor-pointer accent-[#2bd6af]"
        />

        <div className="mt-1 flex justify-between font-mono text-[9px] text-[#637d8e]">
          <span>SMALL</span>
          <span>LARGE</span>
        </div>

        <div className="mt-4 border-t border-[#293d4b] pt-3 font-mono text-[9px] leading-5 text-[#7894a6]">
          <div>RIGHT DRAG — ROTATE</div>
          <div>LEFT DRAG — PAN</div>
          <div>SCROLL — ZOOM</div>
        </div>

      </div>
    </div>
  );
}
