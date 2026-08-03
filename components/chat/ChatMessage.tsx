"use client";

import { motion } from "framer-motion";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BotAvatar } from "./BotAvatar";
import { RichText } from "./RichText";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isBot = message.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-end gap-2 px-3 py-1",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && <BotAvatar size="sm" />}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed text-gray-900 shadow-sm",
          isBot
            ? "rounded-bl-sm bg-[#f0f0f0]"
            : "rounded-br-sm bg-[#e8f0fe]"
        )}
      >
        {isBot ? (
          <RichText text={message.content} />
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </motion.div>
  );
}
