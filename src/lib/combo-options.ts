/** Normalises text for forgiving comparison: case, accents, spaces and punctuation are ignored ("Mercedes Benz" ~ "mercedes-benz"). */
export function comboKey(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Options that match the typed text: names that start with it first, then names that merely contain it. Empty text returns everything. */
export function filterComboOptions(options: readonly string[], query: string): string[] {
  const key = comboKey(query);
  if (!key) return [...options];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const optionKey = comboKey(option);
    if (optionKey.startsWith(key)) starts.push(option);
    else if (optionKey.includes(key)) contains.push(option);
  }
  return [...starts, ...contains];
}
