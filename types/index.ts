// Re-export central de todos los tipos de la aplicación.
export * from "@/lib/types";

// Re-exports de tipos usados por los componentes.
export type {
  ChatMessage,
  ChatRole,
  ChatContext,
  ConversationNode,
  ExpectedResponseType,
  NodeType,
  ChoiceOption,
  AnalysisResult,
  AnalyzeRequest,
  AnalyzeResponse,
  SaveRequest,
  SaveResponse,
} from "@/lib/types";
