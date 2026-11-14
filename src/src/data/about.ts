import type { HardwareInfo } from '../types';

export const ABOUT_CONFIG = {
    appRepoName: import.meta.env.VITE_GIT_PROJECT_COMPANION || "plushycat/Flm-Companion",
    flmRepoName: import.meta.env.VITE_GIT_PROJECT_FLM || "ROCm/FastFlowLM",
    amdUrl: import.meta.env.VITE_AMD_URL ?? 'https://ryzenai.docs.amd.com/en/latest/inst.html#install-npu-drivers',
    companionExeName: import.meta.env.VITE_COMPANION_EXE || "flm-manager.exe",
    flmExeName: import.meta.env.VITE_FLM_EXE || "flm-setup.msi",
};

export const APP_REPO_URL = `https://github.com/${ABOUT_CONFIG.appRepoName}`;
export const FLM_REPO_URL = `https://github.com/${ABOUT_CONFIG.flmRepoName}`;

export interface HardwareRowDef {
    key: string;
    labelKey: string;
    getValue: (hardware: HardwareInfo | null) => string;
}

export const HARDWARE_SPEC_ROWS: HardwareRowDef[] = [
    { key: 'cpu', labelKey: 'about.cpu', getValue: (h) => h?.cpu || '...' },
    { key: 'ram', labelKey: 'about.ram', getValue: (h) => h?.ram || '...' },
    { key: 'sharedMemory', labelKey: 'about.npu_shared', getValue: (h) => h?.sharedMemory || '...' },
];
