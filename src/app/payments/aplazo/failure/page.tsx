import { Suspense } from "react";
import { AplazoReturnClient } from "@/components/payments/aplazo-return-client";

export default function AplazoFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
          Validando retorno de fallo...
        </div>
      }
    >
      <AplazoReturnClient returnKind="failure" />
    </Suspense>
  );
}
