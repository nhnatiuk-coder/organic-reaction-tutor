import { useEffect, useId, useRef, useState } from "react";

type Props = {
  smiles: string;
  /** Accessible description of the structure, e.g. "1-bromopropane". */
  label: string;
  width?: number;
  height?: number;
  /** Add the complementary 3D bond for the hydrogen at a stereocentre. */
  showCompleteStereoDepiction?: boolean;
};

type Point = { x: number; y: number };

type StereoVertex = {
  id: number;
  neighbours: number[];
  position: Point;
  value: {
    element: string;
    isStereoCenter: boolean;
    isDrawn: boolean;
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

function pointsMatch(first: Point, second: Point) {
  return (
    Math.abs(first.x - second.x) < 0.1 && Math.abs(first.y - second.y) < 0.1
  );
}

function removePlainBond(svg: SVGSVGElement, first: Point, second: Point) {
  svg.querySelectorAll("line").forEach((line) => {
    const start = {
      x: Number(line.getAttribute("x1")),
      y: Number(line.getAttribute("y1")),
    };
    const end = {
      x: Number(line.getAttribute("x2")),
      y: Number(line.getAttribute("y2")),
    };
    if (
      (pointsMatch(start, first) && pointsMatch(end, second)) ||
      (pointsMatch(start, second) && pointsMatch(end, first))
    ) {
      line.remove();
    }
  });
}

/**
 * SmilesDrawer marks a stereocentre with one stereobond. Its parser creates
 * the bracketed H as a real vertex, so we turn that ordinary H bond into the
 * complementary stereobond. Each stereocentre therefore shows both a solid
 * wedge and a dashed wedge, rather than relying on the one-bond convention.
 */
function addComplementaryStereoBond(svg: SVGSVGElement, rawDrawer: unknown) {
  const graph = (rawDrawer as StereoCapableDrawer).preprocessor?.graph;
  if (!graph) return;

  graph.vertices
    .filter((centre) => centre.value.isStereoCenter)
    .forEach((centre) => {
      const neighbours = centre.neighbours
        .map((id) => graph.vertices[id])
        .filter((vertex): vertex is StereoVertex => Boolean(vertex));
      const stereobond = neighbours
        .map((vertex) => ({
          vertex,
          edge: graph.getEdge(centre.id, vertex.id),
        }))
        .find(({ edge }) => edge.wedge === "up" || edge.wedge === "down");
      if (!stereobond) return;

      const hydrogen = neighbours.find(
        (vertex) => vertex.value.element === "H",
      );
      const complementTarget =
        stereobond.vertex.value.element === "H"
          ? neighbours.find((vertex) => vertex.id !== stereobond.vertex.id)
          : hydrogen;
      if (!complementTarget) return;

      const dx = complementTarget.position.x - centre.position.x;
      const dy = complementTarget.position.y - centre.position.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) return;

      removePlainBond(svg, centre.position, complementTarget.position);
      const normal = { x: -dy / length, y: dx / length };
      const cueGroup = appendSvgElement(svg, "g", {
        "data-stereo-cue": "complementary-bond",
        fill: "#1f2937",
        stroke: "#1f2937",
      });

      if (stereobond.edge.wedge === "up") {
        for (let segment = 1; segment <= 6; segment += 1) {
          const progress = segment / 7;
          const point = {
            x: centre.position.x + dx * progress,
            y: centre.position.y + dy * progress,
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
      } else {
        const narrow = 0.7;
        const broad = 5.2;
        appendSvgElement(cueGroup, "polygon", {
          points: [
            `${centre.position.x + normal.x * narrow},${centre.position.y + normal.y * narrow}`,
            `${complementTarget.position.x + normal.x * broad},${complementTarget.position.y + normal.y * broad}`,
            `${complementTarget.position.x - normal.x * broad},${complementTarget.position.y - normal.y * broad}`,
            `${centre.position.x - normal.x * narrow},${centre.position.y - normal.y * narrow}`,
          ].join(" "),
        });
      }
    });
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
