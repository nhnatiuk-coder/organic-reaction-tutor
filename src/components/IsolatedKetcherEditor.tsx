import "ketcher-react/dist/index.css";

import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import type { Ketcher } from "ketcher-core";
import { useEffect, useState } from "react";

type EditorWindow = Window & { ketcher?: Ketcher };

/** Mounted only on /structure-editor, with exactly one editor per window. */
export default function IsolatedKetcherEditor() {
  const [provider] = useState(() => new StandaloneStructServiceProvider());
  useEffect(
    () => () => {
      delete (window as EditorWindow).ketcher;
    },
    [],
  );

  return (
    <Editor
      staticResourcesUrl=""
      structServiceProvider={provider}
      disableMacromoleculesEditor
      errorHandler={(message: string) => console.error("Ketcher:", message)}
      onInit={(ketcher: Ketcher) => {
        (window as EditorWindow).ketcher = ketcher;
        if (window.parent !== window) {
          window.parent.postMessage(
            { type: "organic-tutor-editor-ready" },
            window.location.origin,
          );
        }
      }}
    />
  );
}
