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

/**
 * Words that qualify/modify a condition rather than naming one outright —
 * anatomical terms, severity, staging, chronicity ("muscular dystrophy",
 * "type 2 diabetes", "chronic kidney disease"). These exist specifically
 * because a length/shape-based "looks like a drug name" guess (see
 * `looksLikeDrugName`) genuinely cannot tell "muscular" apart from
 * "prednisone" — both are unlisted, 6+ letter, all-alphabetic words with
 * identical shape. Only an explicit word list resolves that ambiguity.
 * Words in this set are NEVER treated as a standalone intervention guess;
 * they only ever attach to an adjacent condition/intervention word. This
 * list is intentionally a practical, non-exhaustive best effort (like the
 * condition dictionary above), not a medical ontology.
 */
const MODIFIER_WORDS = new Set([
  "type",
  "stage",
  "grade",
  "early",
  "late",
  "advanced",
  "mild",
  "moderate",
  "severe",
  "chronic",
  "acute",
  "recurrent",
  "refractory",
  "persistent",
  "primary",
  "secondary",
  "generalized",
  "localized",
  "congenital",
  "hereditary",
  "genetic",
  "autoimmune",
  "inflammatory",
  "degenerative",
  "progressive",
  "muscular",
  "muscle",
  "cardiac",
  "heart",
  "renal",
  "kidney",
  "hepatic",
  "liver",
  "pulmonary",
  "lung",
  "neurological",
  "nerve",
  "vascular",
  "skeletal",
  "bone",
  "joint",
  "metabolic",
  "respiratory",
  "gastrointestinal",
  "stomach",
  "psychiatric",
  "mental",
  "spinal",
  "back",
  "chest",
  "abdominal",
]);

const NUMERIC_PATTERN = /^\d+$/;

export type TokenField = "intervention" | "condition" | "modifier" | "unclassified";

/**
 * Classifies a single whitespace-delimited token by field.
 *   - "condition" / "intervention": recognized outright via dictionary/suffix.
 *   - "modifier": a qualifier word (or bare number, e.g. "2") that always
 *     attaches to an adjacent condition/intervention and is never itself
 *     treated as a standalone drug guess.
 *   - "unclassified": genuinely ambiguous — resolved by position in
 *     `classifyFreeText` (attaches if adjacent to a recognized field,
 *     otherwise gets one chance at the shape-based drug guess).
 */
export function classifyToken(token: string): TokenField {
  if (NUMERIC_PATTERN.test(token)) return "modifier";
  const lower = token.toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/i.test(token)) return "unclassified";
  if (CONDITION_WORDS.has(lower) || CONDITION_SUFFIX_PATTERN.test(lower)) return "condition";
  if (DRUG_WORDS.has(lower) || DRUG_SUFFIX_PATTERN.test(lower)) return "intervention";
  if (MODIFIER_WORDS.has(lower)) return "modifier";
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
 *
 * Real medical queries are usually short noun phrases where a modifier
 * word sits directly next to the field-defining word it describes —
 * "muscular dystrophy", "type 2 diabetes", "chronic kidney disease". A run
 * of "modifier"/numeric words next to a recognized condition or
 * intervention word always attaches to it (they're never ambiguous). A
 * genuinely "unclassified" word next to a recognized field also attaches —
 * but ONLY if it isn't independently a plausible standalone drug name
 * (checked via the shape heuristic) — otherwise it's carved out as its own
 * intervention rather than being swallowed into the adjacent field. This is
 * what makes "muscular dystrophy prednisone" resolve to
 * Condition=muscular dystrophy AND Intervention=prednisone in either word
 * order, instead of the drug name silently absorbing into whichever field
 * happened to be built most recently.
 */
export function classifyFreeText(input: string): ClassifiedQuery {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { intervention: "", condition: "", term: "" };

  const labels = tokens.map(classifyToken);

  // Whole query is a single unrecognized word that looks like a drug name
  // (e.g. searching just "semaglutide") — same single-word auto-detect
  // behavior as before this classifier existed.
  if (tokens.length === 1 && labels[0] === "unclassified" && looksLikeDrugName(tokens[0])) {
    return { intervention: tokens[0], condition: "", term: "" };
  }

  const intervention: string[] = [];
  const condition: string[] = [];
  const term: string[] = [];
  // Each pending entry keeps its original label — critical so a "modifier"
  // word like "muscular" is never shape-checked at all (it's already known
  // to be a plain qualifier), while a genuinely "unclassified" word still
  // gets the standalone-drug-guess check. Losing this distinction is what
  // would make "muscular" (which also happens to pass the length-based
  // shape heuristic) get wrongly carved out into intervention.
  let pending: { word: string; label: TokenField }[] = [];
  let lastField: "intervention" | "condition" | undefined;

  // Carves any pending *unclassified* word that independently looks like a
  // standalone drug name out into `intervention`; everything else in the
  // run (modifiers, numbers, non-drug-shaped unclassified words) merges
  // into `field`.
  const flushPendingTo = (field: "intervention" | "condition") => {
    if (pending.length === 0) return;
    const remainder: string[] = [];
    for (const { word, label } of pending) {
      if (label === "unclassified" && looksLikeDrugName(word)) intervention.push(word);
      else remainder.push(word);
    }
    if (remainder.length > 0) (field === "intervention" ? intervention : condition).push(...remainder);
    pending = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const field = labels[i];
    if (field === "unclassified" || field === "modifier") {
      pending.push({ word: tokens[i], label: field });
      continue;
    }
    flushPendingTo(field);
    (field === "intervention" ? intervention : condition).push(tokens[i]);
    lastField = field;
  }

  if (pending.length > 0) {
    // A modifier word (or bare number) here is a trailing qualifier with
    // nothing after it — still attach it backward to whatever field was
    // last built, capped at 3 words so an unrelated trailing sentence
    // doesn't get silently absorbed. A plain unclassified word gets one
    // more chance at the standalone drug guess before falling back to it.
    const remainder: string[] = [];
    for (const { word, label } of pending) {
      if (label === "unclassified" && looksLikeDrugName(word)) {
        intervention.push(word);
      } else {
        remainder.push(word);
      }
    }
    if (remainder.length > 0) {
      if (lastField && remainder.length <= 3) {
        (lastField === "intervention" ? intervention : condition).push(...remainder);
      } else {
        term.push(...remainder);
      }
    }
  }

  return {
    intervention: intervention.join(" "),
    condition: condition.join(" "),
    term: term.join(" "),
  };
}
