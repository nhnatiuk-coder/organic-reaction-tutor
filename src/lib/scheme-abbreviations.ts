/** Reserved atom class in the drawing copy; never use it in grading SMILES. */
export const TOSYLATE_DISPLAY_ATOM_CLASS = 999;
export const TOSYLATE_DISPLAY_ATOM = `[O:${TOSYLATE_DISPLAY_ATOM_CLASS}]`;

/**
 * Replace the two tosylate encodings used in the question bank with a marked
 * oxygen for the drawing library. It prints Ts next to that oxygen using its
 * native abbreviation support (TsO on the left, OTs on the right).
 *
 * This is a display-only copy. The substrate SMILES, answer keys, carbon
 * skeleton, and order of neighbours at stereocentres remain unchanged.
 */
export function getSchemeDisplaySmiles(smiles: string): string {
  return smiles
    .replace(
      /O=S\(=O\)\(c([1-9]|%\d{2})ccc\(C\)cc\1\)O/g,
      TOSYLATE_DISPLAY_ATOM,
    )
    .replace(
      /OS\(=O\)\(=O\)c([1-9]|%\d{2})ccc\(C\)cc\1/g,
      TOSYLATE_DISPLAY_ATOM,
    );
}
