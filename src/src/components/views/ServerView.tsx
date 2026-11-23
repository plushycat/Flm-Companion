import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Square, Activity, Save, Settings2, Bookmark, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { ResourceMonitor } from "../shared/ResourceMonitor";
import { SavePresetDialog, ManagePresetsDialog, ServerAdvancedSettingsDialog } from "../dialogs";
import { ServerMetricsGrid, ServerModelSelectorCard, ServerApiDropdown, ServerLogsSection, type ApiMetrics } from "../server";
import { isPresetId, findPresetById } from "../../lib/presets";
import { ServerPreset } from "../../types";
import { useAppContext } from "../../contexts";
import { SystemService } from "../../services/system";
import { FlmService } from "../../services/flm";

const CONTEXT_LENGTHS = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
const PREFILL_LENGTHS = [512, 1024, 2048, 4096, 8192, 16384, 32768];
const API_PROXY_PORT = 52626;

import { type FlmModel, type ServerOptions, type ServerStatus } from "../../types";
import { toast } from "sonner";

interface ServerViewProps {
    serverStatus: ServerStatus;
    onToggleServer: (options: ServerOptions) => void;
    models: FlmModel[];
    selectedModel: string;
    onSelectModel: (model: string) => void;
    logs: string[];
    onClearLogs: () => void;
    options: ServerOptions;
    setOptions: (options: ServerOptions | ((prev: ServerOptions) => ServerOptions)) => void;
}

