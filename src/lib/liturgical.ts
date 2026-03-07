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
 * The most robust parser for Catholic citations.
 * Handles complex strings and all standard liturgical abbreviations.
 */
export function parseCitation(citation: string): { bookSlug: string; chapter: number; verses: number[] } {
  // CLEANUP: Do not use damaging regex that might strip book names (like Isaiah 58:)
  const raw = citation.trim();

  const abbrevMap: Record<string, string> = {
    "Genesis": "genesis", "Gen": "genesis", "Gn": "genesis",
    "Exodus": "exodus", "Exo": "exodus", "Ex": "exodus",
    "Leviticus": "leviticus", "Lev": "leviticus", "Lv": "leviticus",
    "Numbers": "numbers", "Num": "numbers", "Nm": "numbers",
    "Deuteronomy": "deuteronomy", "Deut": "deuteronomy", "Dt": "deuteronomy", "Deu": "deuteronomy",
    "Joshua": "joshua", "Josh": "joshua", "Jos": "joshua",
    "Judges": "judges", "Judg": "judges", "Jdg": "judges",
    "Ruth": "ruth", "Rut": "ruth",
    "1 Samuel": "1-samuel", "1 Sam": "1-samuel", "1 Sa": "1-samuel", "1Sa": "1-samuel",
    "2 Samuel": "2-samuel", "2 Sam": "2-samuel", "2 Sa": "2-samuel", "2Sa": "2-samuel",
    "1 Kings": "1-kings", "1 Kgs": "1-kings", "1 Ki": "1-kings", "1Ki": "1-kings",
    "2 Kings": "2-kings", "2 Kgs": "2-kings", "2 Ki": "2-kings", "2Ki": "2-kings",
    "1 Chronicles": "1-chronicles", "1 Chr": "1-chronicles", "1 Ch": "1-chronicles", "1Ch": "1-chronicles",
    "2 Chronicles": "2-chronicles", "2 Chr": "2-chronicles", "2 Ch": "2-chronicles", "2Ch": "2-chronicles",
    "Ezra": "ezra", "Ezr": "ezra",
    "Nehemiah": "nehemiah", "Neh": "nehemiah",
    "Tobit": "tobit", "Tob": "tobit",
    "Judith": "judith", "Jdt": "judith", "Judit": "judith",
    "Esther": "esther", "Esth": "esther", "Est": "esther",
    "1 Maccabees": "1-maccabees", "1 Mac": "1-maccabees", "1 Ma": "1-maccabees", "1Ma": "1-maccabees",
    "2 Maccabees": "2-maccabees", "2 Mac": "2-maccabees", "2 Ma": "2-maccabees", "2Ma": "2-maccabees",
    "Job": "job",
    "Psalms": "psalms", "Psalm": "psalms", "Ps": "psalms", "Psa": "psalms",
    "Proverbs": "proverbs", "Prov": "proverbs", "Pro": "proverbs",
    "Ecclesiastes": "ecclesiastes", "Eccl": "ecclesiastes", "Ecc": "ecclesiastes",
    "Song of Solomon": "song-of-solomon", "Song of Songs": "song-of-solomon", "Song": "song-of-solomon", "Sos": "song-of-solomon",
    "Wisdom": "wisdom", "Wis": "wisdom",
    "Sirach": "sirach", "Sir": "sirach", "Ecclesiasticus": "sirach",
    "Isaiah": "isaiah", "Isa": "isaiah", "Is": "isaiah",
    "Jeremiah": "jeremiah", "Jer": "jeremiah",
    "Lamentations": "lamentations", "Lam": "lamentations",
    "Baruch": "baruch", "Bar": "baruch",
    "Ezekiel": "ezekiel", "Ezek": "ezekiel", "Eze": "ezekiel",
    "Daniel": "daniel", "Dan": "daniel",
    "Hosea": "hosea", "Hos": "hosea",
    "Joel": "joel", "Joe": "joel",
    "Amos": "amos", "Amo": "amos",
    "Obadiah": "obadiah", "Obad": "obadiah", "Oba": "obadiah",
    "Jonah": "jonah", "Jon": "jonah",
    "Micah": "micah", "Mic": "micah",
    "Nahum": "nahum", "Nah": "nahum",
    "Habakkuk": "habakkuk", "Hab": "habakkuk",
    "Zephaniah": "zephaniah", "Zeph": "zephaniah", "Zep": "zephaniah",
    "Haggai": "haggai", "Hag": "haggai",
    "Zechariah": "zechariah", "Zech": "zechariah", "Zec": "zechariah",
    "Malachi": "malachi", "Mal": "malachi",
    "Matthew": "matthew", "Matt": "matthew", "Mt": "matthew", "Mat": "matthew",
    "Mark": "mark", "Mk": "mark", "Mar": "mark",
    "Luke": "luke", "Lk": "luke", "Luk": "luke",
    "John": "john", "Jn": "john", "Joh": "john",
    "Acts": "acts", "Act": "acts",
    "Romans": "romans", "Rom": "romans", "Rm": "romans",
    "1 Corinthians": "1-corinthians", "1 Cor": "1-corinthians", "1 Co": "1-corinthians", "1Co": "1-corinthians",
    "2 Corinthians": "2-corinthians", "2 Cor": "2-corinthians", "2 Co": "2-corinthians", "2Co": "2-corinthians",
    "Galatians": "galatians", "Gal": "galatians",
    "Ephesians": "ephesians", "Eph": "ephesians",
    "Philippians": "philippians", "Phil": "philippians", "Phi": "philippians",
    "Colossians": "colossians", "Col": "colossians",
    "1 Thessalonians": "1-thessalonians", "1 Thess": "1-thessalonians", "1 Th": "1-thessalonians", "1Th": "1-thessalonians",
    "2 Thessalonians": "2-thessalonians", "2 Thess": "2-thessalonians", "2 Th": "2-thessalonians", "2Th": "2-thessalonians",
    "1 Timothy": "1-timothy", "1 Tim": "1-timothy", "1 Ti": "1-timothy", "1Ti": "1-timothy",
    "2 Timothy": "2-timothy", "2 Tim": "2-timothy", "2 Ti": "2-timothy", "2Ti": "2-timothy",
    "Titus": "titus", "Tit": "titus",
    "Philemon": "philemon", "Phlm": "philemon", "Phm": "philemon",
    "Hebrews": "hebrews", "Heb": "hebrews",
    "James": "james", "Jas": "james", "Jam": "james",
    "1 Peter": "1-peter", "1 Pet": "1-peter", "1 Pe": "1-peter", "1Pe": "1-peter",
    "2 Peter": "2-peter", "2 Pet": "2-peter", "2 Pe": "2-peter", "2Pe": "2-peter",
    "1 John": "1-john", "1 Jn": "1-john", "1 Jo": "1-john", "1Jo": "1-john",
    "2 John": "2-john", "2 Jn": "2-john", "2 Jo": "2-john", "2Jo": "2-john",
    "3 John": "3-john", "3 Jn": "3-john", "3 Jo": "3-john", "3Jo": "3-john",
    "Jude": "jude", "Jud": "jude",
    "Revelation": "revelation", "Rev": "revelation", "Apocalypse": "revelation"
  };

  let bookPart = "";
  let rest = "";
  
  // Sort keys by length DESC to match longer abbreviations first (e.g. "1 John" before "John")
  const sortedAbbrevs = Object.keys(abbrevMap).sort((a, b) => b.length - a.length);

  for (const abbrev of sortedAbbrevs) {
    if (raw.startsWith(abbrev)) {
      bookPart = abbrev;
      rest = raw.slice(abbrev.length).trim();
      break;
    }
  }

  const slug = abbrevMap[bookPart] ?? "genesis";
  
  // Clean up 'rest' to handle cases like "31:5-6" or "31 : 5-6"
  const cleanRest = rest.replace(/\s+/g, '');
  const colonIndex = cleanRest.indexOf(':');
  
  let chapter = 1;
  let versesPart = "";

  if (colonIndex !== -1) {
    chapter = parseInt(cleanRest.slice(0, colonIndex).replace(/\D/g, '')) || 1;
    versesPart = cleanRest.slice(colonIndex + 1);
  } else {
    // Check for chapter then space then verses: "Ps 23 1-6"
    const spaceMatch = rest.trim().match(/^(\d+)\s+(.*)/);
    if (spaceMatch) {
      chapter = parseInt(spaceMatch[1]!) || 1;
      versesPart = spaceMatch[2]!.replace(/\s+/g, '');
    } else {
      chapter = parseInt(cleanRest.replace(/\D/g, '')) || 1;
    }
  }
  
  const verses: number[] = [];
  if (versesPart) {
    const segments = versesPart.split(/[^0-9-]/);
    for (const segment of segments) {
      if (!segment) continue;
      if (segment.includes('-')) {
        const range = segment.split('-');
        if (range.length >= 2) {
          const start = parseInt(range[0]!.replace(/\D/g, ''));
          const end = parseInt(range[range.length - 1]!.replace(/\D/g, ''));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              verses.push(i);
            }
          }
        }
      } else {
        const v = parseInt(segment.replace(/\D/g, ''));
        if (!isNaN(v)) verses.push(v);
      }
    }
  }

  if (verses.length === 0) verses.push(1);
  
  return {
    bookSlug: slug,
    chapter,
    verses: Array.from(new Set(verses)).sort((a, b) => a - b)
  };
}
