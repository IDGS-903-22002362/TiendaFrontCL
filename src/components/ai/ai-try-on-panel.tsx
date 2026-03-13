"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Loader2, Sparkles } from "lucide-react";
import {
  createTryOnJob,
  getTryOnDownloadLink,
  pollTryOnUntilFinished,
  uploadAiUserImage,
} from "@/lib/api/ai";
import type { TryOnJob } from "@/lib/ai/types";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AiTryOnPanelProps = {
  sessionId?: string;
  ensureSession: () => Promise<string | null>;
  defaultProduct?: Product;
  products?: Product[];
  allowProductSelection?: boolean;
  onJobCreated?: (job: TryOnJob) => void | Promise<void>;
  onJobCompleted?: (job: TryOnJob) => void | Promise<void>;
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

export function AiTryOnPanel({
  sessionId,
  ensureSession,
  defaultProduct,
  products = [],
  allowProductSelection = false,
  onJobCreated,
  onJobCompleted,
}: AiTryOnPanelProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [latestJob, setLatestJob] = useState<TryOnJob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    if (defaultProduct?.id) {
      setSelectedProductId(defaultProduct.id);
    }
  }, [defaultProduct?.id]);

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

    setIsRunning(true);
    setDownloadUrl("");

    try {
      const activeSessionId = sessionId || (await ensureSession());
      if (!activeSessionId) {
        throw new Error("No se pudo crear una sesión AI");
      }

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
        const link = await getTryOnDownloadLink(completedJob.id);
        setDownloadUrl(link.url);
        toast({
          title: "Try-on listo",
          description: "Ya puedes descargar el resultado.",
        });
      } else {
        throw new Error(
          completedJob.errorMessage || "El try-on no pudo completarse",
        );
      }
    } catch (caughtError) {
      toast({
        variant: "destructive",
        title: "No se pudo completar el try-on",
        description: getApiErrorMessage(caughtError),
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          Virtual Try-On
        </CardTitle>
        <CardDescription>
          Sube una foto y genera una vista previa del producto sobre tu imagen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowProductSelection ? (
          <div className="space-y-3">
            <Label htmlFor="ai-product-search">Producto</Label>
            <Input
              id="ai-product-search"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Buscar producto por nombre..."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    product.id === selectedProductId
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedProduct ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-background/70 p-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border">
              <Image
                src={selectedProduct.images[0]}
                alt={selectedProduct.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedProduct.category}
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="ai-tryon-file">Tu imagen</Label>
          <Input
            id="ai-tryon-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
            disabled={isRunning}
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border bg-background/70 p-3 text-sm">
          <Checkbox
            checked={consentAccepted}
            onCheckedChange={(checked) => setConsentAccepted(checked === true)}
            disabled={isRunning}
          />
          <span>
            Confirmo que tengo permiso para usar esta imagen y acepto generar
            una vista previa temporal mediante el servicio AI.
          </span>
        </label>

        <Button className="w-full" disabled={isRunning} onClick={() => void handleRunTryOn()}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando try-on...
            </>
          ) : (
            "Generar try-on"
          )}
        </Button>

        {latestJob ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm">
            <p className="font-medium">Estado actual: {latestJob.status}</p>
            {latestJob.errorMessage ? (
              <p className="mt-1 text-destructive">{latestJob.errorMessage}</p>
            ) : null}
            {downloadUrl ? (
              <Button asChild variant="outline" className="mt-3">
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar resultado
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
