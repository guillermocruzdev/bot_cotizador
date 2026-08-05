// Guardia anti-ban: límite diario, horario hábil y delay aleatorio 30-90s.

import { getAntiBanConfig, type AntiBanConfig } from "../config";

export type SendGuardReason =
  | "outside_business_hours"
  | "daily_limit_reached"
  | "no_number";

export interface SendGuardResult {
  ok: boolean;
  reason?: SendGuardReason;
}

export class AntiBanGuard {
  private cfg: AntiBanConfig;
  private todayCounts = new Map<string, number>(); // número → envíos del día
  private dayKey = "";

  constructor(overrides?: Partial<AntiBanConfig>) {
    this.cfg = getAntiBanConfig(overrides);
  }

  get config(): AntiBanConfig {
    return this.cfg;
  }

  private hourInTz(date: Date): number {
    return Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: this.cfg.business_hours.timezone,
      }).format(date)
    );
  }

  private dayKeyNow(): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this.cfg.business_hours.timezone,
    }).format(new Date());
  }

  /** ¿Estamos dentro de la franja hábil? (start <= hora <= end) */
  isBusinessHours(date: Date = new Date()): boolean {
    const h = this.hourInTz(date);
    return h >= this.cfg.business_hours.start && h <= this.cfg.business_hours.end;
  }

  private rollDayIfNeeded(): void {
    const day = this.dayKeyNow();
    if (day !== this.dayKey) {
      this.dayKey = day;
      this.todayCounts.clear();
    }
  }

  /** ¿Se puede enviar a este número ahora? */
  canSend(number: string): SendGuardResult {
    if (!number) return { ok: false, reason: "no_number" };
    this.rollDayIfNeeded();
    if (!this.isBusinessHours()) {
      return { ok: false, reason: "outside_business_hours" };
    }
    if ((this.todayCounts.get(number) ?? 0) >= this.cfg.daily_limit) {
      return { ok: false, reason: "daily_limit_reached" };
    }
    return { ok: true };
  }

  /** Registra un envío realizado (suma al contador diario). */
  recordSend(number: string): void {
    this.rollDayIfNeeded();
    this.todayCounts.set(number, (this.todayCounts.get(number) ?? 0) + 1);
  }

  /** Envíos hechos hoy a este número. */
  sentToday(number: string): number {
    this.rollDayIfNeeded();
    return this.todayCounts.get(number) ?? 0;
  }

  /** Delay aleatorio dentro de [delay_min, delay_max]. */
  randomDelayMs(): number {
    const { delay_min, delay_max } = this.cfg;
    if (delay_max <= delay_min) return delay_min;
    return delay_min + Math.floor(Math.random() * (delay_max - delay_min + 1));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
