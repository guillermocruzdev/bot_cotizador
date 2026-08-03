import type { Metadata } from "next";
import { ChatContainer } from "@/components/chat/ChatContainer";

export const metadata: Metadata = {
  title: "Chat con Alex",
  description:
    "Describe tu proyecto y recibe una propuesta personalizada con precio estimado en MXN.",
};

export default function ChatPage() {
  return <ChatContainer />;
}
