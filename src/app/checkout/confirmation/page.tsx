import { Suspense } from "react";
import { ConfirmationClient } from "./confirmation-client";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
          Cargando confirmación...
        </div>
      }
    >
      <ConfirmationClient />
    </Suspense>
  );
}
