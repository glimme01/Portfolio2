const BAD_WORDS = [
  "arsch",
  "scheiße",
  "scheisse",
  "fuck",
  "shit",
  "bitch",
  "damn",
  "idiot",
  "hurensohn",
  "fotze",
  "wichser",
];

export function filterBadWords(text: string): string {
  let filtered = text;
  for (const word of BAD_WORDS) {
    const regex = new RegExp(word, "gi");
    filtered = filtered.replace(regex, "***");
  }
  return filtered;
}
