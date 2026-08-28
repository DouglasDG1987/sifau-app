"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type SplashScreenProps = {
  isLoading?: boolean;
  onFadeComplete?: () => void;
  className?: string;
};

export function SplashScreen({
  isLoading = true,
  onFadeComplete,
  className = "",
}: SplashScreenProps) {
  // `isVisible` deriva de `isLoading` durante a própria renderização (sem
  // efeito). `hiddenAfterFade` vira `true` quando o fade-out termina; se
  // `isLoading` voltar a `true` (novo ciclo), resetamos no render mesmo,
  // comparando com o `isLoading` da renderização anterior — técnica descrita
  // em https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [hiddenAfterFade, setHiddenAfterFade] = useState(false);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  if (isLoading && !prevIsLoading) {
    setHiddenAfterFade(false);
  }
  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
  }
  const isVisible = isLoading || !hiddenAfterFade;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const root = document.documentElement;
      setIsDark(root.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          syncTheme();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const timeout = window.setTimeout(() => {
      setHiddenAfterFade(true);
      onFadeComplete?.();
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [isLoading, onFadeComplete]);

  if (!isVisible && !isLoading) {
    return null;
  }

  const logoSrc = isDark ? "/logo-splash-dark.png" : "/logo-splash.png";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={isLoading}
      className={[
        "fixed inset-0 z-[100] flex min-h-[100vh] min-h-[100dvh] items-center justify-center bg-background transition-all duration-400 ease-out",
        isLoading ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-[1.02]",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center">
          <Image
            src={logoSrc}
            alt="Logo SIFAU"
            width={560}
            height={560}
            priority
            className="h-auto w-auto max-w-[min(78vw,540px)]"
          />
        </div>

        <div className="flex items-center justify-center pt-1" aria-hidden="true">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>

      <span className="sr-only">Carregando SIFAU</span>
    </div>
  );
}
