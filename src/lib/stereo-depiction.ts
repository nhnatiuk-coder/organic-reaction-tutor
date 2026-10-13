type Position = { x: number; y: number };
export const STEREO_DRAWING_OPTIONS = {
  bondLength: 42,
  bondThickness: 1.5,
  padding: 24,
  fontSizeLarge: 13,
  fontSizeSmall: 8,
  explicitHydrogens: true,
  overlapResolutionIterations: 6,
};
export type StereoVertex = {
  id: number;
  neighbours: number[];
  position: Position;
  value: {
    element: string;
    isStereoCenter: boolean;
    isDrawn: boolean;
    drawExplicit?: boolean;
  };
};
type StereoEdge = { wedge?: "up" | "down" | "" };
export type StereoGraph = {
  vertices: StereoVertex[];
  getEdge: (firstId: number, secondId: number) => StereoEdge;
};
type StereoPreprocessor = {
  graph?: StereoGraph;
  annotateStereochemistry?: () => void;
  rings?: unknown[];
  setRingCenter?: (ring: unknown) => void;
};

/** Signed tetrahedral volume in the renderer's original neighbour order.
 * Comparing signs preserves the configuration without guessing which group
 * should face forward from the SMILES spelling or the screen orientation. */
function handedness(
  graph: StereoGraph,
  centre: StereoVertex,
  depths: ReadonlyMap<number, number>,
) {
  const points = centre.neighbours.map((id) => {
    const vertex = graph.vertices[id]!;
    return [vertex.position.x, vertex.position.y, depths.get(id) ?? 0];
  });
  if (points.length !== 4) return 0;
  const origin = points[3]!;
  const [a, b, c] = points
    .slice(0, 3)
    .map((point) =>
      point.map((coordinate, index) => coordinate! - origin[index]!),
    );
  const volume =
    a![0]! * (b![1]! * c![2]! - b![2]! * c![1]!) -
    a![1]! * (b![0]! * c![2]! - b![2]! * c![0]!) +
    a![2]! * (b![0]! * c![1]! - b![1]! * c![0]!);
  return Math.abs(volume) < 1e-5 ? 0 : Math.sign(volume);
}

function angleDistance(first: number, second: number) {
  return Math.abs(
    Math.atan2(Math.sin(first - second), Math.cos(first - second)),
  );
}

/** Give a cramped or straight C–C*–C segment a tetrahedral projection. Rotate the
 * smaller whole branch so its internal bonds and any rings stay intact. */
function normalisePlanarCarbonAngle(
  graph: StereoGraph,
  centre: StereoVertex,
  stereoTarget: StereoVertex,
) {
  const carbons = centre.neighbours
    .map((id) => graph.vertices[id]!)
    .filter(
      (vertex) => vertex.value.element === "C" && vertex !== stereoTarget,
    );
  if (carbons.length !== 2) return;
  const bearing = (vertex: StereoVertex) =>
    Math.atan2(
      vertex.position.y - centre.position.y,
      vertex.position.x - centre.position.x,
    );
  const originalDegrees =
    (angleDistance(bearing(carbons[0]!), bearing(carbons[1]!)) * 180) / Math.PI;
  if (originalDegrees >= 100 && originalDegrees <= 140) return;

  const branches = carbons
    .map((start) => {
      const ids = new Set<number>();
      const pending = [start.id];
      while (pending.length) {
        const id = pending.pop()!;
        if (id === centre.id || ids.has(id)) continue;
        ids.add(id);
        pending.push(...graph.vertices[id]!.neighbours);
      }
      return { start, ids };
    })
    .sort((first, second) => first.ids.size - second.ids.size);
  const branch = branches[0]!;
  const fixed = carbons.find((vertex) => vertex !== branch.start)!;
  // A ring joining the two carbon neighbours must retain its ring geometry.
  if (branch.ids.has(fixed.id)) return;
  const original = [...branch.ids].map((id) => ({
    vertex: graph.vertices[id]!,
    x: graph.vertices[id]!.position.x - centre.position.x,
    y: graph.vertices[id]!.position.y - centre.position.y,
  }));
  const fixedAngle = bearing(fixed);
  const originalAngle = bearing(branch.start);
  const tetrahedralAngle = Math.acos(-1 / 3);
  const stationary = graph.vertices.filter(
    (vertex) =>
      vertex !== centre &&
      !branch.ids.has(vertex.id) &&
      vertex.value.element !== "H",
  );
  let bestAngle = 0;
  let bestScore = -Infinity;
  for (const direction of [-1, 1]) {
    const rotation = fixedAngle + direction * tetrahedralAngle - originalAngle;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    let clearance = Infinity;
    for (const point of original) {
      const x = centre.position.x + point.x * cosine - point.y * sine;
      const y = centre.position.y + point.x * sine + point.y * cosine;
      for (const other of stationary) {
        clearance = Math.min(
          clearance,
          Math.hypot(x - other.position.x, y - other.position.y),
        );
      }
    }
    if (clearance > bestScore) {
      bestScore = clearance;
      bestAngle = rotation;
    }
  }
  const cosine = Math.cos(bestAngle);
  const sine = Math.sin(bestAngle);
  for (const point of original) {
    point.vertex.position.x =
      centre.position.x + point.x * cosine - point.y * sine;
    point.vertex.position.y =
      centre.position.y + point.x * sine + point.y * cosine;
  }
}

