import { useEffect, useId, useRef, useState } from "react";

type Props = {
  smiles: string;
  /** Accessible description of the structure, e.g. "1-bromopropane". */
  label: string;
  width?: number;
  height?: number;
  /** Add the complementary 3D bond for an implicit hydrogen at a stereocentre. */
  showCompleteStereoDepiction?: boolean;
};

type Point = { x: number; y: number };

type StereoVertex = {
  id: number;
  neighbours: number[];
  position: Point;
  value: {
    isStereoCenter: boolean;
    countImplicitHydrogens: () => number;
  };
};

type StereoGraph = {
  vertices: StereoVertex[];
  getEdge: (
    firstId: number,
    secondId: number,
  ) => {
    wedge?: "up" | "down" | "";
  };
};

type StereoCapableDrawer = {
  preprocessor?: {
    graph?: StereoGraph;
    opts?: { bondLength?: number };
  };
};

const SVG_NS = "http://www.w3.org/2000/svg";

function appendSvgElement<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tagName: K,
  attributes: Record<string, string | number>,
) {
  const element = document.createElementNS(SVG_NS, tagName);
  Object.entries(attributes).forEach(([name, value]) =>
    element.setAttribute(name, String(value)),
  );
  parent.appendChild(element);
  return element;
}

function openBondAngle(center: Point, neighbours: Point[]) {
  const angles = neighbours
    .map((neighbour) =>
      Math.atan2(neighbour.y - center.y, neighbour.x - center.x),
    )
    .sort((first, second) => first - second);

  if (angles.length === 0) return -Math.PI / 2;

  let widestGap = -1;
  let startAngle = angles[0]!;
  for (let index = 0; index < angles.length; index += 1) {
    const start = angles[index]!;
    const end =
      index === angles.length - 1
        ? angles[0]! + Math.PI * 2
        : angles[index + 1]!;
    const gap = end - start;
    if (gap > widestGap) {
      widestGap = gap;
      startAngle = start;
    }
  }

  return startAngle + widestGap / 2;
}

/**
 * SmilesDrawer represents an implicit-H stereocentre with one stereobond.
 * Add the complementary virtual H bond so the displayed structure always
 * contains both a solid wedge and a dashed wedge, as students expect in a
 * tetrahedral drawing.
 */
function addComplementaryStereoBond(svg: SVGSVGElement, rawDrawer: unknown) {
  const graph = (rawDrawer as StereoCapableDrawer).preprocessor?.graph;
  const bondLength =
    (rawDrawer as StereoCapableDrawer).preprocessor?.opts?.bondLength ?? 30;
  if (!graph) return;

  const centre = graph.vertices.find(
    (vertex) =>
      vertex.value.isStereoCenter &&
      vertex.value.countImplicitHydrogens() === 1,
  );
  if (!centre) return;

  const neighbourVertices = centre.neighbours
    .map((id) => graph.vertices[id])
    .filter((vertex): vertex is StereoVertex => Boolean(vertex));
  const stereobond = neighbourVertices
    .map((vertex) => ({ vertex, edge: graph.getEdge(centre.id, vertex.id) }))
    .find(({ edge }) => edge.wedge === "up" || edge.wedge === "down");
  if (!stereobond) return;

  const angle = openBondAngle(
    centre.position,
    neighbourVertices.map((vertex) => vertex.position),
  );
  const length = bondLength * 0.83;
  const end = {
    x: centre.position.x + Math.cos(angle) * length,
    y: centre.position.y + Math.sin(angle) * length,
  };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const cueGroup = appendSvgElement(svg, "g", {
    "data-stereo-cue": "implicit-hydrogen",
    fill: "#1f2937",
    stroke: "#1f2937",
  });

  if (stereobond.edge.wedge === "up") {
    const narrow = 0.7;
    const broad = 5.2;
    appendSvgElement(cueGroup, "polygon", {
      points: [
        `${centre.position.x + normal.x * narrow},${centre.position.y + normal.y * narrow}`,
        `${end.x + normal.x * broad},${end.y + normal.y * broad}`,
        `${end.x - normal.x * broad},${end.y - normal.y * broad}`,
        `${centre.position.x - normal.x * narrow},${centre.position.y - normal.y * narrow}`,
      ].join(" "),
    });
  } else {
    for (let segment = 1; segment <= 6; segment += 1) {
      const progress = segment / 7;
      const point = {
        x: centre.position.x + (end.x - centre.position.x) * progress,
        y: centre.position.y + (end.y - centre.position.y) * progress,
      };
      const halfWidth = 0.7 + 4.4 * progress;
      appendSvgElement(cueGroup, "line", {
        x1: point.x + normal.x * halfWidth,
        y1: point.y + normal.y * halfWidth,
        x2: point.x - normal.x * halfWidth,
        y2: point.y - normal.y * halfWidth,
        "stroke-width": 1.25,
      });
    }
  }

  appendSvgElement(cueGroup, "text", {
    x: end.x + normal.x * 8,
    y: end.y + normal.y * 8 + 3,
    "font-size": 9,
    "font-family": "Arial, Helvetica, sans-serif",
    "font-weight": 600,
    stroke: "none",
  }).textContent = "H";

  const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some(Number.isNaN)) return;
  const [x, y, width, height] = viewBox;
  const padding = 14;
  const minX = Math.min(x, end.x - padding);
  const minY = Math.min(y, end.y - padding);
  const maxX = Math.max(x + width, end.x + padding);
  const maxY = Math.max(y + height, end.y + padding);
  svg.setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
}

/**
 * Renders a 2D skeletal structure from SMILES. Client-only: the drawing library
 * is imported dynamically after hydration.
 */
export default function SmilesStructure({
  smiles,
  label,
  width = 220,
  height = 150,
  showCompleteStereoDepiction = false,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const rawId = useId();
  const svgId = `struct-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    (async () => {
      try {
        const mod = await import("smiles-drawer");
        const SmilesDrawer =
          (mod as unknown as { default?: unknown }).default ?? mod;
        const api = SmilesDrawer as unknown as {
          SvgDrawer: new (options: Record<string, unknown>) => {
            draw: (tree: unknown, target: string, theme: string) => void;
          };
          parse: (
            smiles: string,
            onSuccess: (tree: unknown) => void,
            onError: (err: unknown) => void,
          ) => void;
        };

        if (cancelled || !ref.current) return;
        ref.current.innerHTML = "";

        const drawer = new api.SvgDrawer({
          width,
          height,
          bondThickness: 1.1,
          padding: 12,
          terminalCarbons: false,
        });

        api.parse(
          smiles,
          (tree) => {
            if (cancelled || !ref.current) return;
            try {
              drawer.draw(tree, svgId, "light");
              if (showCompleteStereoDepiction && ref.current) {
                addComplementaryStereoBond(ref.current, drawer);
              }
            } catch {
              setFailed(true);
            }
          },
          () => setFailed(true),
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [smiles, width, height, showCompleteStereoDepiction, svgId]);

  if (failed) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="img"
        aria-label={label}
      >
        {label}
      </p>
    );
  }

  return (
    <svg
      id={svgId}
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={`Skeletal structure of ${label}`}
      className="h-auto max-w-full"
    />
  );
}
