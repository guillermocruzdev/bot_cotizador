"use client";

import { Lightbulb } from "lucide-react";
import { MessageAnimator } from "@/components/chat/MessageAnimator";

export function WhyThisPrice({
  explanation,
  delay = 0,
}: {
  explanation: string;
  delay?: number;
}) {
  return (
    <MessageAnimator delay={delay}>
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-[15px] leading-relaxed text-amber-900">
          {explanation}
        </p>
      </div>
    </MessageAnimator>
  );
}
