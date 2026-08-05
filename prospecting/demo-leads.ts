// Leads de ejemplo para la DEMO en vivo (cuando no hay SERPAPI_API_KEY o la
// búsqueda falla). Permiten ver el feed completo sin gastar nada ni depender
// de la API de Google Maps.
export interface DemoLead {
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  website: string | null;
  has_website: false;
}

const TITLES = [
  "Central",
  "Nueva",
  "Don José",
  "La Esquina",
  "Del Valle",
  "San Pedro",
  "Aurora",
  "Moderno",
  "Familiar",
  "Premium",
];

const STREETS = [
  "Av. Juárez 123",
  "Calle Hidalgo 45",
  "Blvd. Constitución 789",
  "Av. Morelos 210",
  "Calle Guerrero 56",
  "Av. Revolución 34",
  "Calle Zaragoza 98",
  "Av. Universidad 1567",
];

function cap(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function makePhone(i: number): string {
  return `+52 81 ${String(1000 + i * 137).slice(0, 4)} ${String(1000 + i * 431).slice(0, 4)}`;
}

/** Genera `count` negocios ficticios del tipo pedido, con categoría derivada. */
export function makeDemoLeads(businessType: string, location: string, count: number): DemoLead[] {
  const type = cap(businessType);
  return TITLES.slice(0, count).map((t, i) => ({
    name: `${t} ${type}`,
    phone: makePhone(i),
    address: `${STREETS[i % STREETS.length]}, ${cap(location)}`,
    category: type,
    website: null,
    has_website: false,
  }));
}
