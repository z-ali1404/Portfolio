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
 *
 * Real medical queries are usually short noun phrases where a modifier
 * word sits directly next to the field-defining word it describes —
 * "muscle pain", "type 2 diabetes", "chronic kidney disease". Classifying
 * each word in total isolation would strand those modifiers ("muscle",
 * "type", "2") in the generic-text fallback even though the head word
 * ("pain", "diabetes") was correctly recognized, which under-counts and
 * under-ranks results for ANY multi-word condition or intervention name,
 * not just one specific example. So unclassified words are grouped with
 * whichever recognized field-word they sit immediately next to: a run of
 * unclassified words immediately followed by a classified word attaches
 * forward to that word's field (the common "[modifier] [noun]" pattern in
 * English); a trailing run with nothing classified after it attaches
 * backward to whichever field was most recently seen, but only up to 3
 * words, so an unrelated trailing sentence doesn't get silently absorbed
 * into a structured field it has nothing to do with.
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
  let pending: string[] = [];
  let lastField: "intervention" | "condition" | undefined;

  const flushPendingTo = (field: "intervention" | "condition") => {
    if (pending.length === 0) return;
    (field === "intervention" ? intervention : condition).push(...pending);
    pending = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const field = labels[i];
    if (field === "unclassified") {
      pending.push(tokens[i]);
      continue;
    }
    flushPendingTo(field);
    (field === "intervention" ? intervention : condition).push(tokens[i]);
    lastField = field;
  }

  if (pending.length > 0) {
    if (lastField && pending.length <= 3) {
      flushPendingTo(lastField);
    } else {
      term.push(...pending);
    }
  }

  return {
    intervention: intervention.join(" "),
    condition: condition.join(" "),
    term: term.join(" "),
  };
}
