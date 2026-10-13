import { useEffect, useId, useRef, useState } from "react";
import {
  configureCompleteStereoDepiction,
  STEREO_DRAWING_OPTIONS,
} from "@/lib/stereo-depiction";
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
function configureTosylateAbbreviations(
  rawDrawer: unknown,
  keepStereoBranchesExplicit: boolean,
): boolean {
  const preprocessor = (rawDrawer as StereoCapableDrawer).preprocessor;
  const abbreviate = preprocessor?.initPseudoElements;
  if (!preprocessor || !abbreviate) return false;

  preprocessor.initPseudoElements = () => {
    if (!keepStereoBranchesExplicit) abbreviate.call(preprocessor);
    preprocessor.graph?.vertices.forEach((vertex) => {
      if (vertex.value.class !== TOSYLATE_DISPLAY_ATOM_CLASS) return;
      vertex.value.attachPseudoElement?.("Ts", "C", 0, 0);
    });
  };
  return true;
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
          ...(showCompleteStereoDepiction ? STEREO_DRAWING_OPTIONS : {}),
        });
        if (showCompleteStereoDepiction) {
          configureCompleteStereoDepiction(drawer);
        }

        const abbreviationsConfigured = configureTosylateAbbreviations(
          drawer,
          showCompleteStereoDepiction,
        );
        let displaySmiles = getSchemeDisplaySmiles(smiles);
        if (
          displaySmiles.includes(TOSYLATE_DISPLAY_ATOM) &&
          !abbreviationsConfigured
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
