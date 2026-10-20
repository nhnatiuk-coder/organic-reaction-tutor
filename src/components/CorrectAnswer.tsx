import SmilesStructure from "./SmilesStructure";

export default function CorrectAnswer({
  products,
  solved,
}: {
  products: { label: string; name: string; smiles: string }[];
  solved: boolean;
}) {
  return (
    <section
      aria-label="Correct answer"
      className="mt-6 rounded-xl border border-primary/30 bg-card p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-card-foreground">
        {products.length > 1 ? "Correct answers" : "Correct answer"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {solved
          ? "You answered correctly."
          : "You have used all three attempts."}{" "}
        Compare your drawing with the model
        {products.length > 1 ? " products" : " product"}, then continue to the
        next problem. Your report keeps the result of your own final check.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <figure
            key={product.label}
            className="min-w-0 rounded-lg border border-border bg-white p-4"
          >
            <figcaption className="text-sm font-semibold text-card-foreground">
              {products.length > 1 && (
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  {product.label}
                </span>
              )}
              {product.name}
            </figcaption>
            <SmilesStructure
              smiles={product.smiles}
              label={product.name}
              width={460}
              height={300}
              showCompleteStereoDepiction={product.smiles.includes("@")}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
