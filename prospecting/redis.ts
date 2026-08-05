// Utilidades compartidas de conexión Redis para BullMQ.
// Se leen las env vars en TIEMPO DE LLAMADA para poder override en pruebas.
export interface RedisConnectionInfo {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
}

export function parseRedisUrl(url: string): RedisConnectionInfo {
  const u = new URL(url);
  const out: RedisConnectionInfo = {
    host: u.hostname,
    port: Number(u.port || 6379),
  };
  if (u.password) out.password = u.password;
  if (u.username) out.username = u.username;
  if (u.pathname && u.pathname !== "/") out.db = Number(u.pathname.slice(1) || 0);
  return out;
}

export function redisConnection(): RedisConnectionInfo {
  return parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");
}
