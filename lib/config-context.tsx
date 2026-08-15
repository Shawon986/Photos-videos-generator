"use client";

import * as React from "react";

export interface AppConfig {
  app: { name: string; demoMode: boolean };
  ai: {
    demoMode: boolean;
    image: { realProvider: boolean; demoFallback: boolean; mode: string };
    video: { realProvider: boolean; demoFallback: boolean; mode: string };
  };
  limits: {
    imagesPerHour: number;
    videosPerHour: number;
    maxUploadBytes: number;
  };
  options: {
    imageModels: Array<{ id: string; label: string }>;
    videoModels: Array<{ id: string; label: string }>;
    imageToVideoModels: Array<{ id: string; label: string }>;
    videoDurations: number[];
    videoResolutions: Array<{ id: string; label: string }>;
    imageAspectRatios: Array<{ id: string; label: string; width: number; height: number }>;
    videoAspectRatios: Array<{ id: string; label: string; width: number; height: number }>;
  };
}

const FALLBACK_CONFIG: AppConfig = {
  app: { name: "VisionForge AI", demoMode: true },
  ai: {
    demoMode: true,
    image: { realProvider: false, demoFallback: true, mode: "demo" },
    video: { realProvider: false, demoFallback: true, mode: "demo" },
  },
  limits: { imagesPerHour: 10, videosPerHour: 3, maxUploadBytes: 20 * 1024 * 1024 },
  options: {
    imageModels: [{ id: "auto", label: "Auto (provider default)" }],
    videoModels: [{ id: "auto", label: "Auto (provider default)" }],
    imageToVideoModels: [{ id: "auto", label: "Auto (provider default)" }],
    videoDurations: [3, 5, 10],
    videoResolutions: [{ id: "512p", label: "512p" }],
    imageAspectRatios: [{ id: "1:1", label: "1:1", width: 1024, height: 1024 }],
    videoAspectRatios: [{ id: "16:9", label: "16:9", width: 1280, height: 720 }],
  },
};

const AppConfigContext = React.createContext<AppConfig>(FALLBACK_CONFIG);

export function useAppConfig(): AppConfig {
  return React.useContext(AppConfigContext);
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<AppConfig>(FALLBACK_CONFIG);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !cancelled) setConfig({ ...FALLBACK_CONFIG, ...data });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}
