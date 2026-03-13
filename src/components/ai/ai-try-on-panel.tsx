/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Loader2, Sparkles, UploadCloud } from "lucide-react";
import {
  createTryOnJob,
  getTryOnDownloadLink,
  pollTryOnUntilFinished,
  uploadAiUserImage,
} from "@/lib/api/ai";
import type { AiMessage, TryOnJob } from "@/lib/ai/types";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { AiMessageThread } from "@/components/ai/ai-message-thread";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AiTryOnPanelProps = {
  sessionId?: string;
  ensureSession: () => Promise<string | null>;
  defaultProduct?: Product;
  products?: Product[];
  allowProductSelection?: boolean;
  onJobCreated?: (job: TryOnJob) => void | Promise<void>;
  onJobCompleted?: (job: TryOnJob) => void | Promise<void>;
  onResultReady?: (payload: {
    imageUrl: string;
    job: TryOnJob;
  }) => void | Promise<void>;
  variant?: "default" | "product-premium";
};

function buildLocalMessage(input: {
  id: string;
  sessionId: string;
  role: AiMessage["role"];
  content: string;
  imageUrl?: string;
}) {
  const message: AiMessage = {
    id: input.id,
    sessionId: input.sessionId,
    userId: "local",
    role: input.role,
    content: input.content,
    createdAt: new Date().toISOString(),
  };

  if (input.imageUrl) {
    message.attachments = [
      {
        assetId: `${input.id}_image`,
        url: input.imageUrl,
        mimeType: "image/png",
        kind: input.role === "user" ? "user_upload" : "output_image",
      },
    ];
  }

  return message;
}

export function AiTryOnPanel({
  sessionId,
  ensureSession,
  defaultProduct,
  products = [],
  allowProductSelection = false,
  onJobCreated,
  onJobCompleted,
  onResultReady,
}: AiTryOnPanelProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [threadMessages, setThreadMessages] = useState<AiMessage[]>([]);

  useEffect(() => {
    if (defaultProduct?.id) {
      setSelectedProductId(defaultProduct.id);
    }
  }, [defaultProduct?.id]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const visibleProducts = !allowProductSelection
    ? []
    : products
        .filter((product) =>
          `${product.name} ${product.category}`
            .toLowerCase()
            .includes(productQuery.toLowerCase().trim()),
        )
        .slice(0, 4);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ??
    defaultProduct ??
    null;

  async function handleRunTryOn() {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Imagen requerida",
        description: "Selecciona una imagen.",
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto.",
      });
      return;
    }

    if (!consentAccepted) {
      toast({
        variant: "destructive",
        title: "Consentimiento",
        description: "Acepta los términos.",
      });
      return;
    }

    const activeSessionId = sessionId || (await ensureSession());
    if (!activeSessionId) {
      toast({ variant: "destructive", title: "Error", description: "No hay sesión activa." });
      return;
    }

    setIsRunning(true);

    const userMessageId = `tryon_user_${Date.now()}`;
    setThreadMessages((currentMessages) => [
      ...currentMessages,
      buildLocalMessage({
        id: userMessageId,
        sessionId: activeSessionId,
        role: "user",
        content: `Probando ${selectedProduct.name}`,
        imageUrl: selectedFilePreview,
      }),
    ]);

    try {
      const asset = await uploadAiUserImage(selectedFile, activeSessionId);
      const createdJob = await createTryOnJob({
        sessionId: activeSessionId,
        productId: selectedProduct.id,
        userImageAssetId: asset.id,
        consentAccepted: true,
        ...(selectedProduct.clave ? { sku: selectedProduct.clave } : {}),
      });

      await onJobCreated?.(createdJob);

      const completedJob = await pollTryOnUntilFinished(createdJob.id);
      await onJobCompleted?.(completedJob);

      if (completedJob.status === "completed") {
        const link = await getTryOnDownloadLink(completedJob.id).catch(() => null);
        const url = link?.url || completedJob.outputImageUrl || "";
        
        setThreadMessages((currentMessages) => [
          ...currentMessages,
          buildLocalMessage({
            id: `tryon_result_${completedJob.id}`,
            sessionId: activeSessionId,
            role: "assistant",
            content: `¡Listo! Aquí tienes tu vista previa.`,
            imageUrl: url,
          }),
        ]);
        await onResultReady?.({ imageUrl: url, job: completedJob });
      } else {
        throw new Error(completedJob.errorMessage || "Error al generar");
      }
    } catch (caughtError) {
      const message = getApiErrorMessage(caughtError);
      setThreadMessages((currentMessages) => [
        ...currentMessages,
        buildLocalMessage({
          id: `tryon_error_${Date.now()}`,
          sessionId: activeSessionId,
          role: "assistant",
          content: `No se pudo procesar: ${message}`,
        }),
      ]);
      toast({ variant: "destructive", title: "Fallo", description: message });
    } finally {
      setIsRunning(false);
    }
  }

  const hasThread = threadMessages.length > 0 || isRunning;

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-tight">Probador Virtual</h3>
          </div>

          {selectedProduct && !allowProductSelection && (
            <div className="flex items-center gap-3 rounded-xl border bg-background/50 p-2">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted border">
                <Image src={selectedProduct.images[0]} alt={selectedProduct.name} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold">{selectedProduct.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{selectedProduct.category}</p>
              </div>
            </div>
          )}

          {allowProductSelection && (
            <div className="space-y-2">
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="h-8 text-xs rounded-lg"
              />
              <div className="grid gap-1.5 sm:grid-cols-2">
                {visibleProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProductId(p.id)}
                    className={cn(
                      "rounded-lg border p-2 text-left text-[10px] transition",
                      p.id === selectedProductId ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30"
                    )}
                  >
                    <p className="truncate font-bold">{p.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasThread ? (
            <div className="rounded-2xl border bg-muted/5 overflow-hidden">
              <AiMessageThread
                messages={threadMessages}
                isLoading={false}
                streamStatus={isRunning ? "Generando tu estilo..." : ""}
                emptyTitle=""
                emptyDescription=""
                className="max-h-[200px]"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
                <UploadCloud className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold">Sube tu foto</p>
                <p className="text-[10px] max-w-[200px] leading-tight">
                  Procesaremos tu imagen para mostrarte cómo te queda el producto.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-muted/30 p-4 space-y-3 shadow-inner">
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="ai-tryon-file"
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center rounded-xl border border-dashed text-xs font-bold transition-all",
                selectedFile 
                  ? "border-primary/50 bg-primary/5 text-primary" 
                  : "border-border bg-background hover:border-primary/30"
              )}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {selectedFile ? "Cambiar mi foto" : "Seleccionar mi foto"}
            </label>
            <Input
              id="ai-tryon-file"
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              disabled={isRunning}
              className="sr-only"
            />
            {selectedFile && (
              <p className="text-[10px] text-center text-primary font-bold truncate px-2">
                {selectedFile.name}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border bg-background/80 p-2.5 shadow-sm">
            <Checkbox
              checked={consentAccepted}
              onCheckedChange={(checked) => setConsentAccepted(checked === true)}
              disabled={isRunning}
              className="mt-0.5"
            />
            <span className="text-[9px] leading-tight text-muted-foreground font-medium">
              Acepto procesar mi imagen con IA. Se eliminará automáticamente después de generar la vista previa.
            </span>
          </label>

          <Button
            className="h-11 w-full rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95"
            disabled={isRunning || !selectedFile || !consentAccepted}
            onClick={() => void handleRunTryOn()}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Ver cómo me queda"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
