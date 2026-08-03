"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BOT } from "@/lib/personality";
import { cn } from "@/lib/utils";

export function BotAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };
  return (
    <Avatar className={cn("shrink-0", sizes[size])}>
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br font-bold text-white",
          BOT.avatarGradient
        )}
      >
        {BOT.name[0]}
      </AvatarFallback>
    </Avatar>
  );
}
