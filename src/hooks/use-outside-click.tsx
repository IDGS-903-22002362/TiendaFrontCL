import React, { useEffect } from "react";

type OutsideClickEvent = MouseEvent | TouchEvent;

export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement | null>,
  callback: (event: OutsideClickEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: OutsideClickEvent) => {
      const target = event.target;
      if (!ref.current || !(target instanceof Node) || ref.current.contains(target)) {
        return;
      }
      callback(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
};
