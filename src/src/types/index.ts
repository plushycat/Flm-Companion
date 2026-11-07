// Centralized types for FLM Companion application

export type Theme = "dark" | "light" | "system";

export type ServerStatus = "stopped" | "running" | "starting";

export type PerformanceMode = "powersaver" | "balanced" | "performance" | "turbo";
export type ResponsePreset = "precise" | "balanced" | "creative" | "caveman";

export const RESPONSE_PRESETS = {
    precise: { temperature: 0.2, topP: 0.8 },
    balanced: { temperature: 0.7, topP: 0.9 },
    creative: { temperature: 1.0, topP: 0.95 },
    caveman: {
        temperature: 1.0,
        topP: 1.0,
        systemPrompt: "Speak like caveman. Ultra-short. Omit filler words. Maximum information density with minimal tokens.",
    },
} as const;

export interface ServerOptions {
    pmode?: PerformanceMode;
    ctxLen?: number;
    backend?: string;
    decision?: string;
    prefillChunkLen?: number;
    prefixCacheMb?: number;
    prefixSlots?: number;
    prefixMinGain?: number;
    imgPreResize?: number;
    port?: number;
    host?: string;
    asr?: boolean;
    embed?: boolean;
    caveman?: boolean;
    responsePreset?: ResponsePreset;
    socket?: number;
    qLen?: number;
    cors?: boolean;
    preemption?: boolean;
}

export interface FlmModel {
    name: string;
    size: string;
    modified: string;
    // Extended metadata
    realSize?: number;
    description?: string;
    family?: string;
    isThink?: boolean;
    isVlm?: boolean;
    isEmbed?: boolean;
    isAudio?: boolean;
    contextLength?: number;
    maxContextLength?: number;
    maxPrefillLength?: number;
    quantization?: string;
    url?: string;
    parameterSize?: string;
}

export interface HardwareInfo {
    cpu: string;
    ram: string;
    ramTotalBytes: number;
    npuDriver: string;
    npuName: string;
    sharedMemory: string;
    sharedMemoryBytes: number;
}

export interface AppConfig {
    theme: Theme;
    startMinimized: boolean;
    flmPath: string;
    lastSelectedModel: string;
    serverOptions: ServerOptions;
    chatResponsePreset: ResponsePreset;
    presetsConfig?: PresetsConfig;
}

export interface FlmStatus {
    version: string;
    isInstalled: boolean;
}

// ============================================
// Server Presets
// ============================================

export interface ServerPreset {
    id: string;                    // Unique identifier, e.g., "preset:audio-only"
    nameKey?: string;              // i18n key for system presets (e.g., "presets.audio_only")
    name?: string;                 // Custom name for user presets
    model: string;                 // Model to use ("" for no model)
    options: Partial<ServerOptions>; // Options to apply when preset is selected
}

export interface PresetsConfig {
    system: ServerPreset[];
    user: ServerPreset[];
}

// ============================================
// Default constants
// ============================================

export const DEFAULT_SERVER_PORT = 52625;

export const DEFAULT_SERVER_OPTIONS: ServerOptions = {
    pmode: "performance",
    port: DEFAULT_SERVER_PORT,
    host: "127.0.0.1",
    ctxLen: 0,
    backend: "",
    decision: "",
    prefillChunkLen: 0,
    prefixCacheMb: 4096,
    prefixSlots: 8,
    prefixMinGain: 128,
    imgPreResize: 2,
    asr: false,
    embed: false,
    caveman: false,
    responsePreset: "balanced",
    socket: 10,
    qLen: 10,
    cors: true,
    preemption: false,
};

export const DEFAULT_SYSTEM_PRESETS: ServerPreset[] = [
    {
        id: "preset:audio-only",
        nameKey: "presets.audio_only",
        model: "",
        options: { asr: true, ctxLen: 0 },
    },
];

export const DEFAULT_PRESETS_CONFIG: PresetsConfig = {
    system: DEFAULT_SYSTEM_PRESETS,
    user: [],
};

export const DEFAULT_APP_CONFIG: AppConfig = {
    theme: "dark",
    startMinimized: false,
    flmPath: "flm",
    lastSelectedModel: "",
    serverOptions: DEFAULT_SERVER_OPTIONS,
    chatResponsePreset: "balanced",
    presetsConfig: DEFAULT_PRESETS_CONFIG,
};

export const CONFIG_FILENAME = "config.json";

export const MODEL_LIST_FILENAME = "model_list.json";
