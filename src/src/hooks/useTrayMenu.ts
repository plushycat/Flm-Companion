import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { ServerStatus, ServerOptions, FlmModel, PresetsConfig } from "../types";
import { getPresetDisplayName } from "../lib/presets";

interface TrayPreset {
    id: string;
    name: string;
    isSystem: boolean;
}

interface UseTrayMenuProps {
    serverStatus: ServerStatus;
    selectedModel: string;
    runnableModels: FlmModel[];
    serverOptions: ServerOptions;
    flmVersion: string;
    isFlmAvailable: boolean;
    presetsConfig: PresetsConfig;
}

export function useTrayMenu({
    serverStatus,
    selectedModel,
    runnableModels,
    serverOptions,
    flmVersion,
    isFlmAvailable,
    presetsConfig,
}: UseTrayMenuProps): void {
    const { t } = useTranslation();

    useEffect(() => {
        // Build presets list with translated names
        const systemPresets: TrayPreset[] = presetsConfig.system.map(preset => ({
            id: preset.id,
            name: getPresetDisplayName(preset, t),
            isSystem: true,
        }));
        
        const userPresets: TrayPreset[] = presetsConfig.user.map(preset => ({
            id: preset.id,
            name: getPresetDisplayName(preset, t),
            isSystem: false,
        }));
        
        const presets: TrayPreset[] = [...systemPresets, ...userPresets];

        invoke("update_tray_menu", {
            params: {
                isRunning: serverStatus === "running",
                selectedModel: selectedModel,
                presets: presets,
                startableModels: runnableModels.map((m) => m.name),
                asrEnabled: serverOptions.asr,
                embedEnabled: serverOptions.embed,
                flmVersion: flmVersion,
                isFlmAvailable: isFlmAvailable,
                texts: {
                    start: t("tray.start"),
                    stop: t("tray.stop"),
                    quit: t("tray.quit"),
                    settings: t("tray.settings"),
                    running: t("tray.server_running"),
                    stopped: t("tray.server_stopped"),
                    viewLogs: t("tray.view_logs"),
                    features: t("tray.features"),
                    asr: t("tray.asr"),
                    embed: t("tray.embed"),
                    presetsGroup: t("tray.presets_group"),
                    modelsGroup: t("tray.models_group"),
                    noModelsAvailable: t("tray.no_models_available"),
                },
            },
        });
    }, [serverStatus, selectedModel, runnableModels, serverOptions, flmVersion, isFlmAvailable, presetsConfig, t]);
}
