/** Solvent/reagent metadata only. No answer structures belong in this module. */
export const SN1_NUCLEOPHILES = {
  water: {
    label: "water",
    reagents: "H₂O",
    oxygenFragment: "O",
    productType: "alcohol",
  },
  methanol: {
    label: "methanol",
    reagents: "CH₃OH (methanol)",
    oxygenFragment: "OC",
    productType: "methyl ether",
  },
  ethanol: {
    label: "ethanol",
    reagents: "CH₃CH₂OH (ethanol)",
    oxygenFragment: "OCC",
    productType: "ethyl ether",
  },
  propanol: {
    label: "propan-1-ol",
    reagents: "CH₃CH₂CH₂OH (propan-1-ol)",
    oxygenFragment: "OCCC",
    productType: "propyl ether",
  },
  isopropanol: {
    label: "isopropanol",
    reagents: "(CH₃)₂CHOH (isopropanol)",
    oxygenFragment: "OC(C)C",
    productType: "isopropyl ether",
  },
  butanol: {
    label: "butan-1-ol",
    reagents: "CH₃CH₂CH₂CH₂OH (butan-1-ol)",
    oxygenFragment: "OCCCC",
    productType: "butyl ether",
  },
} as const;

export type Sn1NucleophileId = keyof typeof SN1_NUCLEOPHILES;
export type Sn1Nucleophile = (typeof SN1_NUCLEOPHILES)[Sn1NucleophileId];

/** Five examples per solvent across the 30 curated SN1 questions, including
 * the substitution half of the three shared SN1/E1 questions. */
export const SN1_NUCLEOPHILE_ASSIGNMENTS: Readonly<
  Record<string, Sn1NucleophileId>
> = {
  "g-sn1-intro-07": "water",
  "g-sn1-intro-08": "methanol",
  "g-sn1-intro-09": "ethanol",
  "g-sn1-intro-10": "propanol",
  "g-sn1-intro-11": "isopropanol",
  q32: "butanol",
  q33: "water",
  q35: "methanol",
  q36: "ethanol",
  q37: "propanol",
  q38: "isopropanol",
  q39: "butanol",
  "g-sn1-inter-09": "water",
  "g-sn1-inter-10": "methanol",
  "g-sn1-inter-11": "ethanol",
  q34: "propanol",
  q72: "isopropanol",
  q73: "butanol",
  q74: "water",
  q78: "methanol",
  q79: "ethanol",
  q80: "propanol",
  "g-sn1-adv-11": "isopropanol",
  "g-sn1-adv-12": "butanol",
  "g-sn1-adv-13": "water",
  "g-sn1-adv-14": "methanol",
  "g-sn1-adv-15": "ethanol",
  "g-sn1-adv-19": "propanol",
  "g-sn1-adv-20": "isopropanol",
  "g-sn1-adv-21": "butanol",
};

export function getSn1Nucleophile(id: string): Sn1Nucleophile | undefined {
  const assigned = SN1_NUCLEOPHILE_ASSIGNMENTS[id];
  return assigned ? SN1_NUCLEOPHILES[assigned] : undefined;
}

/** Use one trapping solvent, rather than an aqueous alcohol mixture with two
 * competing nucleophiles. Tosylates do not need silver-assisted ionisation. */
export function sn1SolvolysisConditions(
  nucleophile: Sn1Nucleophile,
  previousConditions: string,
  leavingGroup: string,
): string {
  const isTosylate = /tosylate|\bOTs\b|\bTsO\b/i.test(leavingGroup);
  return [
    nucleophile === SN1_NUCLEOPHILES.water
      ? "aqueous acetone"
      : `${nucleophile.label} (solvent)`,
    ...(previousConditions.includes("AgNO₃") && !isTosylate ? ["AgNO₃"] : []),
    "Δ",
    "no added base",
  ].join(", ");
}
