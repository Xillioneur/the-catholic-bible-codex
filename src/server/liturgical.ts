import { generateLiturgicalCalendar } from "@v-bible/liturgical-calendar-generator";
import { type LiturgicalInfo, type LiturgicalColor } from "~/lib/liturgical";
import path from "path";

const calendarCache: Record<number, any[]> = {};

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#xa0;/g, " ")
    .replace(/&#x2010;/g, "-")
    .replace(/&#x2011;/g, "-")
    .replace(/&#x2013;/g, "-")
    .replace(/&#x2014;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&#x2018;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&#x201c;/g, '"')
    .replace(/&#x201d;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Universalis often uses Vulgate numbering for Psalms in GA/V fields.
 * This helper attempts to normalize them to Hebrew/Modern numbering so our 
 * app-wide parser and router can handle them consistently.
 */
function normalizePsalmCitation(citation: string): string {
  if (!citation || !citation.toLowerCase().startsWith('ps')) return citation;

  // If it already has dual numbering like "Psalm 15(16)", the parser handles it.
  if (citation.includes('(')) return citation;

  // Extract the number
  const match = citation.match(/ps(?:alm)?\s*(\d+)/i);
  if (!match) return citation;

  const vNum = parseInt(match[1]!);
  let hNum = vNum;

  // Basic Vulgate -> Hebrew mapping
  if (vNum >= 10 && vNum <= 112) hNum = vNum + 1;
  else if (vNum === 113) hNum = 114; // Could be 115, 114 is safer
  else if (vNum === 114 || vNum === 115) hNum = 116;
  else if (vNum >= 116 && vNum <= 145) hNum = vNum + 1;
  else if (vNum === 146 || vNum === 147) hNum = 147;

  if (hNum !== vNum) {
    return citation.replace(match[1]!, `${vNum}(${hNum})`);
  }

  return citation;
}

/**
 * Manually injects sequence citations and texts for major feast days if they are missing.
 * Sequences are poetic hymns but have strong scriptural foundations.
 */
function getSequenceCitation(dayTitle: string, season: string): { citation: string; text: string } | undefined {
  const title = dayTitle.toLowerCase();
  
  // Easter Sequence: Victimae Paschali Laudes
  if (title.includes("easter") && (title.includes("sunday") || title.includes("monday") || title.includes("tuesday") || title.includes("wednesday") || title.includes("thursday") || title.includes("friday") || title.includes("saturday"))) {
    return {
      citation: "1 Corinthians 5:7-8",
      text: "Christians, to the Paschal Victim / offer sacrifice and praise. / The sheep are ransomed by the Lamb; / and Christ, the undefiled, / hath sinners to his Father reconciled. / Death with life contended: / combat strangely ended! / Life’s own Champion, slain, / yet lives to reign. / Tell us, Mary: / say what thou didst see / upon the way. / The tomb the Living did enclose; / I saw Christ’s glory as he rose! / The angels there attesting; / shroud with grave-clothes resting. / Christ, my hope, has risen: / he goes before you into Galilee. / That Christ is truly risen / from the dead we know. / Victorious king, thy mercy show! / Amen. Alleluia."
    };
  }

  // Pentecost Sequence: Veni Sancte Spiritus
  if (title.includes("pentecost")) {
    return {
      citation: "Romans 8:8-17",
      text: "Holy Spirit, Lord of light, / From the clear celestial height / Thy pure beaming radiance give. / Come, Thou Father of the poor, / Come with treasures which endure; / Come, Thou light of all that live! / Thou, of all consolers best, / Thou, the soul's delightsome guest, / Dost refreshing peace bestow; / Thou in toil art comfort sweet; / Pleasant coolness in the heat; / Solace in the midst of woe. / Light immortal, light divine, / Visit Thou these hearts of Thine, / And our inmost being fill: / If Thou take Thy grace away, / Nothing pure in man will stay; / All his good is turned to ill. / Heal our wounds, our strength renew; / On our dryness pour Thy dew; / Wash the stains of guilt away: / Bend the stubborn heart and will; / Melt the frozen, warm the chill; / Guide the steps that go astray. / Thou, on us who evermore / Thee confess and Thee adore, / With Thy sevenfold gifts descend: / Give us comfort when we die; / Give us life with Thee on high; / Give us joys that never end. / Amen. Alleluia."
    };
  }

  // Corpus Christi Sequence: Lauda Sion
  if (title.includes("corpus christi") || title.includes("body and blood of christ")) {
    return {
      citation: "1 Corinthians 10:16-17",
      text: "Laud, O Sion, thy salvation, / Laud with hymns of exultation, / Christ, thy king and shepherd true: / Bring him all the praise thou knowest, / He is more than thou bestowest, / Never canst thou reach his due. / Special theme for glad thanksgiving / Is the quick'ning and the living / Bread today before thee set: / From his hands of old partaken, / As we know, by faith unshaken, / Where the Twelve at supper met."
    };
  }

  // Our Lady of Sorrows (Sept 15): Stabat Mater
  if (title.includes("sorrows") && title.includes("mary")) {
    return {
      citation: "Luke 2:33-35",
      text: "At the Cross her station keeping, / stood the mournful Mother weeping, / close to her Son to the last. / Through her heart, His sorrow sharing, / all His bitter anguish bearing, / now at length the sword has passed. / O how sad and sore distressed / was that Mother, highly blest, / of the sole-begotten One. / Christ above in torment hangs, / she beneath beholds the pangs / of her dying glorious Son."
    };
  }

  return undefined;
}

export async function getLiturgicalInfoServer(dateInput: Date = new Date()): Promise<LiturgicalInfo> {
  const day = String(dateInput.getDate()).padStart(2, '0');
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const year = dateInput.getFullYear();
  const dateStr = `${day}/${month}/${year}`;
  const universalsDateStr = `${year}${month}${day}`;
  
  try {
    // 1. ATTEMPT LIVE API (Universalis)
    console.log(`[LITURGICAL] Fetching live data from Universalis for ${dateStr}`);
    const response = await fetch(`https://universalis.com/${universalsDateStr}/jsonpmass.js`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (response.ok) {
      const text = await response.text();
      // Strip universalisCallback( and ); robustly
      const startIdx = text.indexOf("(");
      const endIdx = text.lastIndexOf(")");
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("Invalid JSONP response from Universalis");
      }
      const jsonStr = text.substring(startIdx + 1, endIdx).trim();
      const data = JSON.parse(jsonStr);

      const dayTitle = decodeHtmlEntities(data.day);
      let season = "Ordinary Time";
      let liturgicalColor: LiturgicalColor = "green";

      if (dayTitle.includes("Lent")) {
        season = "Lent";
        liturgicalColor = "violet";
      } else if (dayTitle.includes("Advent")) {
        season = "Advent";
        liturgicalColor = "violet";
      } else if (dayTitle.includes("Easter")) {
        season = "Easter";
        liturgicalColor = "white";
      } else if (dayTitle.includes("Christmas")) {
        season = "Christmas";
        liturgicalColor = "white";
      }

      const manualSeq = getSequenceCitation(dayTitle, season);
      const readings: any = {
        firstReading: normalizePsalmCitation(decodeHtmlEntities(data.Mass_R1?.source)),
        firstReadingHeading: decodeHtmlEntities(data.Mass_R1?.heading),
        psalm: normalizePsalmCitation(decodeHtmlEntities(data.Mass_Ps?.source)),
        secondReading: normalizePsalmCitation(decodeHtmlEntities(data.Mass_R2?.source)),
        secondReadingHeading: decodeHtmlEntities(data.Mass_R2?.heading),
        sequence: normalizePsalmCitation(decodeHtmlEntities(data.Mass_S?.source || data.Mass_Seq?.source)) || manualSeq?.citation,
        sequenceText: decodeHtmlEntities(data.Mass_S?.text || data.Mass_Seq?.text) || manualSeq?.text,
        alleluia: normalizePsalmCitation(decodeHtmlEntities(data.Mass_GA?.source || data.Mass_V?.source)),
        alleluiaText: decodeHtmlEntities(data.Mass_GA?.text || data.Mass_V?.text),
        verseBeforeGospel: normalizePsalmCitation(decodeHtmlEntities(data.Mass_V?.source || data.Mass_GA?.source)),
        gospel: normalizePsalmCitation(decodeHtmlEntities(data.Mass_G?.source)),
        gospelHeading: decodeHtmlEntities(data.Mass_G?.heading)
      };

      console.log(`[LITURGICAL] Live data success for ${dateStr}`);
      return {
        season,
        color: liturgicalColor,
        day: dayTitle || "Weekday",
        readings
      };
    }
  } catch (err) {
    console.warn(`[LITURGICAL] Live API failed, falling back to generator:`, err);
  }

  // 2. FALLBACK TO LOCAL GENERATOR
  try {
    // Fix: provide a relative path because the library prepends process.cwd()
    const liturgicalDataPath = path.join("node_modules", "@v-bible", "liturgical-calendar-generator", "liturgical");

    if (!calendarCache[year]) {
      console.log(`[LITURGICAL] Generating calendar for ${year} at ${liturgicalDataPath}`);
      calendarCache[year] = await generateLiturgicalCalendar(year, { 
        locale: "en",
        liturgicalDataPath
      });
    }
    
    const calendar = calendarCache[year]!;
    const dayInfo = calendar.find(d => d.date === dateStr);

    if (!dayInfo) {
      throw new Error(`No data found for ${dateStr}`);
    }

    const colorMap: Record<string, LiturgicalColor> = {
      "green": "green",
      "purple": "violet",
      "white": "white",
      "red": "red",
      "rose": "rose",
      "gold": "gold"
    };

    let liturgicalColor: LiturgicalColor = "green";
    if (dayInfo.color && colorMap[dayInfo.color]) {
      liturgicalColor = colorMap[dayInfo.color]!;
    }

    const seasonLower = (dayInfo.season || "").toLowerCase();
    const nameLower = (dayInfo.name || "").toLowerCase();
    if (seasonLower.includes("lent") || nameLower.includes("lent")) liturgicalColor = "violet";
    if (seasonLower.includes("advent") || nameLower.includes("advent")) liturgicalColor = "violet";
    if (dayInfo.color === "purple") liturgicalColor = "violet";

    const finalDayTitle = dayInfo.name || dayInfo.description || "Weekday";
    const finalSeason = dayInfo.season || "Ordinary Time";
    const manualSeq = getSequenceCitation(finalDayTitle, finalSeason);

    return {
      season: finalSeason,
      color: liturgicalColor,
      day: finalDayTitle,
      readings: {
        firstReading: Array.isArray(dayInfo.firstReading) ? dayInfo.firstReading[0] : dayInfo.firstReading,
        psalm: Array.isArray(dayInfo.psalm) ? dayInfo.psalm[0] : dayInfo.psalm,
        secondReading: Array.isArray(dayInfo.secondReading) ? dayInfo.secondReading[0] : dayInfo.secondReading,
        sequence: manualSeq?.citation,
        sequenceText: manualSeq?.text,
        alleluia: dayInfo.verseBeforeGospel || (Array.isArray(dayInfo.gospelAcclamation) ? dayInfo.gospelAcclamation[0] : dayInfo.gospelAcclamation),
        gospel: Array.isArray(dayInfo.gospel) ? dayInfo.gospel[0] : dayInfo.gospel,
      }
    };
  } catch (e) {
    console.error(`[LITURGICAL ERROR] Failed to fetch info for ${dateStr}:`, e);
    
    return {
      season: "Lent",
      color: "violet",
      day: "Tuesday of the Second Week of Lent",
      readings: {
        firstReading: "Isaiah 1:10, 16-20",
        psalm: "Psalm 50:8-9, 16bc-17, 21, 23",
        gospel: "Matthew 23:1-12"
      }
    };
  }
}
