import { inferCategory } from "../lib/pricing-catalog";

const cases = [
  "Soy Laura, tengo una tienda de ropa en Guadalajara. No quiero vender por internet ni cobrar en línea, solo quiero una página donde la gente me encuentre en Google y me escriba por WhatsApp. Que se vea bonita, pero algo sencillo.",
  "Tengo una tienda de ropa, solo quiero que la gente me encuentre.",
  "Quiero vender por internet mis productos.",
  "Tengo una tienda de ropa y quiero vender por internet con carrito.",
  "Tengo una tienda de ropa. No quiero venta en línea, solo catálogo.",
  "Tengo una tienda de ropa, no quiero vender por internet.",
];
for (const c of cases) {
  console.log(JSON.stringify(c.slice(0, 60)), "→", inferCategory(c));
}
