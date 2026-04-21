export type LiturgicalColor = "green" | "violet" | "white" | "red" | "rose" | "gold";

export interface LiturgicalInfo {
  season: string;
  color: LiturgicalColor;
  day: string;
  readings: {
    firstReading?: string;
    firstReadingHeading?: string;
    psalm?: string;
    secondReading?: string;
    secondReadingHeading?: string;
    sequence?: string;
    sequenceName?: string;
    sequenceText?: string;
    alleluia?: string;
    alleluiaText?: string;
    verseBeforeGospel?: string;
    gospel?: string;
    gospelHeading?: string;
  };
}

export function getLiturgicalColorOklch(color: LiturgicalColor): { 
  primary: string;
  foreground: string;
  surface: string;
} {
  switch (color) {
    case "green": 
      return {
        primary: "0.6 0.12 150", // Vibrant Green
        foreground: "0.25 0.06 150",
        surface: "0.97 0.02 150"
      };
    case "violet": 
      return {
        primary: "0.45 0.15 285", // Deep Violet
        foreground: "0.2 0.08 285",
        surface: "0.96 0.02 285"
      };
    case "white": 
      return {
        primary: "0.75 0.05 85", // Warm Gold/Cream for "White" feast days
        foreground: "0.3 0.02 85",
        surface: "0.98 0.01 85"
      };
    case "red": 
      return {
        primary: "0.55 0.2 25", // Martyr's Red
        foreground: "0.2 0.1 25",
        surface: "0.96 0.03 25"
      };
    case "rose": 
      return {
        primary: "0.7 0.12 350", // Gaudete/Laetare Pink
        foreground: "0.3 0.08 350",
        surface: "0.97 0.02 350"
      };
    case "gold": 
      return {
        primary: "0.8 0.15 85", // Regal Gold
        foreground: "0.3 0.1 85",
        surface: "0.97 0.04 85"
      };
    default: 
      return {
        primary: "0.6 0.12 150",
        foreground: "0.25 0.06 150",
        surface: "0.97 0.02 150"
      };
  }
}

export interface ParsedCitation {
  bookSlug: string;
  chapter: number;
  verses: number[];
  endChapter?: number;
  endVerse?: number;
}

/**
 * The most robust parser for Catholic citations.
 * Handles complex strings, multi-range verses, and varying abbreviations.
 */
