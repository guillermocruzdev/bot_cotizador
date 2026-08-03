"use client";

import { motion } from "framer-motion";
import { BotAvatar } from "./BotAvatar";

/**
 * Indicador "Alex está escribiendo..." estilo WhatsApp/iMessage:
 * tres puntos que rebotan secuencialmente.
 */
export function TypingIndicator({ name = "Alex" }: { name?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2 px-3"
    >
      <BotAvatar size="sm" />
      <div className="flex flex-col gap-1">
        <div className="rounded-2xl rounded-bl-sm bg-[#f0f0f0] px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-gray-400 animate-typing-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
        <span className="px-1 text-[11px] text-muted-foreground">
          {name} está escribiendo...
        </span>
      </div>
    </motion.div>
  );
}
