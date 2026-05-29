// hooks/use-from-mobile-app.ts
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useIsFromMobileApp() {
    const searchParams = useSearchParams();
    const [isFromMobileApp, setIsFromMobileApp] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Verificar si ya tenemos el flag guardado en sessionStorage
        const stored = sessionStorage.getItem('from_mobile_app');

        if (stored === 'true') {
            setIsFromMobileApp(true);
            setIsInitialized(true);
            return;
        }

        // Si no, verificar en la URL (solo la primera vez)
        if (!isInitialized) {
            const fromParam = searchParams.get('from');
            if (fromParam === 'mobile-app') {
                sessionStorage.setItem('from_mobile_app', 'true');
                setIsFromMobileApp(true);
            }
            setIsInitialized(true);
        }
    }, [searchParams, isInitialized]);

    // Función para limpiar el flag (útil para logout)
    const clearMobileAppFlag = () => {
        sessionStorage.removeItem('from_mobile_app');
        setIsFromMobileApp(false);
    };

    return { isFromMobileApp, clearMobileAppFlag };
}