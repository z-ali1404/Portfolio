import { looksLikeDrugName } from "@/lib/searchModeHeuristic";

/**
 * Tokenizes free text typed into the main search bar and classifies each
 * token against the same structured fields Advanced Search exposes
 * (Condition, Intervention) — so "paracetamol headache" is understood as
 * Intervention=paracetamol AND Condition=headache, and routed to the exact
 * same `query.intr` / `query.cond` API params Advanced Search already uses,
 * instead of one opaque blob of full text.
 *
 * This is a rule-based dictionary/suffix classifier, not a fuzzy-search
 * library — see the note in SearchBar.tsx for why a library like Fuse.js
 * doesn't fit here: it can only fuzzy-match records already fetched into
 * memory, but this app's data source is the live, paginated
 * ClinicalTrials.gov registry, so accuracy has to come from routing the
 * query to the server's own structured fields, not from re-ranking a page
 * that was never fetched.
 *
 * Anything that can't be classified falls back into the general `term`
 * field, so no word from the user's input is ever silently dropped.
 */

// Suffixes typical of INN drug names (pembrolizumab, semaglutide,
// amitriptyline, atorvastatin, amoxicillin) — same stems used by the
// existing single-word auto-detect heuristic in searchModeHeuristic.ts.
const DRUG_SUFFIX_PATTERN =
  /(mab|nib|tide|pril|olol|statin|cillin|oxetine|triptan|azole|parin|floxacin|cycline|mycin|dipine|prazole|sartan|vir|caine|adol|profen|etamol)$/i;

// Very common over-the-counter generics whose names don't share a
// distinctive INN suffix with the pattern above (paracetamol is covered by
// "etamol" now, but these have no reusable stem at all) — a small,
// explicit whitelist rather than trying to widen the suffix pattern until
// it starts matching ordinary English words.
const DRUG_WORDS = new Set(["aspirin", "ibuprofen", "acetaminophen", "paracetamol", "naproxen", "codeine"]);

// Condition/symptom vocabulary that should route to query.cond rather than
// query.intr or a flat term scan. Deliberately a fixed, explainable list —
// no attempt to guess arbitrary medical vocabulary we don't recognize.
const CONDITION_WORDS = new Set([
  "cancer",
  "diabetes",
  "migraine",
  "headache",
  "pain",
  "asthma",
  "depression",
  "anxiety",
  "obesity",
  "arthritis",
  "melanoma",
  "hypertension",
  "stroke",
  "alzheimer",
  "epilepsy",
  "leukemia",
  "lymphoma",
  "psoriasis",
  "eczema",
  "insomnia",
  "fever",
  "flu",
  "influenza",
  "infection",
  "fibrillation",
  "failure",
  "injury",
  "disorder",
  "syndrome",
  "disease",
  "tumor",
  "tumour",
  "fatigue",
  "nausea",
]);

// Common condition-word suffixes (tonsillitis, fibromyalgia, leukemia,
// neuropathy, atrophy) — catches condition-shaped words outside the
// explicit dictionary above without guessing arbitrary vocabulary.
const CONDITION_SUFFIX_PATTERN = /(itis|osis|oma|algia|emia|opathy|trophy)$/i;

export type TokenField = "intervention" | "condition" | "unclassified";

/** Classifies a single whitespace-delimited token by field. */
export function classifyToken(token: string): TokenField {
  const lower = token.toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/i.test(token)) return "unclassified";
  if (CONDITION_WORDS.has(lower) || CONDITION_SUFFIX_PATTERN.test(lower)) return "condition";
  if (DRUG_WORDS.has(lower) || DRUG_SUFFIX_PATTERN.test(lower)) return "intervention";
  return "unclassified";
}

export interface ClassifiedQuery {
  intervention: string;
  condition: string;
  term: string;
}

/**
 * Splits free text into tokens, classifies each, and groups them back into
 * space-joined per-field strings — the same shape Advanced Search's
 * Condition/Intervention inputs already produce, so both paths share one
 * query-building and one re-ranking implementation downstream.
 */
export function classifyFreeText(input: string): ClassifiedQuery {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const intervention: string[] = [];
  const condition: string[] = [];
  const unclassified: string[] = [];

  for (const token of tokens) {
    const field = classifyToken(token);
    if (field === "intervention") intervention.push(token);
    else if (field === "condition") condition.push(token);
    else unclassified.push(token);
  }

  // A single unclassified token that "looks like a drug name" (long,
  // consonant-heavy, no dictionary/suffix hit) is treated as an
  // intervention guess when nothing else gave a stronger signal — mirrors
  // the old single-word auto-detect behavior for a query that's just one
  // unrecognized word on its own (e.g. "semaglutide").
  if (unclassified.length === 1 && intervention.length === 0 && condition.length === 0) {
    if (looksLikeDrugName(unclassified[0])) {
      return { intervention: unclassified[0], condition: "", term: "" };
    }
  }

  // A single remaining unclassified token alongside an *already recognized*
  // condition (or intervention) word is very likely the other half of a
  // two-field query — e.g. "paracetamol headache": "headache" hits the
  // condition dictionary, "paracetamol" hits neither dictionary nor the
  // suffix pattern, but with a condition already found and exactly one
  // leftover word, that word is almost certainly the drug being asked
  // about. This is what makes "paracetamol headache" resolve to
  // Intervention=paracetamol AND Condition=headache instead of leaving
  // "paracetamol" stranded in the generic-text fallback. Deliberately only
  // fires when exactly one word is left unexplained — with two or more
  // leftover words there's no way to guess which one pairs with which
  // field, so they all fall through to `term` as intended.
  if (unclassified.length === 1) {
    if (condition.length > 0 && intervention.length === 0) {
      intervention.push(unclassified[0]);
      unclassified.length = 0;
    } else if (intervention.length > 0 && condition.length === 0) {
      condition.push(unclassified[0]);
      unclassified.length = 0;
    }
  }

  return {
    intervention: intervention.join(" "),
    condition: condition.join(" "),
    term: unclassified.join(" "),
  };
}
