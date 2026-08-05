// Configuración global de prospección / WhatsApp (anti-ban).
// Sobre-escribible por env: PROSPECT_TZ, PROSPECT_DAILY_LIMIT.

export interface BusinessHoursConfig {
  start: number;
  end: number;
  timezone: string;
}

export interface AntiBanConfig {
  daily_limit: number;
  delay_min: number;
  delay_max: number;
  business_hours: BusinessHoursConfig;
  blacklist_keywords: string[];
}

const DEFAULT_CONFIG: AntiBanConfig = {
  daily_limit: 50,
  delay_min: 30_000,
  delay_max: 90_000,
  business_hours: {
    start: 9,
    end: 20,
    timezone: process.env.PROSPECT_TZ ?? "America/Monterrey",
  },
  blacklist_keywords: ["no gracias", "stop", "baja", "eliminar"],
};

export function getAntiBanConfig(
  overrides?: Partial<AntiBanConfig>
): AntiBanConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    business_hours: {
      ...DEFAULT_CONFIG.business_hours,
      ...(overrides?.business_hours ?? {}),
    },
  };
}
