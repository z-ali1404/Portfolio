/**
 * Simple heuristic used only in "auto" search mode to decide whether a
 * single free-text query looks like a drug/intervention name (route to
 * `query.intr`) or general wording (route to `query.term`). Users can
 * always override the guess with the mode dropdown.
 */

// Common generic drug-name suffixes (INN stems), e.g. pembrolizumab,
// semaglutide, amitriptyline, atorvastatin, amoxicillin.
const DRUG_SUFFIX_PATTERN =
  /(mab|nib|tide|pril|olol|statin|cillin|oxetine|triptan|azole|parin|floxacin|cycline|mycin|dipine|prazole|sartan|vir|caine)$/i;

// Common condition/keyword vocabulary that should NOT be routed to
// query.intr even though it may be a single word.
const CONDITION_WORDS = new Set([
  "cancer",
  "diabetes",
  "migraine",
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
]);

export function looksLikeDrugName(rawValue: string): boolean {
  const value = rawValue.trim();
  if (!value || /\s/.test(value)) return false; // multi-word queries are treated as general/condition text

  const lower = value.toLowerCase();
  if (CONDITION_WORDS.has(lower)) return false;
  if (!/^[a-z][a-z0-9-]*$/i.test(value)) return false;

  if (DRUG_SUFFIX_PATTERN.test(lower)) return true;

  // Fallback: a single alphabetic token of reasonable length with no
  // obvious English-word shape is more likely a drug name than a keyword.
  return value.length >= 6;
}
