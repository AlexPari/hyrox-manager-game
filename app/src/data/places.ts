// Display data only: race cities, countries, flags and rival names. The rules never depend on it.

export interface Place {
  country: string;
  countryName: string;
  region: string;
}

const place = (country: string, countryName: string, region = "Europe"): Place => ({ country, countryName, region });

export const CITIES: Record<string, Place> = {
  Lyon: place("FR", "France"),
  Paris: place("FR", "France"),
  London: place("GB", "Great Britain"),
  Milan: place("IT", "Italy"),
  Valencia: place("ES", "Spain"),
  Lille: place("FR", "France"),
  Munich: place("DE", "Germany"),
  Stockholm: place("SE", "Sweden"),
  Berlin: place("DE", "Germany"),
  Amsterdam: place("NL", "Netherlands"),
  Madrid: place("ES", "Spain"),
  Nice: place("FR", "France"),
  Barcelona: place("ES", "Spain"),
  Turin: place("IT", "Italy"),
  Bordeaux: place("FR", "France"),
  Marseille: place("FR", "France"),
  "World Championships": place("", "Worldwide", "World"),
};

export function placeOf(city: string): Place {
  return CITIES[city] ?? place("", "", "");
}

/** Emoji flag from a 2-letter country code (a globe when there is none). */
export function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "\u{1F30D}";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const COUNTRIES = [
  { code: "FR", name: "France" },
  { code: "GB", name: "Great Britain" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
];

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

const FIRST = ["Xavier", "Julien", "Tanguy", "Quentin", "Alan", "Maxime", "Kevin", "Arthur", "Hugo", "Louis", "Tom", "Ben", "Jack", "Oliver", "Harry", "Lukas", "Felix", "Jonas", "Marco", "Luca", "Matteo", "Pablo", "Diego", "Javier", "Erik", "Lars", "Noah", "Sam", "Ryan", "Daan", "Milan", "Elias"];
const LAST = ["Dufort", "Coquillard", "Cruze", "Garelle", "Kao", "Blanc", "Lambert", "Petit", "Moreau", "Roux", "Walker", "Hughes", "Taylor", "Becker", "Wagner", "Keller", "Rossi", "Ferrari", "Bianchi", "Garcia", "Lopez", "Navarro", "Lindqvist", "Berg", "Jansen", "Visser", "Novak", "Meyer", "Fischer", "Silva", "Costa", "Evans"];
const NATIONS = ["FR", "GB", "DE", "IT", "ES", "NL", "SE", "BE", "CH", "US", "AU", "CA"];

/** Stable made-up name and country for a rival of the current field. */
export function rivalIdentity(season: number, division: string, index: number): { name: string; country: string } {
  let h = (season * 7919 + index * 104729 + division.length * 1301 + 12345) >>> 0;
  const next = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h;
  };
  next();
  return { name: `${FIRST[next() % FIRST.length]} ${LAST[next() % LAST.length]}`, country: NATIONS[next() % NATIONS.length] };
}
