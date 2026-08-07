import { createEmptyContext } from "../lib/types";
import { FLOW, DONE_NODE_ID } from "../lib/conversation-flow";

const desc = "Soy Laura, tengo una tienda de ropa en Guadalajara. No quiero vender por internet ni cobrar en línea, solo quiero una página donde la gente me encuentre en Google y me escriba por WhatsApp. Que se vea bonita, pero algo sencillo.";

const ctx = createEmptyContext();
FLOW.discovery_business.onReceive?.(desc, ctx);
let nodeId = FLOW.discovery_business.nextNode(desc, ctx);
console.log("Categoría inferida:", ctx.category, "| pagos:", ctx.pagos, "| dashboard:", ctx.dashboard, "| autenticacion:", ctx.autenticacion);

const answers = [
  "Sí, así es, exacto.",
  "Sí, una sola página: inicio, catálogo, cómo llegar y el contacto con mi WhatsApp.",
  "No, no necesitan registrarse, solo que me contacten.",
  "No, no necesito guardar datos, solo mostrar información.",
  "No, no quiero panel, con que me llegue el aviso por WhatsApp me basta.",
  "Sí, tengo local, ponme el mapa por favor.",
];

let used = 0;
const visited: string[] = [nodeId];
let guard = 0;
while (nodeId !== DONE_NODE_ID && guard < 200) {
  guard++;
  const node = FLOW[nodeId];
  if (!node) { console.log("NODO INEXISTENTE", nodeId); break; }
  if (node.type === "greeting") { nodeId = node.nextNode("", ctx); continue; }
  if (used >= answers.length) { console.log("Faltaron respuestas en nodo", nodeId); break; }
  const answer = answers[used++];
  node.onReceive?.(answer, ctx);
  nodeId = node.nextNode(answer, ctx);
  let g = 0;
  while (g < 40) {
    const target = FLOW[nodeId];
    if (!target || !target.condition || target.condition(ctx)) break;
    nodeId = target.nextNode("", ctx);
    g++;
  }
  visited.push(nodeId);
}
console.log("Nodos visitados (post-salto):", visited.join(" -> "));
console.log("Categoría final:", ctx.category, "| dashboard:", ctx.dashboard, "| autenticacion:", ctx.autenticacion, "| pagos:", ctx.pagos);
