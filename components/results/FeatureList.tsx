"use client";

import { CheckCircle2 } from "lucide-react";
import { MessageAnimator } from "@/components/chat/MessageAnimator";

export function FeatureList({
  features = [],
  delay = 0,
}: {
  features?: string[];
  delay?: number;
}) {
  return (
    <MessageAnimator delay={delay}>
      <ul className="space-y-2.5">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 text-[15px] text-gray-800"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </MessageAnimator>
  );
}
