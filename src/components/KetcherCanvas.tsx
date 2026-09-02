import "ketcher-react/dist/index.css";

import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import type { Ketcher } from "ketcher-core";
import { useState } from "react";

type Props = {
  onInit: (ketcher: Ketcher) => void;
};

export default function KetcherCanvas({ onInit }: Props) {
  const [provider] = useState(() => new StandaloneStructServiceProvider());

  return (
    <Editor
      staticResourcesUrl=""
      structServiceProvider={provider}
      errorHandler={(message: string) => console.error("Ketcher:", message)}
      onInit={onInit}
    />
  );
}
