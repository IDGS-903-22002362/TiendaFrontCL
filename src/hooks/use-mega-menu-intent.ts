"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MegaMenuIntentOptions = {
  openDelayMs?: number;
  closeDelayMs?: number;
  onClose?: () => void;
};

export function useMegaMenuIntent({
  openDelayMs = 280,
  closeDelayMs = 360,
  onClose,
}: MegaMenuIntentOptions = {}) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen(false);
    setActiveSectionId(null);
    onClose?.();
  }, [clearCloseTimer, clearOpenTimer, onClose]);

  const openSection = useCallback(
    (sectionId: string, immediate = false) => {
      clearCloseTimer();

      if (immediate && isOpen) {
        clearOpenTimer();
        setActiveSectionId(sectionId);
        setIsOpen(true);
        return;
      }

      clearOpenTimer();
      openTimerRef.current = setTimeout(() => {
        setActiveSectionId(sectionId);
        setIsOpen(true);
        openTimerRef.current = null;
      }, openDelayMs);
    },
    [clearCloseTimer, clearOpenTimer, isOpen, openDelayMs],
  );

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeMenu();
      closeTimerRef.current = null;
    }, closeDelayMs);
  }, [clearCloseTimer, clearOpenTimer, closeDelayMs, closeMenu]);

  const cancelClose = useCallback(() => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, [clearCloseTimer, clearOpenTimer]);

  return {
    activeSectionId,
    isOpen,
    openSection,
    scheduleClose,
    cancelClose,
    closeMenu,
    setActiveSectionId,
    setIsOpen,
  };
}
