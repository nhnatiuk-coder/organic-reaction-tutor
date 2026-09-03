import { useEffect, useId, useRef, useState } from "react";

type Props = {
  smiles: string;
  /** Accessible description of the structure, e.g. "1-bromopropane". */
  label: string;
  width?: number;
  height?: number;
};

/**
 * Renders a 2D skeletal structure from SMILES. Client-only: the drawing library
 * is imported dynamically after hydration.
 */
export default function SmilesStructure({ smiles, label, width = 220, height = 150 }: Props) {
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
        const SmilesDrawer = (mod as unknown as { default?: unknown }).default ?? mod;
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
  }, [smiles, width, height, svgId]);

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground" role="img" aria-label={label}>
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
      className="max-w-full"
    />
  );
}
