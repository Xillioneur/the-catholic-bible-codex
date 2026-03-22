import { generateLiturgicalCalendar } from "@v-bible/liturgical-calendar-generator";
import { type LiturgicalInfo, type LiturgicalColor } from "~/lib/liturgical";
import path from "path";

const calendarCache: Record<number, any[]> = {};

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

      const readings: any = {
        firstReading: data.Mass_R1?.source,
        psalm: data.Mass_Ps?.source,
        secondReading: data.Mass_R2?.source,
        verseBeforeGospel: data.Mass_V?.source,
        gospel: data.Mass_G?.source
      };

      // Clean up sources (replace entities)
      Object.keys(readings).forEach(k => {
        if (readings[k]) {
          readings[k] = readings[k]
            .replace(/&#x2010;/g, "-")
            .replace(/&#xa0;/g, " ")
            .replace(/&#x2019;/g, "'")
            .replace(/&#x2018;/g, "'")
            .replace(/&#x2013;/g, "-")
            .replace(/&ndash;/g, "-")
            .replace(/&mdash;/g, "-");
          
          // If it's a Psalm with 129(130) format, we can simplify it for the UI if desired,
          // but our parser handles it now. Let's keep it but ensure no strange chars.
        }
      });

      const dayTitle = (data.day || "").replace(/<[^>]*>?/gm, '').trim();
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

    return {
      season: dayInfo.season || "Ordinary Time",
      color: liturgicalColor,
      day: dayInfo.name || dayInfo.description || "Weekday",
      readings: {
        firstReading: Array.isArray(dayInfo.firstReading) ? dayInfo.firstReading[0] : dayInfo.firstReading,
        psalm: Array.isArray(dayInfo.psalm) ? dayInfo.psalm[0] : dayInfo.psalm,
        secondReading: Array.isArray(dayInfo.secondReading) ? dayInfo.secondReading[0] : dayInfo.secondReading,
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
