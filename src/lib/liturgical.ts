export type LiturgicalColor = "green" | "violet" | "white" | "red" | "rose" | "gold";

export interface LiturgicalInfo {
  season: string;
  color: LiturgicalColor;
  day: string;
  readings: {
    firstReading?: string;
    psalm?: string;
    secondReading?: string;
    gospel?: string;
  };
}

export function getLiturgicalColorOklch(color: LiturgicalColor): string {
  switch (color) {
    case "green": return "0.6 0.12 150";
    case "violet": return "0.45 0.15 285";
    case "white": return "0.98 0.01 240";
    case "red": return "0.55 0.2 25";
    case "rose": return "0.75 0.1 350";
    case "gold": return "0.8 0.15 85";
    default: return "0.6 0.12 150";
  }
}

/**
 * Resolves a citation like "Lk 4:24-30" or "2 Kgs 5:1-15ab" to its constituent parts.
 */
export function parseCitation(citation: string): { bookSlug: string; chapter: number; verse: number } {
  const abbrevMap: Record<string, string> = {
    "Gen": "genesis", "Ex": "exodus", "Lev": "leviticus", "Num": "numbers", "Dt": "deuteronomy",
    "Jos": "joshua", "Jdg": "judges", "Ruth": "ruth", "1 Sam": "1-samuel", "2 Sam": "2-samuel",
    "1 Kgs": "1-kings", "2 Kgs": "2-kings", "1 Chr": "1-chronicles", "2 Chr": "2-chronicles",
    "Ezra": "ezra", "Neh": "nehemiah", "Tob": "tobit", "Jdt": "judith", "Est": "esther",
    "1 Mac": "1-maccabees", "2 Mac": "2-maccabees", "Job": "job", "Ps": "psalms", "Prov": "proverbs",
    "Eccl": "ecclesiastes", "Song": "song-of-solomon", "Wis": "wisdom", "Sir": "sirach",
    "Isa": "isaiah", "Jer": "jeremiah", "Lam": "lamentations", "Bar": "baruch", "Ezek": "ezekiel",
    "Dan": "daniel", "Hos": "hosea", "Joel": "joel", "Amos": "amos", "Obad": "obadiah",
    "Jon": "jonah", "Mic": "micah", "Nah": "nahum", "Hab": "habakkuk", "Zeph": "zephaniah",
    "Hag": "haggai", "Zech": "zechariah", "Mal": "malachi",
    "Mt": "matthew", "Mk": "mark", "Lk": "luke", "Jn": "john", "Acts": "acts", "Rom": "romans",
    "1 Cor": "1-corinthians", "2 Cor": "2-corinthians", "Gal": "galatians", "Eph": "ephesians",
    "Phil": "philippians", "Col": "colossians", "1 Thess": "1-thessalonians", "2 Thess": "2-thessalonians",
    "1 Tim": "1-timothy", "2 Tim": "2-timothy", "Tit": "titus", "Phlm": "philemon", "Heb": "hebrews",
    "Jas": "james", "1 Pet": "1-peter", "2 Pet": "2-peter", "1 Jn": "1-john", "2 Jn": "2-john",
    "3 Jn": "3-john", "Jude": "jude", "Rev": "revelation"
  };

  let bookPart = "";
  let rest = "";
  for (const abbrev of Object.keys(abbrevMap)) {
    if (citation.startsWith(abbrev)) {
      bookPart = abbrev;
      rest = citation.slice(abbrev.length).trim();
      break;
    }
  }

  const slug = abbrevMap[bookPart] ?? "genesis";
  const match = rest.match(/(\d+):(\d+)/);
  
  return {
    bookSlug: slug,
    chapter: match ? parseInt(match[1]!) : 1,
    verse: match ? parseInt(match[2]!) : 1
  };
}
