import { ChatView } from "@/components/dashboard/ChatView";

export default function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <h1 className="text-2xl font-bold">Conversación</h1>
      <ChatView leadId={params.id} />
    </>
  );
}
