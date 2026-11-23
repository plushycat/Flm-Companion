import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConfigService } from "../services/config";
import { FlmService } from "../services/flm";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Theme, AppConfig, ServerOptions, ResponsePreset, ReasoningEffort } from "../types";
import { DEFAULT_APP_CONFIG } from "../types";

interface UseConfigManagerReturn {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    startMinimized: boolean;
    setStartMinimized: (value: boolean) => void;
    autoModelAlias: boolean;
    setAutoModelAlias: (value: boolean) => void;
    flmPath: string;
    setFlmPath: (path: string) => void;
    isConfigLoaded: boolean;
    chatResponsePreset: ResponsePreset;
    setChatResponsePreset: (preset: ResponsePreset) => void;
    reasoningEffort: ReasoningEffort;
    setReasoningEffort: (effort: ReasoningEffort) => void;
    saveExternalConfig: (selectedModel: string, serverOptions: ServerOptions) => void;
}

export function useConfigManager(): UseConfigManagerReturn {
    const [theme, setTheme] = useState<Theme>(DEFAULT_APP_CONFIG.theme);
    const [startMinimized, setStartMinimized] = useState<boolean>(DEFAULT_APP_CONFIG.startMinimized);
    const [autoModelAlias, setAutoModelAlias] = useState<boolean>(DEFAULT_APP_CONFIG.autoModelAlias ?? false);
    const [flmPath, setFlmPath] = useState<string>(DEFAULT_APP_CONFIG.flmPath);
    const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);
    const [chatResponsePreset, setChatResponsePreset] = useState<ResponsePreset>(DEFAULT_APP_CONFIG.chatResponsePreset);
    const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(DEFAULT_APP_CONFIG.reasoningEffort);

    const [externalSelectedModel, setExternalSelectedModel] = useState<string>("");
    const [externalServerOptions, setExternalServerOptions] = useState<ServerOptions>({});

    // Load config on startup
    useEffect(() => {
        ConfigService.loadConfig().then(async (config) => {
            setTheme(config.theme);
            setStartMinimized(config.startMinimized);
            setAutoModelAlias(config.autoModelAlias ?? false);

            if (!config.startMinimized) {
                const win = getCurrentWindow();
                await win.unminimize();
                await win.show();
                await win.setFocus();
            }

            let path = config.flmPath;
            if (path === "flm" || path === "" || path === null) {
                const resolvedPath = await FlmService.findFlmPath();
                if (resolvedPath) {
                    console.log("Resolved FLM path from system:", resolvedPath);
                    path = resolvedPath;
                }
            }

            setFlmPath(path);
            setExternalSelectedModel(config.lastSelectedModel || "");
            setExternalServerOptions(config.serverOptions || {});
            setChatResponsePreset(config.chatResponsePreset || DEFAULT_APP_CONFIG.chatResponsePreset);
            setReasoningEffort(config.reasoningEffort || DEFAULT_APP_CONFIG.reasoningEffort);
            setIsConfigLoaded(true);
        });
    }, []);

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    // Sync static API model alias toggle to backend proxy
    useEffect(() => {
        if (!isConfigLoaded) return;
        invoke("set_auto_model_alias", { enabled: autoModelAlias }).catch(console.error);
    }, [autoModelAlias, isConfigLoaded]);

    // Save config when settings change
    useEffect(() => {
        if (!isConfigLoaded) return;

        const saveSettings = async () => {
            // Load current config to preserve presetsConfig
            const currentConfig = await ConfigService.loadConfig();
            
            const config: AppConfig = {
                theme,
                startMinimized,
                autoModelAlias,
                flmPath,
                lastSelectedModel: externalSelectedModel,
                serverOptions: externalServerOptions,
                chatResponsePreset,
                reasoningEffort,
                presetsConfig: currentConfig.presetsConfig, // Preserve presets
            };
            await ConfigService.saveConfig(config);
        };

        const timeoutId = setTimeout(saveSettings, 500);
        return () => clearTimeout(timeoutId);
    }, [theme, startMinimized, autoModelAlias, flmPath, externalSelectedModel, externalServerOptions, chatResponsePreset, reasoningEffort, isConfigLoaded]);

    const saveExternalConfig = useCallback((selectedModel: string, serverOptions: ServerOptions) => {
        setExternalSelectedModel(selectedModel);
        setExternalServerOptions(serverOptions);
    }, []);

    return {
        theme,
        setTheme,
        startMinimized,
        setStartMinimized,
        autoModelAlias,
        setAutoModelAlias,
        flmPath,
        setFlmPath,
        isConfigLoaded,
        chatResponsePreset,
        setChatResponsePreset,
        reasoningEffort,
        setReasoningEffort,
        saveExternalConfig,
    };
}
