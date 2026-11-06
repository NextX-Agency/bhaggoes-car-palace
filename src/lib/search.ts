// Search shared by the public inventory (database side) and the admin inventory table (in the browser).
// Every word must match somewhere; a word also matches its Dutch/English equivalents ("zwart" finds "Black").

const synonymGroups: string[][] = [
  ["gasoline", "benzine", "petrol"], ["diesel"], ["hybrid", "hybride"], ["electric", "elektrisch", "ev"],
  ["automatic", "automaat", "automatisch"], ["manual", "handgeschakeld", "schakel"],
  ["black", "zwart"], ["white", "wit"], ["gray", "grey", "grijs"], ["silver", "zilver"], ["red", "rood"],
  ["blue", "blauw"], ["green", "groen"], ["brown", "bruin"], ["yellow", "geel"], ["orange", "oranje"], ["gold", "goud"],
  ["pickup", "pick-up"], ["van", "bus", "busje"], ["used", "gebruikt", "tweedehands"], ["new", "nieuw"],
  ["available", "beschikbaar"], ["reserved", "gereserveerd"], ["sold", "verkocht"], ["on the way", "onderweg"],
  ["rental", "verhuur", "huur"], ["4x4", "4wd", "awd"], ["leather", "leer", "leder"],
  ["sunroof", "schuifdak", "panoramic", "panorama"],
];

const synonyms = new Map<string, string[]>();
for (const group of synonymGroups) for (const word of group) synonyms.set(word, group);

/** Lower case without accents, so "Citroën" and "citroen" are the same. */
export function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Letters and digits only: lets "BCP000123", "bcp 123" and "BCP-000123" find each other. */
export function compactSearch(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, "");
}

/**
 * Splits a query into words (max 8), each with its synonyms. Characters with a meaning in SQL patterns or
 * PostgREST filters are dropped, so the result is safe to put inside an ilike filter.
 */
export function searchTermGroups(query: string): string[][] {
  const words = normalizeSearch(query).split(/\s+/).map((word) => word.replace(/[%_*,()"'\\:;]/g, "").trim()).filter(Boolean);
  return [...new Set(words)].slice(0, 8).map((word) => {
    const known = synonyms.get(word);
    if (known) return known;
    // Handwritten stock numbers often confuse the letter O with zero.
    if (/^[a-z0-9]+-[a-z0-9]+$/.test(word) && /\d/.test(word) && /[o0]/.test(word)) {
      const alternate = word.replace(/[o0]/g, (character) => character === "o" ? "0" : "o");
      if (alternate !== word) return [word, alternate];
    }
    return [word];
  });
}

/** In-browser variant: true when every word of the query appears in one of the given values. */
export function matchesSearch(query: string, values: (string | number | null | undefined)[]) {
  const groups = searchTermGroups(query);
  if (!groups.length) return true;
  const haystack = normalizeSearch(values.filter((value) => value != null && value !== "").join(" "));
  const compact = haystack.replace(/[^a-z0-9]/g, "");
  return groups.every((group) => group.some((term) => haystack.includes(term) || (compactSearch(term).length > 1 && compact.includes(compactSearch(term)))));
}
