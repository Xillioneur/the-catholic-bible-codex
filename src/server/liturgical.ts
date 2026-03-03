import { generateLiturgicalCalendar } from "@v-bible/liturgical-calendar-generator";
import { type LiturgicalInfo, type LiturgicalColor } from "~/lib/liturgical";

export async function getLiturgicalInfoServer(date: Date = new Date()): Promise<LiturgicalInfo> {
  const dateStr = date.toISOString().split("T")[0]!;
  const calendar = await generateLiturgicalCalendar(date.getFullYear(), { locale: "en" });
  
  const dayInfo = calendar.find(d => d.date === dateStr);

  if (!dayInfo) {
    return {
      season: "Ordinary Time",
      color: "green",
      day: "Weekday",
      readings: {
        firstReading: "Gen 1:1-5",
        gospel: "Jn 1:1-5"
      }
    };
  }

  // Use the description or slug for the day name
  const dayName = dayInfo.description || dayInfo.slug;

  const colorMap: Record<string, LiturgicalColor> = {
    "green": "green",
    "purple": "violet",
    "white": "white",
    "red": "red",
    "rose": "rose",
    "gold": "gold"
  };

  // Safe color lookup with fallback
  const liturgicalColor = dayInfo.color && colorMap[dayInfo.color] 
    ? colorMap[dayInfo.color] 
    : "green";

  return {
    season: dayInfo.season,
    color: liturgicalColor as LiturgicalColor,
    day: dayName,
    readings: {
      firstReading: Array.isArray(dayInfo.firstReading) ? dayInfo.firstReading[0] : dayInfo.firstReading,
      psalm: Array.isArray(dayInfo.psalm) ? dayInfo.psalm[0] : dayInfo.psalm,
      secondReading: Array.isArray(dayInfo.secondReading) ? dayInfo.secondReading[0] : dayInfo.secondReading,
      gospel: Array.isArray(dayInfo.gospel) ? dayInfo.gospel[0] : dayInfo.gospel,
    }
  };
}
