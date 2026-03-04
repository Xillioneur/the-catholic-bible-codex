import { generateLiturgicalCalendar } from "@v-bible/liturgical-calendar-generator";
import { type LiturgicalInfo, type LiturgicalColor } from "~/lib/liturgical";

const calendarCache: Record<number, any[]> = {};

export async function getLiturgicalInfoServer(dateInput: Date = new Date()): Promise<LiturgicalInfo> {
  // Use UTC to avoid local timezone shifts during date formatting
  const day = String(dateInput.getDate()).padStart(2, '0');
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const year = dateInput.getFullYear();
  const dateStr = `${day}/${month}/${year}`;
  
  const liturgicalDataPath = "node_modules/@v-bible/liturgical-calendar-generator/liturgical";

  if (!calendarCache[year]) {
    calendarCache[year] = await generateLiturgicalCalendar(year, { 
      locale: "en",
      liturgicalDataPath
    });
  }
  
  const calendar = calendarCache[year]!;
  const dayInfo = calendar.find(d => d.date === dateStr);

  if (!dayInfo) {
    console.error(`[LITURGICAL ERROR] No data found for ${dateStr}`);
    throw new Error(`Liturgical data missing for ${dateStr}`);
  }

  // Refined color and metadata logic
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

  // Override for seasons if the data is ambiguous
  const seasonLower = (dayInfo.season || "").toLowerCase();
  const nameLower = (dayInfo.name || "").toLowerCase();
  if (seasonLower.includes("lent") || nameLower.includes("lent")) liturgicalColor = "violet";
  if (seasonLower.includes("advent") || nameLower.includes("advent")) liturgicalColor = "violet";
  if (dayInfo.color === "purple") liturgicalColor = "violet";

  const result: LiturgicalInfo = {
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

  console.log(`[LITURGICAL SUCCESS] ${dateStr}: ${result.readings.firstReading} | ${result.readings.gospel}`);
  return result;
}