export const ServerView = ({
    serverStatus,
    onToggleServer,
    models,
    selectedModel,
    onSelectModel,
    logs,
    onClearLogs,
    options,
    setOptions,
}: ServerViewProps) => {
    const { t } = useTranslation();
    const { presetsConfig, saveUserPreset, reloadPresets, autoModelAlias } = useAppContext();
    const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
    const [managePresetsDialogOpen, setManagePresetsDialogOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [liveRam, setLiveRam] = useState({ used: 0, total: 0, percentage: 0, flmProcess: 0 });
    const [supportedBackends, setSupportedBackends] = useState<string[]>([]);

    useEffect(() => {
        let active = true;
        FlmService.getSupportedBackends().then((backends) => {
            if (active) setSupportedBackends(backends);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (serverStatus === "running" || serverStatus === "starting") return;
        let active = true;
        const refreshRam = async () => {
            const stats = await SystemService.getSystemStats();
            if (active) setLiveRam(stats.memory);
        };
        refreshRam();
        const interval = window.setInterval(refreshRam, 2000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [serverStatus]);

    const handleSavePreset = async (name: string) => {
        try {
            // Generate a unique ID from the name
            const presetId = `preset:user-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

            const newPreset: ServerPreset = {
                id: presetId,
                name,
                model: selectedModel,
                options: { ...options },
            };

            await saveUserPreset(newPreset);

            toast.success(t('server.preset_saved') || 'Preset saved successfully!', {
                description: name,
            });
        } catch (error) {
            console.error('Failed to save preset:', error);
            toast.error(t('server.preset_save_error') || 'Failed to save preset');
        }
    };

    const handleOptionChange = (key: keyof ServerOptions, value: ServerOptions[keyof ServerOptions]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    const selectedModelName = isPresetId(selectedModel)
        ? findPresetById(selectedModel, presetsConfig)?.model
        : selectedModel;
    const selectedModelInfo = models.find(model => model.name === selectedModelName);
    const maxContextLength = selectedModelInfo?.maxContextLength ?? CONTEXT_LENGTHS[CONTEXT_LENGTHS.length - 1];
    const reportedMaxContextLength = selectedModelInfo?.maxContextLength;
    const contextChoices = CONTEXT_LENGTHS.filter(length => length <= maxContextLength);
    const defaultPrefillLength = selectedModelInfo?.maxPrefillLength || 4096;
    const prefillChoices = PREFILL_LENGTHS.filter(length => length <= defaultPrefillLength);
    const contextValue = contextChoices.includes(options.ctxLen || 0)
        ? options.ctxLen!
        : selectedModelInfo?.contextLength || contextChoices[contextChoices.length - 1];
    const modelLoadBytes = selectedModelInfo?.realSize || 0;
    const defaultContext = selectedModelInfo?.contextLength || 32768;
    const contextReserveBytes = modelLoadBytes
        ? 256 * 1024 * 1024 * Math.max(1, contextValue / defaultContext)
        : 0;
    const runtimeReserveBytes = modelLoadBytes ? 512 * 1024 * 1024 : 0;
    const estimatedRamBytes = modelLoadBytes + contextReserveBytes + runtimeReserveBytes;
    const [apiMetrics, setApiMetrics] = useState<ApiMetrics>({ requests: 0, ttftMs: null, promptTokens: null });
    const apiBaseUrl = `http://127.0.0.1:${API_PROXY_PORT}/v1`;
    const activeApiModel = isPresetId(selectedModel)
        ? findPresetById(selectedModel, presetsConfig)?.model || selectedModel
        : selectedModel;
    const apiModel = autoModelAlias ? "flm-auto" : activeApiModel;
    const backendOptions = options.backend && !supportedBackends.includes(options.backend)
        ? [options.backend, ...supportedBackends]
        : supportedBackends;

    useEffect(() => {
        let active = true;
        const refreshMetrics = async () => {
            try {
                const metrics = await invoke<ApiMetrics>("get_api_metrics");
                if (active) setApiMetrics(metrics);
            } catch {
                // Metrics unavailable while server is stopped.
            }
        };
        refreshMetrics();
        const interval = window.setInterval(refreshMetrics, 1000);
        return () => { active = false; window.clearInterval(interval); };
    }, []);

    return (
        <div className="h-full flex flex-col space-y-4 lg:space-y-5 overflow-y-auto lg:overflow-hidden">
            <div className="flex justify-between items-center px-1 shrink-0">
                <div>
                    <h1 className="text-lg font-semibold text-foreground tracking-tight">{t('server.title')}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <ServerApiDropdown
                        apiBaseUrl={apiBaseUrl}
                        apiModel={apiModel}
                        serverStatus={serverStatus}
                    />
                    {serverStatus === "stopped" && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <Bookmark size={16} />
                                    {t('server.presets')}
                                    <ChevronDown size={14} className="ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setManagePresetsDialogOpen(true)}>
                                    <Settings2 size={16} className="mr-2" />
                                    {t('server.manage_presets')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setSavePresetDialogOpen(true)}
                                    disabled={false}
                                >
                                    <Save size={16} className="mr-2" />
                                    {t('server.save_preset')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {serverStatus === "stopped" ? (
                        <Button
                            onClick={() => onToggleServer(options)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                            <Play size={16} /> {t('server.start_server')}
                        </Button>
                    ) : serverStatus === "starting" ? (
                        <Button
                            disabled
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-600 dark:bg-yellow-600 text-white flex items-center gap-2 cursor-wait"
                        >
                            <Activity size={16} className="animate-spin" /> {t('server.starting')}
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={() => onToggleServer(options)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                        >
                            <Square size={16} /> {t('server.stop_server')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 lg:flex-1 lg:min-h-0">
                {/* Configuration Panel or Resource Monitor */}
                <div className="lg:col-span-2 space-y-4 lg:space-y-6 lg:overflow-y-auto lg:pr-2">
                    <ServerMetricsGrid
                        liveRam={liveRam}
                        contextValue={contextValue}
                        reportedMaxContextLength={reportedMaxContextLength}
                        apiMetrics={apiMetrics}
                    />
                    {serverStatus === "running" || serverStatus === "starting" ? (
                        /* Show Resource Monitor when server is running or starting */
                        <ResourceMonitor refreshInterval={2000} onStats={(stats) => setLiveRam(stats.memory)} />
                    ) : (
                        /* Show Configuration when server is stopped */
                        <>
                            <ServerModelSelectorCard
                                selectedModel={selectedModel}
                                onSelectModel={onSelectModel}
                                models={models}
                                presetsConfig={presetsConfig}
                                serverStatus={serverStatus}
                                setOptions={setOptions}
                                estimatedRamBytes={estimatedRamBytes}
                                modelLoadBytes={modelLoadBytes}
                                contextReserveBytes={contextReserveBytes}
                                runtimeReserveBytes={runtimeReserveBytes}
                                flmProcessRamMb={liveRam.flmProcess}
                            />

                            <ServerAdvancedSettingsDialog
                                open={settingsOpen}
                                onOpenChange={setSettingsOpen}
                                options={options}
                                handleOptionChange={handleOptionChange}
                                serverStatus={serverStatus}
                                contextValue={contextValue}
                                contextChoices={contextChoices}
                                backendOptions={backendOptions}
                                defaultPrefillLength={defaultPrefillLength}
                                prefillChoices={prefillChoices}
                            />
                        </>
                    )}
                </div>

                <ServerLogsSection
                    logs={logs}
                    onClearLogs={onClearLogs}
                    serverStatus={serverStatus}
                />
            </div>

            <SavePresetDialog
                open={savePresetDialogOpen}
                onOpenChange={setSavePresetDialogOpen}
                selectedModel={selectedModel}
                options={options}
                onSave={handleSavePreset}
            />

            <ManagePresetsDialog
                open={managePresetsDialogOpen}
                onOpenChange={setManagePresetsDialogOpen}
                onPresetDeleted={() => reloadPresets()}
            />
        </div>
    );
};
