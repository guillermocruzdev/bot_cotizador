/**
 * PRUEBA DEL AGENTE DE DESCUBRIMIENTO (3 queries reales).
 *
 * Requisitos:
 *  - SERPAPI_API_KEY  → obligatoria para búsquedas reales (fase B+).
 *  - DEEPSEEK_API_KEY → opcional; activa la ruta del agente LangChain
 *                       (sin key se valida la ruta determinista).
 *  - SUPABASE         → opcional; prueba batchInsertLeads (si no, se omite).
 *
 * Ejecutar: npm run test:prospecting
 */

import { runDiscovery, type DiscoveryResult } from "../prospecting/ingest/search-agent";
import { hasWebsite } from "../prospecting/ingest/has-website";
import { batchInsertLeads } from "../prospecting/store/leads-repo";
import { isSupabaseConfigured } from "../lib/supabase";

let failures = 0;
let passed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.error(`  ❌ ${label}`);
  }
}

const QUERIES = [
  { business_type: "dentista", location: "Monterrey, México", max_results: 5 },
  { business_type: "restaurante", location: "Puebla, México", max_results: 5 },
  { business_type: "gimnasio", location: "Guadalajara, México", max_results: 5 },
];

async function main(): Promise<void> {
  console.log("=== Fase A: hasWebsite() (unit) ===");
  assert((await hasWebsite("https://www.google.com")) === true, "google.com → tiene sitio");
  assert((await hasWebsite("")) === false, "URL vacía → sin sitio");
  assert((await hasWebsite("https://no-existe-xyz-12345.invalid")) === false, "dominio inexistente → sin sitio");
  console.log();

  if (!process.env.SERPAPI_API_KEY) {
    console.warn("⚠️  SERPAPI_API_KEY no configurada → se omiten las búsquedas reales.");
    console.warn("    Agrega SERPAPI_API_KEY en .env.local para ejecutar la fase B+.");
    finish();
    return;
  }

  console.log("=== Fase B: runDiscovery (3 queries reales) ===");
  const results: DiscoveryResult[] = [];
  for (const q of QUERIES) {
    console.log(`\nQuery: ${q.business_type} @ ${q.location}`);
    try {
      const res = await runDiscovery(q);
      results.push(res);
      console.log(`  fuente=${res.source} · leads=${res.leads.length}`);
      for (const lead of res.leads) {
        console.log(`   · ${lead.name} | tel:${lead.phone ?? "-"} | ${lead.category ?? "-"}`);
      }
      assert(Array.isArray(res.leads), "devuelve un arreglo");
      assert(res.leads.length <= q.max_results, `≤ ${q.max_results} resultados`);
      assert(
        res.leads.every((l) => l.has_website === false),
        "todos con has_website=false (sin sitio)"
      );
      assert(
        res.leads.every((l) => l.name.trim().length > 0),
        "todos con nombre no vacío"
      );
    } catch (err) {
      failures++;
      console.error(`  ❌ ${(err as Error).message}`);
    }
  }
  console.log();

  console.log("=== Fase C: cache 24h ===");
  if (results.length > 0) {
    const q = QUERIES[0];
    const again = await runDiscovery(q);
    assert(
      again.cached === true,
      `2ª ejecución de "${q.business_type}" viene de cache (source=${again.source})`
    );
  } else {
    console.warn("  (sin resultados previos → se omite)");
  }
  console.log();

  console.log("=== Fase D: batch insert a Supabase ===");
  if (isSupabaseConfigured()) {
    const allLeads = results.flatMap((r) => r.leads);
    try {
      const outcome = await batchInsertLeads(allLeads, {
        location: QUERIES.map((q) => q.location).join(", "),
      });
      assert(
        outcome.written >= 0,
        `upsert OK · escritos=${outcome.written} / omitidos=${outcome.skipped}`
      );
    } catch (err) {
      failures++;
      console.error(`  ❌ ${(err as Error).message}`);
    }
  } else {
    console.warn("  (Supabase no configurado → se omite la inserción)");
  }
  console.log();

  finish();
}

function finish(): void {
  console.log(`\nResumen: ${passed} OK · ${failures} FALLOS`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
