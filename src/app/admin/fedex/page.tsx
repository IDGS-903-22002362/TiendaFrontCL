"use client";

import { useState } from "react";
import { RefreshCw, Search, Truck } from "lucide-react";
import { fedexAdminApi } from "@/lib/api/fedex";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function JsonBlock({ value }: { value: unknown }) {
  if (!value) return null;
  return (
    <pre className="max-h-80 overflow-auto rounded-md border bg-muted/35 p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminFedExPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [trackingNumbers, setTrackingNumbers] = useState("");
  const [trackingResult, setTrackingResult] = useState<unknown>(null);
  const [pickupPayload, setPickupPayload] = useState(
    '{\n  "pickupDate": "2026-05-13",\n  "readyTime": "10:00:00",\n  "latestTime": "16:00:00",\n  "orderIds": []\n}',
  );
  const [pickupResult, setPickupResult] = useState<unknown>(null);
  const [pickupId, setPickupId] = useState("");
  const [sandboxResult, setSandboxResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAction = async (action: () => Promise<unknown>, onSuccess: (value: unknown) => void) => {
    setIsLoading(true);
    try {
      const result = await action();
      onSuccess(result);
      toast({ title: "Operacion FedEx completada" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error FedEx",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkHealth = async () => {
    await runAction(
      async () => {
        const [auth, rates, address] = await Promise.all([
          fedexAdminApi.health("auth"),
          fedexAdminApi.health("rates"),
          fedexAdminApi.health("address"),
        ]);
        return { auth, rates, address };
      },
      (value) => setHealth(value as Record<string, unknown>),
    );
  };

  const parsePickupPayload = () => JSON.parse(pickupPayload) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">FedEx</h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo operativo, tracking, pickups y pruebas sandbox.
          </p>
        </div>
        <Button onClick={() => void checkHealth()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Health FedEx
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["auth", "rates", "address"].map((key) => (
              <Badge key={key} variant={health[key] ? "secondary" : "outline"}>
                {key}
              </Badge>
            ))}
          </div>
          <JsonBlock value={health} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tracking directo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking-numbers">Guias, separadas por coma o salto</Label>
              <Textarea
                id="tracking-numbers"
                value={trackingNumbers}
                onChange={(event) => setTrackingNumbers(event.target.value)}
                placeholder="123456789012"
              />
            </div>
            <Button
              disabled={isLoading}
              onClick={() =>
                void runAction(
                  () =>
                    fedexAdminApi.track({
                      trackingNumbers: trackingNumbers
                        .split(/[\n,]/)
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .slice(0, 30),
                    }),
                  setTrackingResult,
                )
              }
            >
              <Search className="mr-2 h-4 w-4" />
              Consultar tracking
            </Button>
            <JsonBlock value={trackingResult} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickups FedEx</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-payload">Payload pickup</Label>
              <Textarea
                id="pickup-payload"
                className="min-h-44 font-mono text-xs"
                value={pickupPayload}
                onChange={(event) => setPickupPayload(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={() =>
                  void runAction(
                    () => fedexAdminApi.pickupAvailability(parsePickupPayload()),
                    setPickupResult,
                  )
                }
              >
                Ver disponibilidad
              </Button>
              <Button
                disabled={isLoading}
                onClick={() =>
                  void runAction(
                    () => fedexAdminApi.createPickup(parsePickupPayload()),
                    setPickupResult,
                  )
                }
              >
                Crear pickup
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={pickupId}
                onChange={(event) => setPickupId(event.target.value)}
                placeholder="pickupId"
              />
              <Button
                variant="destructive"
                disabled={isLoading || !pickupId.trim()}
                onClick={() =>
                  void runAction(
                    () => fedexAdminApi.cancelPickup(pickupId.trim()),
                    setPickupResult,
                  )
                }
              >
                Cancelar
              </Button>
            </div>
            <JsonBlock value={pickupResult} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox label</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isLoading}
              onClick={() =>
                void runAction(() => fedexAdminApi.createTestLabel(), setSandboxResult)
              }
            >
              Crear etiqueta sandbox
            </Button>
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() =>
                void runAction(() => fedexAdminApi.cancelTestLabel(), setSandboxResult)
              }
            >
              Cancelar etiqueta sandbox
            </Button>
          </div>
          <JsonBlock value={sandboxResult} />
        </CardContent>
      </Card>
    </div>
  );
}
