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

type StereoVertex = {
  id: number;
  neighbours: number[];
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
    annotateStereochemistry?: () => void;
  };
};

/**
 * SmilesDrawer normally marks a stereocentre with one stereobond. That is a
 * valid convention, but can be hard to read in a student practice question.
 * We change the graph before SmilesDrawer paints it so its own SVG renderer
 * draws both a solid wedge and a dashed wedge at every marked centre.
 */
function addComplementaryStereoBonds(graph: StereoGraph) {
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

      const complementTarget =
        neighbours.find(
          (vertex) =>
            vertex.value.element === "H" && vertex.id !== stereobond.vertex.id,
        ) ??
        neighbours.find((vertex) => {
          if (vertex.id === stereobond.vertex.id) return false;
          if (vertex.value.isStereoCenter) return false;
          const edge = graph.getEdge(centre.id, vertex.id);
          return edge.wedge !== "up" && edge.wedge !== "down";
        }) ??
        neighbours.find((vertex) => {
          if (vertex.id === stereobond.vertex.id) return false;
          const edge = graph.getEdge(centre.id, vertex.id);
          return edge.wedge !== "up" && edge.wedge !== "down";
        });
      if (!complementTarget) return;

      const complementaryBond = graph.getEdge(centre.id, complementTarget.id);
      complementaryBond.wedge =
        stereobond.edge.wedge === "up" ? "down" : "up";
      complementTarget.value.isDrawn = true;
    });
}

function configureCompleteStereoDepiction(rawDrawer: unknown) {
  const preprocessor = (rawDrawer as StereoCapableDrawer).preprocessor;
  const annotate = preprocessor?.annotateStereochemistry;
  if (!preprocessor || !annotate) return;

  preprocessor.annotateStereochemistry = () => {
    annotate.call(preprocessor);
    if (preprocessor.graph) addComplementaryStereoBonds(preprocessor.graph);
  };
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
        if (showCompleteStereoDepiction) {
          configureCompleteStereoDepiction(drawer);
        }

        api.parse(
          smiles,
          (tree) => {
            if (cancelled || !ref.current) return;
            try {
              drawer.draw(tree, svgId, "light");
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
