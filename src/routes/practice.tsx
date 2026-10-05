import { createFileRoute } from "@tanstack/react-router";

import { PracticePage } from "./index";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Organic Reaction Drawing Practice" },
      {
        name: "description",
        content:
          "Practice drawing major organic reaction products with instant structural feedback.",
      },
    ],
  }),
  component: StudentPracticePage,
});

function StudentPracticePage() {
  return <PracticePage studentView />;
}
