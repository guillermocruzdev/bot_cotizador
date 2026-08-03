"use client";

import { MessageAnimator } from "@/components/chat/MessageAnimator";

export function TechStackTags({
  stack,
  delay = 0,
}: {
  stack: string[];
  delay?: number;
}) {
  return (
    <MessageAnimator delay={delay}>
      <div className="flex flex-wrap gap-2">
        {stack.map((tech, i) => (
          <span
            key={i}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-800"
          >
            {tech}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Uso tecnologías modernas y rápidas, de las que usan las empresas top.
        Esto hace que tu web cargue al instante y sea fácil de actualizar.
      </p>
    </MessageAnimator>
  );
}
