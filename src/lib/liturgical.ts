export type LiturgicalColor = "green" | "violet" | "white" | "red" | "rose" | "gold";

export interface LiturgicalInfo {
  season: string;
  color: LiturgicalColor;
  day: string;
}

/**
 * A simplified utility to get the current liturgical info.
 * In a production app, this would use a more robust library or API.
 */
export function getCurrentLiturgicalInfo(date: Date = new Date()): LiturgicalInfo {
  // Simplistic placeholder logic for liturgical seasons
  // Real logic involves calculating Easter, Advent, etc.
  
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // Very rough approximation for demo purposes:
  // Advent: December
  if (month === 11) {
    return { season: "Advent", color: "violet", day: "Weekday of Advent" };
  }
  // Christmas: Late Dec to Jan 6
  if ((month === 11 && day >= 25) || (month === 0 && day <= 6)) {
    return { season: "Christmas", color: "white", day: "Christmas Season" };
  }
  // Lent: Simple March approximation
  if (month === 2) {
    return { season: "Lent", color: "violet", day: "Lenten Weekday" };
  }
  // Ordinary Time: Default
  return { season: "Ordinary Time", color: "green", day: "Tuesday of Ordinary Time" };
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
