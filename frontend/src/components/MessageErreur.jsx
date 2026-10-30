import { useEffect, useRef } from "react";

export default function MessageErreur({ children }) {
  const messageRef = useRef(null);

  useEffect(() => {
    if (!children || !messageRef.current) return;
    const reduireAnimations = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches ?? false;
    messageRef.current.scrollIntoView({
      behavior: reduireAnimations ? "auto" : "smooth",
      block: "center",
    });
    messageRef.current.focus({ preventScroll: true });
  }, [children]);

  if (!children) return null;

  return (
    <div
      className="message message-erreur"
      role="alert"
      tabIndex="-1"
      ref={messageRef}
    >
      {children}
    </div>
  );
}
