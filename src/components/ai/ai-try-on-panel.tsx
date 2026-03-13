/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Loader2, Paperclip, Sparkles, UploadCloud } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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

async function readImageDimensions(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new window.Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("No se pudo leer la imagen"));
        image.src = imageUrl;
      },
    );

    return dimensions;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

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
  variant = "default",
}: AiTryOnPanelProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [latestJob, setLatestJob] = useState<TryOnJob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
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
        .slice(0, 6);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ??
    defaultProduct ??
    null;

  async function handleRunTryOn() {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Imagen requerida",
        description: "Selecciona una imagen para iniciar el try-on.",
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto antes de continuar.",
      });
      return;
    }

    if (!consentAccepted) {
      toast({
        variant: "destructive",
        title: "Consentimiento requerido",
        description: "Debes aceptar el consentimiento para usar virtual try-on.",
      });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      toast({
        variant: "destructive",
        title: "Formato no permitido",
        description: "Usa archivos JPG, PNG o WEBP.",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo demasiado grande",
        description: "El archivo no puede superar 10 MB.",
      });
      return;
    }

    try {
      const dimensions = await readImageDimensions(selectedFile);
      if (dimensions.width < 512 || dimensions.height < 512) {
        toast({
          variant: "destructive",
          title: "Imagen demasiado pequeña",
          description: "La imagen debe medir al menos 512x512 px.",
        });
        return;
      }
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudo validar la imagen",
        description: getApiErrorMessage(caughtError),
      });
      return;
    }

    const activeSessionId = sessionId || (await ensureSession());
    if (!activeSessionId) {
      toast({
        variant: "destructive",
        title: "Sesión no disponible",
        description: "No se pudo crear una sesión AI.",
      });
      return;
    }

    setIsRunning(true);
    setDownloadUrl("");

    const userMessageId = `tryon_user_${Date.now()}`;
    setThreadMessages((currentMessages) => [
      ...currentMessages,
      buildLocalMessage({
        id: userMessageId,
        sessionId: activeSessionId,
        role: "user",
        content: `Quiero probar ${selectedProduct.name} con esta foto.`,
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

      setLatestJob(createdJob);
      await onJobCreated?.(createdJob);

      const completedJob = await pollTryOnUntilFinished(createdJob.id);
      setLatestJob(completedJob);
      await onJobCompleted?.(completedJob);

      if (completedJob.status === "completed") {
        let nextImageUrl = completedJob.outputImageUrl ?? "";
        let nextDownloadUrl = "";

        if (!nextImageUrl) {
          const link = await getTryOnDownloadLink(completedJob.id);
          nextImageUrl = link.url;
          nextDownloadUrl = link.url;
        } else {
          const link = await getTryOnDownloadLink(completedJob.id).catch(() => null);
          nextDownloadUrl = link?.url ?? nextImageUrl;
        }

        setDownloadUrl(nextDownloadUrl || nextImageUrl);
        setThreadMessages((currentMessages) => [
          ...currentMessages,
          buildLocalMessage({
            id: `tryon_result_${completedJob.id}`,
            sessionId: activeSessionId,
            role: "assistant",
            content: `Aquí tienes el try-on de ${selectedProduct.name}.`,
            imageUrl: nextImageUrl,
          }),
        ]);
        await onResultReady?.({ imageUrl: nextImageUrl, job: completedJob });

        toast({
          title: "Try-on listo",
          description: "La imagen ya está disponible en el chat.",
        });
      } else {
        throw new Error(
          completedJob.errorMessage || "El try-on no pudo completarse",
        );
      }
    } catch (caughtError) {
      const message = getApiErrorMessage(caughtError);
      setThreadMessages((currentMessages) => [
        ...currentMessages,
        buildLocalMessage({
          id: `tryon_error_${Date.now()}`,
          sessionId: activeSessionId,
          role: "assistant",
          content: `No pude generar la imagen en este momento. ${message}`,
        }),
      ]);
      toast({
        variant: "destructive",
        title: "No se pudo completar el try-on",
        description: message,
      });
    } finally {
      setIsRunning(false);
    }
  }

  const isPremium = variant === "product-premium";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col",
        isPremium ? "bg-white" : "rounded-3xl border border-border bg-card",
      )}
    >
      <div className="border-b border-[#E6ECE6] bg-[#FBFCFB] px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#1C241F]">
            <Sparkles className="h-4 w-4 text-[#0B7A43]" />
            <h3 className="text-lg font-semibold">Virtual Try-On</h3>
          </div>
          <p className="text-sm leading-6 text-[#5F6B63]">
            Sube tu foto, genera el resultado y revisa ambas imágenes dentro del hilo.
          </p>
        </div>

        {selectedProduct ? (
          <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-[#E6ECE6] bg-white p-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#E6ECE6] bg-[#F6F8F6]">
              <Image
                src={selectedProduct.images[0]}
                alt={selectedProduct.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1C241F]">
                {selectedProduct.name}
              </p>
              <p className="text-xs text-[#5F6B63]">{selectedProduct.category}</p>
            </div>
          </div>
        ) : null}

        {allowProductSelection ? (
          <div className="mt-4 space-y-3">
            <Label htmlFor="ai-product-search" className="text-[#1C241F]">
              Producto
            </Label>
            <Input
              id="ai-product-search"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Buscar producto por nombre..."
              className="h-11 rounded-2xl border-[#E6ECE6] bg-white px-4 text-[#1C241F] placeholder:text-[#7B857E] focus-visible:ring-[#0B7A43]"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    product.id === selectedProductId
                      ? "border-[#BFD2C4] bg-[#F6F8F6]"
                      : "border-[#E6ECE6] bg-white hover:border-[#CAD5CB] hover:bg-[#FBFCFB]",
                  )}
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <p className="font-medium text-[#1C241F]">{product.name}</p>
                  <p className="text-xs text-[#5F6B63]">{product.category}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <AiMessageThread
        messages={threadMessages}
        isLoading={false}
        streamStatus={isRunning ? "Generando imagen..." : ""}
        emptyTitle="Carga una imagen para comenzar"
        emptyDescription="El try-on se mostrará como una conversación visual: tu foto entra al hilo y la imagen generada responde en el mismo chat."
        className="h-full min-h-0 flex-1 px-4 py-4 sm:px-5"
        variant="product-premium"
      />

      <div className="border-t border-[#E6ECE6] bg-[#FBFCFB] px-4 py-4 sm:px-5">
        <div className="space-y-3 rounded-[24px] border border-[#E6ECE6] bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <label
                htmlFor="ai-tryon-file"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-[#E6ECE6] bg-[#F6F8F6] px-4 text-sm font-medium text-[#1C241F] transition hover:bg-[#EEF3EE]"
              >
                <UploadCloud className="mr-2 h-4 w-4 text-[#0B7A43]" />
                Seleccionar imagen
              </label>
              <Input
                id="ai-tryon-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                }}
                disabled={isRunning}
                className="sr-only"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1C241F]">
                  {selectedFile ? selectedFile.name : "Ningún archivo seleccionado"}
                </p>
                <p className="text-xs text-[#5F6B63]">
                  JPG, PNG o WEBP. Mínimo 512x512 px, máximo 10 MB.
                </p>
              </div>
            </div>

            {downloadUrl ? (
              <Button
                asChild
                variant="ghost"
                className="h-10 rounded-2xl text-[#5F6B63] hover:bg-[#F6F8F6] hover:text-[#1C241F]"
              >
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
              </Button>
            ) : null}
          </div>

          <label className="flex items-start gap-3 rounded-[20px] border border-[#E6ECE6] bg-[#FBFCFB] p-3 text-sm text-[#5F6B63]">
            <Checkbox
              checked={consentAccepted}
              onCheckedChange={(checked) => setConsentAccepted(checked === true)}
              disabled={isRunning}
              className="mt-0.5 border-[#9DB6A4] data-[state=checked]:border-[#0B7A43] data-[state=checked]:bg-[#0B7A43]"
            />
            <span className="leading-6">
              Confirmo que tengo permiso para usar esta imagen y acepto generar
              una vista previa temporal mediante el servicio AI.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#5F6B63]">
              <Paperclip className="h-3.5 w-3.5" />
              {latestJob?.status === "completed"
                ? "Último try-on completado"
                : isRunning
                  ? "Generando respuesta visual"
                  : "Listo para generar"}
            </div>
            <Button
              className="h-11 rounded-2xl bg-[#0B7A43] px-5 text-white hover:bg-[#096738]"
              disabled={isRunning}
              onClick={() => void handleRunTryOn()}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                "Generar try-on"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
