import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const SmilesStructure = lazy(() => import("./SmilesStructure"));

type Props = {
  substrateSmiles: string;
  substrateName: string;
  /** Text shown above the reaction arrow (reagents). */
  above: string;
  /** Text shown below the reaction arrow (conditions). */
  below: string;
  /** Optional anti-periplanar/chair-conformation instruction. */
  conformationalHint?: string;
};

function StructureFallback({ label }: { label: string }) {
  return (
    <div className="flex h-[150px] w-[220px] items-center justify-center rounded-md bg-muted/40 text-xs text-muted-foreground">
      {label}
    </div>
  );
}

export default function ReactionScheme({
  substrateSmiles,
  substrateName,
  above,
  below,
  conformationalHint,
}: Props) {
  return (
    <figure
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      aria-label={`Reaction scheme: ${substrateName} reacts with ${above} under ${below} to give an unknown major product.`}
    >
      <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap">
        <div className="shrink-0 rounded-md bg-background p-1">
          <ClientOnly fallback={<StructureFallback label={substrateName} />}>
            <Suspense fallback={<StructureFallback label={substrateName} />}>
              <SmilesStructure smiles={substrateSmiles} label={substrateName} />
            </Suspense>
          </ClientOnly>
        </div>

        <div className="flex min-w-[160px] flex-1 flex-col items-center gap-1" aria-hidden="true">
          <span className="text-center text-xs font-medium leading-tight text-card-foreground">
            {above}
          </span>
          <svg
            width="100%"
            height="16"
            viewBox="0 0 160 16"
            preserveAspectRatio="none"
            className="text-primary"
          >
            <line
              x1="2"
              y1="8"
              x2="146"
              y2="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <polygon points="158,8 144,3 144,13" fill="currentColor" />
          </svg>
          <span className="text-center text-xs leading-tight text-muted-foreground">
            {below}
          </span>
        </div>

        <div className="flex h-[150px] w-[150px] shrink-0 flex-col items-center justify-center rounded-md border-2 border-dashed border-primary/50 bg-accent/40 px-2 text-center">
          <span className="text-2xl font-semibold text-primary" aria-hidden="true">
            ?
          </span>
          <span className="mt-1 text-xs font-medium text-muted-foreground">
            Draw the major product in the editor
          </span>
        </div>
      </div>
      {conformationalHint && (
        <p className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-card-foreground">
          <span className="font-semibold">Conformational constraint: </span>
          {conformationalHint}
        </p>
      )}
      <figcaption className="sr-only">
        {substrateName} plus {above}, {below}. The product is left blank for you to draw in
        the structure editor.
      </figcaption>
    </figure>
  );
}
