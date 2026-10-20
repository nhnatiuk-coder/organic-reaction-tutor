import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import SmilesDrawer from "smiles-drawer";
import Indigo from "indigo-ketcher";

const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(resolve(tmpdir(), "stereo-depiction-check-"));
try {
  for (const name of [
    "curated-practice-bank",
    "question-settings",
    "sn1-nucleophiles",
    "alkene-geometry",
    "scheme-abbreviations",
    "questions",
    "expanded-practice-bank.generated",
    "stereo-depiction",
    "practice-attempts",
    "answer-keys.server",
    "mixed-sn1-targets.server",
    "mixed-practice",
    "expanded-answer-keys.generated.server",
  ]) {
    const source = readFileSync(resolve(root, `src/lib/${name}.ts`), "utf8");
    const compiled = ts
      .transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
        },
      })
      .outputText.replace(/from "\.\/([^"\n]+)"/g, 'from "./$1.mjs"');
    writeFileSync(resolve(temporary, `${name}.mjs`), compiled);
  }
  const load = (name) =>
    import(pathToFileURL(resolve(temporary, `${name}.mjs`)).href);
  const { PRACTICE_QUESTIONS, getQuestionReference } = await load("questions");
  const { ANSWER_KEYS } = await load("answer-keys.server");
  const { getSchemeDisplaySmiles, TOSYLATE_DISPLAY_ATOM_CLASS } = await load(
    "scheme-abbreviations",
  );
  const { configureCompleteStereoDepiction, STEREO_DRAWING_OPTIONS } =
    await load("stereo-depiction");
  const indigo = await Indigo();
  const options = new indigo.MapStringString();

  // Independently read the actual drawn coordinates and wedge marks as an MDL
  // molecule. Matching the full InChIKey checks configuration as well as bonds.
  function drawingMolfile(graph) {
    const field = (value) => String(value).padStart(3);
    const lines = [
      "Stereo depiction validation",
      "  Tutor 2D",
      "",
      field(graph.vertices.length) +
        field(graph.edges.length) +
        "  0  0  1  0            999 V2000",
    ];
    for (const vertex of graph.vertices) {
      lines.push(
        (vertex.position.x / 42).toFixed(4).padStart(10) +
          (-vertex.position.y / 42).toFixed(4).padStart(10) +
          "    0.0000 " +
          vertex.value.element.padEnd(3) +
          " 0  0  0  0  0  0  0  0  0  0  0  0",
      );
    }
    for (const edge of graph.edges) {
      let first = edge.sourceId;
      let second = edge.targetId;
      if (edge.wedge && !graph.vertices[first].value.isStereoCenter)
        [first, second] = [second, first];
      const order =
        edge.bondType === "="
          ? 2
          : edge.bondType === "#"
            ? 3
            : edge.isPartOfAromaticRing
              ? 4
              : 1;
      const stereo = edge.wedge === "up" ? 1 : edge.wedge === "down" ? 6 : 0;
      lines.push(
        field(first + 1) +
          field(second + 1) +
          field(order) +
          field(stereo) +
          "  0  0  0",
      );
    }
    // The display-only Ts marker is a bare [O:999], not an alcohol oxygen.
    // Preserve its unsatisfied valence when reading that abbreviated graph.
    const markers = graph.vertices.filter(
      (vertex) => vertex.value.class === TOSYLATE_DISPLAY_ATOM_CLASS,
    );
    if (markers.length)
      lines.push(
        "M  RAD" +
          field(markers.length) +
          markers
            .map((vertex) => String(vertex.id + 1).padStart(4) + "   2")
            .join(""),
      );
    return [...lines, "M  END"].join("\n");
  }

  let drawingsChecked = 0;
  const questions = PRACTICE_QUESTIONS.filter((question) =>
    question.substrateSmiles?.includes("@"),
  );
  assert.ok(
    questions.some((question) => getQuestionReference(question) === "RXN-0680"),
  );
  assert.ok(questions.some((question) => question.id === "q58"));
  assert.ok(questions.some((question) => question.id === "q59"));
  const productDrawings = PRACTICE_QUESTIONS.flatMap((question) => {
    const answer = ANSWER_KEYS.find((key) => key.id === question.id);
    const targets = "correct" in answer ? [answer] : [answer.substitution, answer.elimination];
    return targets.filter((target) => target.correctSmiles?.includes("@")).map((target) => ({
      ...question,
      substrateSmiles: target.correctSmiles,
    }));
  });
  for (const question of [...questions, ...productDrawings]) {
    for (const smiles of new Set([
      question.substrateSmiles,
      getSchemeDisplaySmiles(question.substrateSmiles),
    ])) {
      const drawer = new SmilesDrawer.SvgDrawer({
        ...STEREO_DRAWING_OPTIONS,
        compactDrawing: false,
      });
      configureCompleteStereoDepiction(drawer);
      const tree = SmilesDrawer.Parser.parse(smiles);
      drawer.preprocessor.initDraw(tree, "light", true);
      drawer.preprocessor.processGraph();
      const graph = drawer.preprocessor.graph;
      for (const ring of drawer.preprocessor.rings) {
        const centroid = ring.members.reduce(
          (sum, id) => ({
            x: sum.x + graph.vertices[id].position.x / ring.members.length,
            y: sum.y + graph.vertices[id].position.y / ring.members.length,
          }),
          { x: 0, y: 0 },
        );
        assert.ok(
          Math.hypot(centroid.x - ring.center.x, centroid.y - ring.center.y) <
            1e-6,
          `${question.id}: aromatic ring centre no longer matches its bonds`,
        );
      }
      const centres = graph.vertices.filter(
        (vertex) => vertex.value.isStereoCenter,
      );
      assert.equal(
        centres.length,
        (smiles.match(/@{1,2}/g) ?? []).length,
        `${question.id}: a marked centre disappeared`,
      );
      for (const centre of centres) {
        const neighbours = centre.neighbours.map((id) => graph.vertices[id]);
        const marks = neighbours
          .map((vertex) => graph.getEdge(centre.id, vertex.id).wedge)
          .filter(Boolean)
          .sort();
        assert.deepEqual(
          marks,
          ["down", "up"],
          `${question.id}: centre ${centre.id} lacks a wedge/dash pair`,
        );
        const hasNonCarbonLigand = neighbours.some(
          (vertex) => !["C", "H"].includes(vertex.value.element),
        );
        const planarCarbons = neighbours.filter(
          (vertex) =>
            vertex.value.element === "C" &&
            !graph.getEdge(centre.id, vertex.id).wedge,
        );
        if (planarCarbons.length === 2) {
          const angles = planarCarbons.map((vertex) =>
            Math.atan2(
              vertex.position.y - centre.position.y,
              vertex.position.x - centre.position.x,
            ),
          );
          const degrees =
            (Math.abs(
              Math.atan2(
                Math.sin(angles[0] - angles[1]),
                Math.cos(angles[0] - angles[1]),
              ),
            ) *
              180) /
            Math.PI;
          assert.ok(
            degrees >= 95 && degrees <= 140,
            `${question.id}: planar C–C*–C angle is ${degrees.toFixed(1)}°, not a tetrahedral zigzag`,
          );
        }
        for (const vertex of neighbours.filter(
          (vertex) => vertex.value.element === "C",
        )) {
          if (hasNonCarbonLigand || vertex.value.isStereoCenter) {
            assert.ok(
              !graph.getEdge(centre.id, vertex.id).wedge,
              `${question.id}: carbon backbone moved out of the plane`,
            );
          }
        }
        if (!hasNonCarbonLigand) {
          const carbonBranches = neighbours.filter(
            (vertex) =>
              vertex.value.element === "C" && !vertex.value.isStereoCenter,
          );
          const markedBranch = carbonBranches.find(
            (vertex) => graph.getEdge(centre.id, vertex.id).wedge,
          );
          assert.equal(
            markedBranch?.neighbours.length,
            Math.min(
              ...carbonBranches.map((vertex) => vertex.neighbours.length),
            ),
            `${question.id}: the small side branch should carry the stereo mark`,
          );
        }
        const hydrogen = neighbours.find(
          (vertex) => vertex.value.element === "H",
        );
        assert.ok(hydrogen?.value.isDrawn, `${question.id}: hydrogen hidden`);
        const hydrogenAngle = Math.atan2(
          hydrogen.position.y - centre.position.y,
          hydrogen.position.x - centre.position.x,
        );
        for (const vertex of neighbours.filter(
          (vertex) => vertex !== hydrogen,
        )) {
          const angle = Math.atan2(
            vertex.position.y - centre.position.y,
            vertex.position.x - centre.position.x,
          );
          const separation = Math.abs(
            Math.atan2(
              Math.sin(angle - hydrogenAngle),
              Math.cos(angle - hydrogenAngle),
            ),
          );
          assert.ok(
            separation >= Math.PI / 6 - 1e-5,
            `${question.id}: hydrogen crowds another bond`,
          );
          if (
            vertex.value.element === "C" &&
            vertex.neighbours.length === 1 &&
            graph.getEdge(centre.id, vertex.id).wedge
          ) {
            assert.ok(
              vertex.value.drawExplicit,
              `${question.id}: methyl on the wedge is not labelled`,
            );
          }
        }
      }
      const expected = indigo.convert(smiles, "inchi-key", options);
      const drawn = indigo.convert(drawingMolfile(graph), "inchi-key", options);
      assert.equal(
        drawn,
        expected,
        `${getQuestionReference(question)}: displayed stereochemistry changed`,
      );
      drawingsChecked += 1;
    }
  }
  console.log(
    `Stereo drawings verified: ${questions.length} active questions, ${drawingsChecked} original/abbreviated structures, explicit wedge/dash pairs and matching full InChIKeys.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
