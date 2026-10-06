import { useEffect, useId, useRef, useState } from "react";
import {
  getSchemeDisplaySmiles,
  TOSYLATE_DISPLAY_ATOM,
  TOSYLATE_DISPLAY_ATOM_CLASS,
} from "@/lib/scheme-abbreviations";

type Props = {
  smiles: string;
  /** Accessible description of the structure, e.g. "1-bromopropane". */
  label: string;
  width?: number;
  height?: number;
  /** Add the complementary 3D bond for the hydrogen at a stereocentre. */
  showCompleteStereoDepiction?: boolean;
  /**
   * Use the teaching convention H on a dashed bond and the smallest carbon
   * substituent on a solid wedge. Used when configuration is shown but not
   * itself graded, such as the constrained E2 schemes.
   */
  preferHydrogenDashed?: boolean;
};

type StereoVertex = {
  id: number;
  neighbours: number[];
  position: { x: number; y: number };
  value: {
    element: string;
    isStereoCenter: boolean;
    isDrawn: boolean;
    class?: number;
    attachPseudoElement?: (
      element: string,
      previousElement: string,
      hydrogenCount: number,
      charge: number,
    ) => void;
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
    initPseudoElements?: () => void;
  };
};

/** Use the library's own label positioning and bond masking, rather than
 * placing text over an already laid-out sulfonate/benzene drawing. */
function configureTosylateAbbreviations(rawDrawer: unknown): boolean {
  const preprocessor = (rawDrawer as StereoCapableDrawer).preprocessor;
  const abbreviate = preprocessor?.initPseudoElements;
  if (!preprocessor || !abbreviate) return false;

  preprocessor.initPseudoElements = () => {
    abbreviate.call(preprocessor);
    preprocessor.graph?.vertices.forEach((vertex) => {
      if (vertex.value.class !== TOSYLATE_DISPLAY_ATOM_CLASS) return;
      vertex.value.attachPseudoElement?.("Ts", "C", 0, 0);
    });
  };
  return true;
}

/**
 * SmilesDrawer normally marks a stereocentre with one stereobond. That is a
 * valid convention, but can be hard to read in a student practice question.
 * We change the graph before SmilesDrawer paints it so its own SVG renderer
 * draws both a solid wedge and a dashed wedge at every marked centre.
 */
function preferredCarbonSubstituent(
  centre: StereoVertex,
  neighbours: StereoVertex[],
) {
  return [...neighbours]
    .filter(
      (vertex) =>
        vertex.value.element === "C" &&
        !vertex.value.isStereoCenter &&
        vertex.id !== centre.id,
    )
    .sort((first, second) => {
      const firstDegree = first.neighbours.length;
      const secondDegree = second.neighbours.length;
      return firstDegree - secondDegree || first.id - second.id;
    })[0];
}

function addComplementaryStereoBonds(
  graph: StereoGraph,
  preferHydrogenDashed: boolean,
) {
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
      const carbonSubstituent = preferredCarbonSubstituent(centre, neighbours);

      if (preferHydrogenDashed && hydrogen && carbonSubstituent) {
        // These questions use chirality to show a reactive conformation but
        // do not grade R/S configuration. Keep the leaving group in the plane
        // and draw the conventional, easy-to-read H-dash / C-wedge pair.
        neighbours.forEach((vertex) => {
          graph.getEdge(centre.id, vertex.id).wedge = "";
        });
        graph.getEdge(centre.id, hydrogen.id).wedge = "down";
        graph.getEdge(centre.id, carbonSubstituent.id).wedge = "up";
        hydrogen.value.isDrawn = true;
        carbonSubstituent.value.isDrawn = true;
        return;
      }

      const hydrogenTarget =
        hydrogen?.id !== stereobond.vertex.id ? hydrogen : undefined;
      const complementTarget =
        hydrogenTarget ??
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
      complementaryBond.wedge = stereobond.edge.wedge === "up" ? "down" : "up";
      complementTarget.value.isDrawn = true;
    });
}

function configureCompleteStereoDepiction(
  rawDrawer: unknown,
  preferHydrogenDashed: boolean,
) {
  const preprocessor = (rawDrawer as StereoCapableDrawer).preprocessor;
  const annotate = preprocessor?.annotateStereochemistry;
  if (!preprocessor || !annotate) return;

  preprocessor.annotateStereochemistry = () => {
    annotate.call(preprocessor);
    if (preprocessor.graph) {
      addComplementaryStereoBonds(preprocessor.graph, preferHydrogenDashed);
    }
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
  preferHydrogenDashed = false,
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
          configureCompleteStereoDepiction(drawer, preferHydrogenDashed);
        }

        let displaySmiles = getSchemeDisplaySmiles(smiles);
        if (
          displaySmiles.includes(TOSYLATE_DISPLAY_ATOM) &&
          !configureTosylateAbbreviations(drawer)
        ) {
          // An incompatible renderer must still show the full, correct group.
          displaySmiles = smiles;
        }

        api.parse(
          displaySmiles,
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
  }, [
    smiles,
    width,
    height,
    showCompleteStereoDepiction,
    preferHydrogenDashed,
    svgId,
  ]);

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
