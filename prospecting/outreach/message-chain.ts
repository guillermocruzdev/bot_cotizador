// WhatsApp sales message generator (LangChain chain)
// DeepSeek + FewShotPromptTemplate + StructuredOutputParser (JSON).
import { ChatOpenAI } from "@langchain/openai";
import { FewShotPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

export const MAX_CHARS = 300;

// --- 3. validateLength(msg): boolean ---
export function validateLength(msg: string): boolean {
  return typeof msg === "string" && msg.length > 0 && msg.length <= MAX_CHARS;
}

// --- 2. 5 category templates (benefit + example) ---
export interface CategoryTemplate {
  benefit: string;
  example: string;
}

export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  restaurant: {
    benefit: "clientes buscan menú online y no lo encuentran",
    example:
      "Hola {name}, vi {business} en Google. Clientes buscan menú online y no lo encuentran. Web con pedidos desde $XXX. ¿Charlamos 5 min? -[COMPANY]",
  },
  dentist: {
    benefit: "pacientes buscan 'dentista cerca' y la consulta no aparece",
    example:
      "Hola Dr./Dra. {name}, pacientes buscan 'dentista cerca' y su consulta no aparece. Creamos webs que generan citas automáticamente. ¿Ejemplos? -[COMPANY]",
  },
  retail: {
    benefit: "no aparece en búsquedas locales sin web",
    example:
      "Hola {name}, {business} no aparece en búsquedas locales sin web. Un sitio profesional aumenta visitas 3x. Presupuesto sin compromiso. -[COMPANY]",
  },
  gym: {
    benefit: "personas buscan 'gimnasio cerca' y no encuentran horarios ni clases en línea",
    example:
      "Hola {name}, la gente busca 'gimnasio cerca' y no encuentra horarios ni clases de {business}. Una web con membresías y horarios llena tus clases. ¿Te llamo? -[COMPANY]",
  },
  lawyer: {
    benefit: "clientes buscan abogado para consultas urgentes y tu despacho no aparece",
    example:
      "Hola Lic. {name}, clientes buscan abogado y tu despacho no aparece. Una web con WhatsApp directo capta consultas urgentes 24/7. ¿Un presupuesto? -[COMPANY]",
  },
};

// Static few-shot examples (3 only, tal como se especificó).
const FEW_SHOT_EXAMPLES = [
  { template: CATEGORY_TEMPLATES.restaurant.example },
  { template: CATEGORY_TEMPLATES.dentist.example },
  { template: CATEGORY_TEMPLATES.retail.example },
];

// --- Chain config ---
const PREFIX =
  "Write a WhatsApp sales message for a local business that has NO website. " +
  "Goal: convince the owner to buy web development services. " +
  "Mention a benefit specific to their category. " +
  "Sign as [COMPANY]. Max 300 chars. No emojis. No explanations.";

const SUFFIX =
  "Business: {business} ({category}, {location}).\n" +
  "Owner name: {name}.\n" +
  "Category benefit to highlight: {benefit}.\n" +
  "Replace [COMPANY] with {company}.\n" +
  "{format_instructions}";

const EXAMPLE_PROMPT = new PromptTemplate({
  template: "{template}",
  inputVariables: ["template"],
});

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    message: z.string(),
    char_count: z.number(),
  })
);

const fewShotPrompt = new FewShotPromptTemplate({
  examples: FEW_SHOT_EXAMPLES,
  examplePrompt: EXAMPLE_PROMPT,
  prefix: PREFIX,
  suffix: SUFFIX,
  exampleSeparator: "\n\n",
  inputVariables: [
    "business",
    "category",
    "location",
    "name",
    "company",
    "benefit",
    "format_instructions",
  ],
});

// DeepSeek model: temperature 0.7, max_tokens 150.
// Se construye bajo demanda para leer env vars en tiempo de llamada.
function buildModel(): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "missing",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    },
    temperature: 0.7,
    maxTokens: 150,
  });
}

let chainInstance: ReturnType<typeof buildChain> | undefined;

export function getMessageChain(): ReturnType<typeof buildChain> {
  if (!chainInstance) chainInstance = buildChain();
  return chainInstance;
}

function buildChain() {
  return fewShotPrompt.pipe(buildModel()).pipe(parser);
}

export interface MessageChainInput {
  name: string;
  business: string;
  category: string;
  location: string;
  company: string;
  benefit?: string;
}

export interface GeneratedMessage {
  message: string;
  char_count: number;
  valid: boolean;
}

export async function generateMessage(
  input: MessageChainInput
): Promise<GeneratedMessage> {
  const benefit =
    input.benefit ??
    CATEGORY_TEMPLATES[input.category]?.benefit ??
    "mayor visibilidad local";

  if (!process.env.DEEPSEEK_API_KEY) {
    return fallbackMessage(input, benefit);
  }

  try {
    const result = await getMessageChain().invoke({
      business: input.business,
      category: input.category,
      location: input.location,
      name: input.name,
      company: input.company,
      benefit,
      format_instructions: parser.getFormatInstructions(),
    });
    const message = fitToLength(String(result.message ?? "").trim());
    return { message, char_count: message.length, valid: validateLength(message) };
  } catch (err) {
    console.warn(`[message-chain] chain falló → template: ${(err as Error).message}`);
    return fallbackMessage(input, benefit);
  }
}

function fallbackMessage(input: MessageChainInput, benefit: string): GeneratedMessage {
  const template =
    CATEGORY_TEMPLATES[input.category]?.example ?? CATEGORY_TEMPLATES.retail.example;
  const message = fitToLength(
    template
      .replaceAll("{name}", input.name)
      .replaceAll("{business}", input.business)
      .replace("[COMPANY]", input.company)
      .replaceAll("$XXX", "desde $500")
  );
  return { message, char_count: message.length, valid: validateLength(message) };
}

// Trunca a <= 300 chars en un límite de palabra.
function fitToLength(msg: string): string {
  if (validateLength(msg)) return msg;
  let cut = msg.slice(0, MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > MAX_CHARS * 0.7) cut = cut.slice(0, lastSpace);
  return cut.trimEnd();
}
