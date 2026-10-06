import type { Ketcher } from "ketcher-core";
import { useEffect, useRef, useState } from "react";

type Props = {
  onInit: (ketcher: Ketcher | null) => void;
  title: string;
};

type EditorWindow = Window & { ketcher?: Ketcher };
const EDITOR_READY_MESSAGE = "organic-tutor-editor-ready";

/** Each frame has its own Ketcher globals, worker, and event handlers. Sharing
 * the library in the parent page lets the second editor replace the first. */
export default function KetcherCanvas({ onInit, title }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onInitRef = useRef(onInit);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  onInitRef.current = onInit;

  function connect() {
    const frameWindow = frameRef.current?.contentWindow as EditorWindow | null;
    const ketcher = frameWindow?.ketcher;
    if (!ketcher) return;
    onInitRef.current(ketcher);
    setReady(true);
    setSlow(false);
  }

  useEffect(() => {
    onInitRef.current(null);
    setReady(false);
    setSlow(false);

    const receiveReady = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        event.data?.type !== EDITOR_READY_MESSAGE
      ) {
        return;
      }
      connect();
    };
    window.addEventListener("message", receiveReady);
    // Also cover a cached editor that became ready before the listener mounted.
    connect();
    const timeout = window.setTimeout(() => setSlow(true), 30000);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveReady);
      onInitRef.current(null);
    };
  }, [attempt]);

  return (
    <div className="relative h-full w-full">
      <iframe
        key={attempt}
        ref={frameRef}
        src={`${import.meta.env.BASE_URL}structure-editor`}
        title={`${title} drawing editor`}
        className="block h-full w-full border-0"
        onLoad={() => {
          onInitRef.current(null);
          setReady(false);
          setSlow(false);
          connect();
        }}
      />
      {!ready && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/90 p-4 text-center text-sm text-muted-foreground"
          role="status"
        >
          <p>
            {slow
              ? "This drawing editor is taking longer to load."
              : "Loading structure editor…"}
          </p>
          {slow && (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="rounded-md border border-border bg-background px-3 py-2 text-card-foreground"
            >
              Reload this editor
            </button>
          )}
        </div>
      )}
    </div>
  );
}