export function parseCitation(citation: string): ParsedCitation {
  // CLEAN: Remove only specific known prefixes if they exist
  // Strip 'cf.' or 'cf' and any leading/trailing whitespace
  let raw = citation.replace(/^(First Reading|Second Reading|Gospel|Psalm|Alleluia|Gospel Acclamation):\s+/i, '').trim();
  raw = raw.replace(/^cf\.?\s*/i, '').trim();

  // Strip liturgical markers like ℞, R. or specific response verse identifiers at the end
  // (e.g. "Ps 118:1-2. ℞ 1b")
  raw = raw.replace(/[. ]*([℞R]|&#x211f;)\s*[\d\w]*$/i, '').trim();

  // Handle spaceless citations like Lk24:32 by inserting a space before the first digit
  // but only if it's not already there and not part of a book name like 1 Samuel
  if (/^[a-zA-Z]+\d/.test(raw)) {
    raw = raw.replace(/^([a-zA-Z]+)(\d)/, '$1 $2');
  }

  // Handle dual Psalm numbering: Ps 118(119) or Ps 119(118)
  // We want to extract the Hebrew (Modern) number for internal processing 
  // because the router logic expects Hebrew and maps to Vulgate for DRB/VUL.
  // In the Psalter, the Hebrew number is always >= the Vulgate number.
  if (raw.toLowerCase().startsWith('ps')) {
    const dualMatch = raw.match(/ps(?:alm)?\s*(\d+)\s*\(\s*(\d+)\s*\)/i);
    if (dualMatch?.[1] && dualMatch?.[2]) {
      const n1 = parseInt(dualMatch[1]);
      const n2 = parseInt(dualMatch[2]);
      const hebrewChapter = Math.max(n1, n2);
      // Replace the dual-numbering part with a clean 'Psalms [HebrewNum]'
      raw = raw.replace(/^ps(?:alm)?\s*\d+\s*\(\s*\d+\s*\)/i, `Psalms ${hebrewChapter}`);
    } else {
      // Fallback for single parentheses if only one number was matched
      const singleMatch = raw.match(/ps(?:alm)?\s*\d+\s*\(\s*(\d+)\s*\)/i);
      if (singleMatch?.[1]) {
        raw = raw.replace(/^ps(?:alm)?\s*\d+\s*\(\s*\d+\s*\)/i, `Psalms ${singleMatch[1]}`);
      }
    }
  }

  const abbrevMap: Record<string, string> = {
    "Genesis": "genesis", "Gen": "genesis", "Gn": "genesis", "Gn.": "genesis", "Gen.": "genesis",
    "Exodus": "exodus", "Exo": "exodus", "Ex": "exodus", "Ex.": "exodus", "Exo.": "exodus",
    "Leviticus": "leviticus", "Lev": "leviticus", "Lv": "leviticus", "Lv.": "leviticus", "Lev.": "leviticus",
    "Numbers": "numbers", "Num": "numbers", "Nm": "numbers", "Nm.": "numbers", "Num.": "numbers",
    "Deuteronomy": "deuteronomy", "Deut": "deuteronomy", "Dt": "deuteronomy", "Deu": "deuteronomy", "Dt.": "deuteronomy", "Deut.": "deuteronomy",
    "Joshua": "joshua", "Josh": "joshua", "Jos": "joshua", "Jos.": "joshua", "Josh.": "joshua",
    "Judges": "judges", "Judg": "judges", "Jdg": "judges", "Jdg.": "judges", "Judg.": "judges",
    "Ruth": "ruth", "Rut": "ruth", "Rut.": "ruth",
    "1 Samuel": "1-samuel", "1 Sam": "1-samuel", "1 Sa": "1-samuel", "1Sa": "1-samuel", "1 Sam.": "1-samuel", "1 Sa.": "1-samuel",
    "2 Samuel": "2-samuel", "2 Sam": "2-samuel", "2 Sa": "2-samuel", "2Sa": "2-samuel", "2 Sam.": "2-samuel", "2 Sa.": "2-samuel",
    "1 Kings": "1-kings", "1 Kgs": "1-kings", "1 Ki": "1-kings", "1Ki": "1-kings", "1 Kgs.": "1-kings", "1 Ki.": "1-kings",
    "2 Kings": "2-kings", "2 Kgs": "2-kings", "2 Ki": "2-kings", "2Ki": "2-kings", "2 Kgs.": "2-kings", "2 Ki.": "2-kings",
    "1 Chronicles": "1-chronicles", "1 Chr": "1-chronicles", "1 Ch": "1-chronicles", "1Ch": "1-chronicles", "1 Chr.": "1-chronicles", "1 Ch.": "1-chronicles",
    "2 Chronicles": "2-chronicles", "2 Chr": "2-chronicles", "2 Ch": "2-chronicles", "2Ch": "2-chronicles", "2 Chr.": "2-chronicles", "2 Ch.": "2-chronicles",
    "Ezra": "ezra", "Ezr": "ezra", "Ezr.": "ezra",
    "Nehemiah": "nehemiah", "Neh": "nehemiah", "Neh.": "nehemiah",
    "Tobit": "tobit", "Tob": "tobit", "Tob.": "tobit",
    "Judith": "judith", "Jdt": "judith", "Judit": "judith", "Jdt.": "judith",
    "Esther": "esther", "Esth": "esther", "Est": "esther", "Est.": "esther", "Esth.": "esther",
    "1 Maccabees": "1-maccabees", "1 Mac": "1-maccabees", "1 Ma": "1-maccabees", "1Ma": "1-maccabees", "1 Mac.": "1-maccabees", "1 Ma.": "1-maccabees",
    "2 Maccabees": "2-maccabees", "2 Mac": "2-maccabees", "2 Ma": "2-maccabees", "2Ma": "2-maccabees", "2 Mac.": "2-maccabees", "2 Ma.": "2-maccabees",
    "Job": "job", "Job.": "job",
    "Psalms": "psalms", "Psalm": "psalms", "Ps": "psalms", "Psa": "psalms", "Ps.": "psalms", "Psa.": "psalms",
    "Proverbs": "proverbs", "Prov": "proverbs", "Pro": "proverbs", "Prov.": "proverbs", "Pro.": "proverbs",
    "Ecclesiastes": "ecclesiastes", "Eccl": "ecclesiastes", "Ecc": "ecclesiastes", "Eccl.": "ecclesiastes", "Ecc.": "ecclesiastes",
    "Song of Solomon": "song-of-solomon", "Song of Songs": "song-of-solomon", "Song": "song-of-solomon", "Sos": "song-of-solomon", "Sos.": "song-of-solomon",
    "Wisdom": "wisdom", "Wis": "wisdom", "Wis.": "wisdom",
    "Sirach": "sirach", "Sir": "sirach", "Sir.": "sirach", "Ecclesiasticus": "sirach",
    "Isaiah": "isaiah", "Isa": "isaiah", "Is": "isaiah", "Is.": "isaiah", "Isa.": "isaiah",
    "Jeremiah": "jeremiah", "Jer": "jeremiah", "Jer.": "jeremiah",
    "Lamentations": "lamentations", "Lam": "lamentations", "Lam.": "lamentations",
    "Baruch": "baruch", "Bar": "baruch", "Bar.": "baruch",
    "Ezekiel": "ezekiel", "Ezek": "ezekiel", "Eze": "ezekiel", "Eze.": "ezekiel", "Ezek.": "ezekiel",
    "Daniel": "daniel", "Dan": "daniel", "Dan.": "daniel",
    "Hosea": "hosea", "Hos": "hosea", "Hos.": "hosea",
    "Joel": "joel", "Joe": "joel", "Joe.": "joel",
    "Amos": "amos", "Amo": "amos", "Amo.": "amos",
    "Obadiah": "obadiah", "Obad": "obadiah", "Oba": "obadiah", "Oba.": "obadiah",
    "Jonah": "jonah", "Jon": "jonah", "Jon.": "jonah",
    "Micah": "micah", "Mic": "micah", "Mic.": "micah",
    "Nahum": "nahum", "Nah": "nahum", "Nah.": "nahum",
    "Habakkuk": "habakkuk", "Hab": "habakkuk", "Hab.": "habakkuk",
    "Zephaniah": "zephaniah", "Zeph": "zephaniah", "Zep": "zephaniah", "Zep.": "zephaniah", "Zeph.": "zephaniah",
    "Haggai": "haggai", "Hag": "haggai", "Hag.": "haggai",
    "Zechariah": "zechariah", "Zech": "zechariah", "Zec": "zechariah", "Zec.": "zechariah", "Zech.": "zechariah",
    "Malachi": "malachi", "Mal": "malachi", "Mal.": "malachi",
    "Matthew": "matthew", "Matt": "matthew", "Mt": "matthew", "Mat": "matthew", "Mt.": "matthew", "Matt.": "matthew", "Mat.": "matthew",
    "Mark": "mark", "Mk": "mark", "Mar": "mark", "Mk.": "mark", "Mark.": "mark",
    "Luke": "luke", "Lk": "luke", "Luk": "luke", "Lk.": "luke", "Luke.": "luke",
    "John": "john", "Jn": "john", "Joh": "john", "Jn.": "john", "John.": "john",
    "Acts": "acts", "Act": "acts", "Act.": "acts", "Acts.": "acts",
    "Romans": "romans", "Rom": "romans", "Rm": "romans", "Rom.": "romans", "Rm.": "romans",
    "1 Corinthians": "1-corinthians", "1 Cor": "1-corinthians", "1 Co": "1-corinthians", "1Co": "1-corinthians", "1 Cor.": "1-corinthians", "1 Co.": "1-corinthians",
    "2 Corinthians": "2-corinthians", "2 Cor": "2-corinthians", "2 Co": "2-corinthians", "2Co": "2-corinthians", "2 Cor.": "2-corinthians", "2 Co.": "2-corinthians",
    "Galatians": "galatians", "Gal": "galatians", "Gal.": "galatians",
    "Ephesians": "ephesians", "Eph": "ephesians", "Eph.": "ephesians",
    "Philippians": "philippians", "Phil": "philippians", "Phi": "philippians", "Phil.": "philippians", "Phi.": "philippians",
    "Colossians": "colossians", "Col": "colossians", "Col.": "colossians",
    "1 Thessalonians": "1-thessalonians", "1 Thess": "1-thessalonians", "1 Th": "1-thessalonians", "1Th": "1-thessalonians", "1 Thess.": "1-thessalonians", "1 Th.": "1-thessalonians",
    "2 Thessalonians": "2-thessalonians", "2 Thess": "2-thessalonians", "2 Th": "2-thessalonians", "2Th": "2-thessalonians", "2 Thess.": "2-thessalonians", "2 Th.": "2-thessalonians",
    "1 Timothy": "1-timothy", "1 Tim": "1-timothy", "1 Ti": "1-timothy", "1Ti": "1-timothy", "1 Tim.": "1-timothy", "1 Ti.": "1-timothy",
    "2 Timothy": "2-timothy", "2 Tim": "2-timothy", "2 Ti": "2-timothy", "2Ti": "2-timothy", "2 Tim.": "2-timothy", "2 Ti.": "2-timothy",
    "Titus": "titus", "Tit": "titus", "Tit.": "titus",
    "Philemon": "philemon", "Phlm": "philemon", "Phm": "philemon", "Phm.": "philemon", "Phlm.": "philemon",
    "Hebrews": "hebrews", "Heb": "hebrews", "Heb.": "hebrews",
    "James": "james", "Jas": "james", "Jam": "james", "Jas.": "james", "Jam.": "james",
    "1 Peter": "1-peter", "1 Pet": "1-peter", "1 Pe": "1-peter", "1Pe": "1-peter", "1 Pet.": "1-peter", "1 Pe.": "1-peter",
    "2 Peter": "2-peter", "2 Pet": "2-peter", "2 Pe": "2-peter", "2Pe": "2-peter", "2 Pet.": "2-peter", "2 Pe.": "2-peter",
    "1 John": "1-john", "1 Jn": "1-john", "1 Jo": "1-john", "1Jo": "1-john", "1 Jn.": "1-john", "1 Jo.": "1-john",
    "2 John": "2-john", "2 Jn": "2-john", "2 Jo": "2-john", "2Jo": "2-john", "2 Jn.": "2-john", "2 Jo.": "2-john",
    "3 John": "3-john", "3 Jn": "3-john", "3 Jo": "3-john", "3Jo": "3-john", "3 Jn.": "3-john", "3 Jo.": "3-john",
    "Jude": "jude", "Jud": "jude", "Jud.": "jude",
    "Revelation": "revelation", "Rev": "revelation", "Rev.": "revelation", "Apocalypse": "revelation"
  };

  let bookPart = "";
  let rest = "";
  const sortedAbbrevs = Object.keys(abbrevMap).sort((a, b) => b.length - a.length);

  for (const abbrev of sortedAbbrevs) {
    if (raw.startsWith(abbrev)) {
      bookPart = abbrev;
      rest = raw.slice(abbrev.length).trim();
      break;
    }
  }

  const slug = abbrevMap[bookPart] ?? "genesis";
  
  // SPECIAL HANDLING: Universalis "Psalm 129(130)"
  // Extract both numbers. We'll decide which one to use later based on the translation.
  let chapter = 1;
  let versesPart = "";
  let endChapter: number | undefined = undefined;
  let endVerse: number | undefined = undefined;

  // Check for the "129(130)" pattern
  const complexPsalmMatch = rest.match(/^(\d+)\((\d+)\)/);
  if (slug === "psalms" && complexPsalmMatch) {
    // If it's a complex psalm, we store the 'alternative' in a way we can use.
    // For now, let's pick the second one (modern numbering) as default, 
    // but the router will map it correctly for DRB.
    chapter = parseInt(complexPsalmMatch[2]!);
    versesPart = rest.slice(complexPsalmMatch[0].length).trim();
  } else {
    // Standard isolation
    const cleanRest = rest.replace(/\s+/g, '');
    const colonIndex = cleanRest.indexOf(':');

    if (colonIndex !== -1) {
      const chapterStr = cleanRest.slice(0, colonIndex);
      chapter = parseInt(chapterStr.replace(/\D/g, '')) || 1;
      versesPart = cleanRest.slice(colonIndex + 1);

      // MULTI-CHAPTER DETECTION: e.g., "7:51-8:1a"
      // Look for another colon in the verses part
      const endChapterMatch = versesPart.match(/-(\d+):(\d+)/);
      if (endChapterMatch?.[1] && endChapterMatch?.[2]) {
        endChapter = parseInt(endChapterMatch[1]);
        endVerse = parseInt(endChapterMatch[2]);
        // Update versesPart to only include the first part for the 'verses' array
        // but we'll handle the actual resolution in the router.
        versesPart = versesPart.slice(0, endChapterMatch.index);
      }
    } else {
      const spaceMatch = rest.match(/^(\d+)/);
      if (spaceMatch) {
        chapter = parseInt(spaceMatch[1]!) || 1;
        versesPart = rest.slice(spaceMatch[1]!.length).trim();
      } else {
        chapter = parseInt(cleanRest.replace(/\D/g, '')) || 1;
      }
    }
  }
  
  const verses: number[] = [];
  if (versesPart) {
    const numericPart = versesPart.replace(/[a-zA-Z]/g, '');
    const segments = numericPart.split(/[^0-9-]/);
    
    for (const segment of segments) {
      if (!segment) continue;
      if (segment.includes('-')) {
        const range = segment.split('-');
        if (range.length >= 2) {
          const start = parseInt(range[0]!);
          const end = parseInt(range[range.length - 1]!);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              verses.push(i);
            }
          }
        }
      } else {
        const v = parseInt(segment);
        if (!isNaN(v)) verses.push(v);
      }
    }
  }
  
  return {
    bookSlug: slug,
    chapter,
    verses: Array.from(new Set(verses)).sort((a, b) => a - b),
    endChapter,
    endVerse
  };
}