export function completeStereoDepiction(graph: StereoGraph) {
  for (const centre of graph.vertices.filter(
    (vertex) => vertex.value.isStereoCenter,
  )) {
    const neighbours = centre.neighbours.map((id) => graph.vertices[id]!);
    const reference = neighbours.find((vertex) => {
      const wedge = graph.getEdge(centre.id, vertex.id).wedge;
      return wedge === "up" || wedge === "down";
    });
    const hydrogen = neighbours.find((vertex) => vertex.value.element === "H");
    if (!reference || !hydrogen || neighbours.length !== 4) continue;
    const expected = handedness(
      graph,
      centre,
      new Map([
        [
          reference.id,
          graph.getEdge(centre.id, reference.id).wedge === "up" ? 1 : -1,
        ],
      ]),
    );
    if (!expected) continue;

    // Keep the carbon skeleton in the plane: use H and the leaving group for
    // the stereo pair. A centre with three carbon ligands instead uses its
    // smallest side branch, never the bond joining two stereocentres.
    const nonCarbonTargets = neighbours
      .filter(
        (vertex) =>
          !["C", "H"].includes(vertex.value.element) &&
          !vertex.value.isStereoCenter,
      )
      .sort((a, b) => a.neighbours.length - b.neighbours.length || a.id - b.id);
    const carbonTargets = neighbours
      .filter(
        (vertex) =>
          vertex.value.element === "C" && !vertex.value.isStereoCenter,
      )
      .sort((a, b) => a.neighbours.length - b.neighbours.length || a.id - b.id);
    const targets = nonCarbonTargets.length ? nonCarbonTargets : carbonTargets;
    if (!targets.length) continue;
    // Capture the original configuration first, then adjust the planar angles
    // and recompute the stereo pair against that configuration. At a carbon-
    // only centre, keep the selected small side branch out of the planar pair.
    normalisePlanarCarbonAngle(graph, centre, targets[0]!);
    const original = { ...hydrogen.position };
    const length = Math.hypot(
      original.x - centre.position.x,
      original.y - centre.position.y,
    );
    const originalAngle = Math.atan2(
      original.y - centre.position.y,
      original.x - centre.position.x,
    );
    const heavyAngles = neighbours
      .filter((vertex) => vertex !== hydrogen)
      .map((vertex) =>
        Math.atan2(
          vertex.position.y - centre.position.y,
          vertex.position.x - centre.position.x,
        ),
      );
    let best:
      | {
          position: Position;
          target: StereoVertex;
          direction: number;
          score: number;
        }
      | undefined;
    for (const target of targets) {
      for (const angle of [
        originalAngle,
        ...Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12),
      ]) {
        const separation = Math.min(
          ...heavyAngles.map((other) => angleDistance(angle, other)),
        );
        if (separation < Math.PI / 5) continue;
        hydrogen.position.x = centre.position.x + length * Math.cos(angle);
        hydrogen.position.y = centre.position.y + length * Math.sin(angle);
        const targetForward = handedness(
          graph,
          centre,
          new Map([[target.id, 1]]),
        );
        const hydrogenBack = handedness(
          graph,
          centre,
          new Map([[hydrogen.id, -1]]),
        );
        // Both marks must independently describe the same configuration.
        // Opposite marks on unsuitable opposing bonds are contradictory.
        if (!targetForward || targetForward !== hydrogenBack) continue;
        const clearance =
          Math.min(
            ...graph.vertices
              .filter(
                (vertex) =>
                  vertex !== centre &&
                  vertex !== hydrogen &&
                  vertex.value.isDrawn,
              )
              .map((vertex) =>
                Math.hypot(
                  vertex.position.x - hydrogen.position.x,
                  vertex.position.y - hydrogen.position.y,
                ),
              ),
          ) / length;
        const score = Math.min(clearance, 2) + separation / Math.PI;
        if (!best || score > best.score) {
          best = {
            position: { ...hydrogen.position },
            target,
            direction: targetForward === expected ? 1 : -1,
            score,
          };
        }
      }
      if (best) break;
    }
    hydrogen.position.x = best?.position.x ?? original.x;
    hydrogen.position.y = best?.position.y ?? original.y;
    if (!best) continue;
    for (const neighbour of neighbours)
      graph.getEdge(centre.id, neighbour.id).wedge = "";
    graph.getEdge(centre.id, best.target.id).wedge =
      best.direction === 1 ? "up" : "down";
    graph.getEdge(centre.id, hydrogen.id).wedge =
      best.direction === 1 ? "down" : "up";
    hydrogen.value.isDrawn = true;
    best.target.value.isDrawn = true;
    for (const neighbour of neighbours) {
      if (neighbour.value.element === "C" && neighbour.neighbours.length === 1)
        neighbour.value.drawExplicit = true;
    }
  }
}

export function configureCompleteStereoDepiction(rawDrawer: unknown) {
  const preprocessor = (rawDrawer as { preprocessor?: StereoPreprocessor })
    .preprocessor;
  const annotate = preprocessor?.annotateStereochemistry;
  if (!preprocessor || !annotate) return;
  preprocessor.annotateStereochemistry = () => {
    annotate.call(preprocessor);
    if (preprocessor.graph) {
      completeStereoDepiction(preprocessor.graph);
      // A rotated aryl side chain also moves its aromatic circle and the
      // reference centre used to draw double bonds inside the ring.
      for (const ring of preprocessor.rings ?? [])
        preprocessor.setRingCenter?.(ring);
    }
  };
}
