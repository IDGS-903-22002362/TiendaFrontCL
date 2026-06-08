// hooks/use-from-mobile-app.ts
"use client";

import { useEffect, useState } from "react";

export function useIsFromMobileApp() {
    const [isFromMobileApp, setIsFromMobileApp] = useState(false);

    useEffect(() => {
        // Verificar si ya tenemos el flag guardado en sessionStorage
        const stored = sessionStorage.getItem('from_mobile_app');

        if (stored === 'true') {
            setIsFromMobileApp(true);
            return;
        }

        // Si no, verificar en la URL solo en cliente.
        const fromParam = new URLSearchParams(window.location.search).get('from');
        if (fromParam === 'mobile-app') {
            sessionStorage.setItem('from_mobile_app', 'true');
            setIsFromMobileApp(true);
        }
    }, []);

    // Función para limpiar el flag (útil para logout)
    const clearMobileAppFlag = () => {
        sessionStorage.removeItem('from_mobile_app');
        setIsFromMobileApp(false);
    };

    return { isFromMobileApp, clearMobileAppFlag };
}