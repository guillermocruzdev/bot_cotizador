"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Escribe tu mensaje...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-white/80 px-3 py-3 backdrop-blur sm:px-4"
    >
      <motion.div
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2"
      >
        <div className="flex h-12 flex-1 items-center rounded-full border border-gray-200 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Escribe tu mensaje"
            className="h-full w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={disabled}
          className="h-12 w-12 shrink-0 rounded-full"
          aria-label="Enviar mensaje"
        >
          <SendHorizonal className="h-5 w-5" />
        </Button>
      </motion.div>
    </form>
  );
}
