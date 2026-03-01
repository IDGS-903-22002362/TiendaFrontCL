"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuthSessionPanel() {
  const { token, role, setSession, clearSession } = useAuth();
  const [draftToken, setDraftToken] = useState(token);
  const [draftRole, setDraftRole] = useState(role || "EMPLEADO");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesión admin (placeholder)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Usa esta sesión temporal para consumir endpoints protegidos en esta
          fase.
        </p>
        <Input
          value={draftToken}
          onChange={(event) => setDraftToken(event.target.value)}
          placeholder="Bearer token"
        />
        <Select
          value={draftRole}
          onValueChange={(value) =>
            setDraftRole(value as "ADMIN" | "EMPLEADO" | "CLIENTE")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="EMPLEADO">EMPLEADO</SelectItem>
            <SelectItem value="CLIENTE">CLIENTE</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              setSession({
                token: draftToken.trim(),
                role: draftRole as "ADMIN" | "EMPLEADO" | "CLIENTE",
              })
            }
          >
            Guardar sesión
          </Button>
          <Button variant="outline" onClick={clearSession}>
            Limpiar sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
