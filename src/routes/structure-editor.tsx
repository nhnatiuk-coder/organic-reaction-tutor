import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Component, Suspense, lazy, type ReactNode } from "react";

const IsolatedKetcherEditor = lazy(
  () => import("@/components/IsolatedKetcherEditor"),
);

export const Route = createFileRoute("/structure-editor")({
  head: () => ({ meta: [{ title: "Molecule drawing editor" }] }),
  component: StructureEditorPage,
});

function LoadingEditor() {
  return (
    <div
      className="flex h-full items-center justify-center text-sm text-muted-foreground"
      role="status"
    >
      Loading structure editor…
    </div>
  );
}

class EditorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed) {
      return (
        <div
          className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm"
          role="alert"
        >
          <p>This drawing editor could not load.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border px-3 py-2"
          >
            Reload this editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StructureEditorPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <EditorBoundary>
        <ClientOnly fallback={<LoadingEditor />}>
          <Suspense fallback={<LoadingEditor />}>
            <IsolatedKetcherEditor />
          </Suspense>
        </ClientOnly>
      </EditorBoundary>
    </main>
  );
}
