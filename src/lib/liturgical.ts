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
 * Robustly parses complex citations like "Ps 50:8-9, 16bc-17, 21+23" or "Isa 1:10, 16-20"
 * Returns the book, chapter, and an array of all verse numbers in the range.
 */
export function parseCitation(citation: string): { bookSlug: string; chapter: number; verses: number[] } {
  const abbrevMap: Record<string, string> = {
    "Gen": "genesis", "Ex": "exodus", "Exo": "exodus", "Lev": "leviticus", "Num": "numbers", "Dt": "deuteronomy", "Deut": "deuteronomy",
    "Jos": "joshua", "Josh": "joshua", "Jdg": "judges", "Judg": "judges", "Ruth": "ruth", "1 Sam": "1-samuel", "2 Sam": "2-samuel",
    "1 Kgs": "1-kings", "2 Kgs": "2-kings", "1 Chr": "1-chronicles", "2 Chr": "2-chronicles",
    "Ezra": "ezra", "Neh": "nehemiah", "Tob": "tobit", "Jdt": "judith", "Judit": "judith", "Est": "esther", "Esth": "esther",
    "1 Mac": "1-maccabees", "2 Mac": "2-maccabees", "Job": "job", "Ps": "psalms", "Prov": "proverbs",
    "Eccl": "ecclesiastes", "Song": "song-of-solomon", "Songs": "song-of-solomon", "Wis": "wisdom", "Sir": "sirach",
    "Isa": "isaiah", "Is": "isaiah", "Jer": "jeremiah", "Lam": "lamentations", "Bar": "baruch", "Ezek": "ezekiel",
    "Dan": "daniel", "Hos": "hosea", "Joel": "joel", "Amos": "amos", "Obad": "obadiah",
    "Jon": "jonah", "Mic": "micah", "Nah": "nahum", "Hab": "habakkuk", "Zeph": "zephaniah",
    "Hag": "haggai", "Zech": "zechariah", "Mal": "malachi",
    "Mt": "matthew", "Matt": "matthew", "Mk": "mark", "Mark": "mark", "Lk": "luke", "Luke": "luke", "Jn": "john", "John": "john", "Acts": "acts", "Rom": "romans",
    "1 Cor": "1-corinthians", "2 Cor": "2-corinthians", "Gal": "galatians", "Eph": "ephesians",
    "Phil": "philippians", "Col": "colossians", "1 Thess": "1-thessalonians", "2 Thess": "2-thessalonians",
    "1 Tim": "1-timothy", "2 Tim": "2-timothy", "Tit": "titus", "Phlm": "philemon", "Heb": "hebrews",
    "Jas": "james", "1 Pet": "1-peter", "2 Pet": "2-peter", "1 Jn": "1-john", "2 Jn": "2-john",
    "3 Jn": "3-john", "Jude": "jude", "Rev": "revelation"
  };

  let bookPart = "";
  let rest = "";
  const sortedAbbrevs = Object.keys(abbrevMap).sort((a, b) => b.length - a.length);

  for (const abbrev of sortedAbbrevs) {
    if (citation.startsWith(abbrev)) {
      bookPart = abbrev;
      rest = citation.slice(abbrev.length).trim();
      break;
    }
  }

  const slug = abbrevMap[bookPart] ?? "genesis";
  
  // Extract chapter: handles "Ps 50:8" or "Jn 1:1"
  const chapterMatch = rest.match(/^(\d+)/);
  const chapter = chapterMatch ? parseInt(chapterMatch[1]!) : 1;
  
  // Extract verses part (everything after the first colon or space after chapter)
  const versesPart = rest.includes(':') ? rest.split(':')[1] : rest.replace(/^\d+/, '').trim();
  
  const verses: number[] = [];
  if (versesPart) {
    // Split by commas and handle multiple ranges/singles
    // Cleans up letters like "16bc" or "21+23"
    const parts = versesPart.split(/[,+]/);
    for (const part of parts) {
      const p = part.trim();
      if (p.includes('-')) {
        const rangeMatch = p.match(/(\d+)-(\d+)/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]!);
          const end = parseInt(rangeMatch[2]!);
          for (let i = start; i <= end; i++) verses.push(i);
        }
      } else {
        const verseMatch = p.match(/(\d+)/);
        if (verseMatch) {
          verses.push(parseInt(verseMatch[1]!));
        }
      }
    }
  }

  // Final fallback
  if (verses.length === 0) verses.push(1);
  
  return {
    bookSlug: slug,
    chapter,
    verses: Array.from(new Set(verses)).sort((a, b) => a - b)
  };
}
