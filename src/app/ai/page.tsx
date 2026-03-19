import { Suspense } from "react";
import { AiWorkspace } from "./workspace";

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">
          Cargando módulo AI...
        </div>
      }
    >
      <AiWorkspace />
    </Suspense>
  );
}
