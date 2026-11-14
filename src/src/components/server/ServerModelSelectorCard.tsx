import { Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { InfoTooltip } from "../shared/InfoTooltip";
import { getAllPresets, isPresetId, findPresetById, getPresetDisplayName } from "../../lib/presets";
import { useTranslation } from "react-i18next";
import type { FlmModel, PresetsConfig, ServerOptions, ServerStatus } from "../../types";

interface ServerModelSelectorCardProps {
    selectedModel: string;
    onSelectModel: (model: string) => void;
    models: FlmModel[];
    presetsConfig: PresetsConfig;
    serverStatus: ServerStatus;
    setOptions: (options: ServerOptions | ((prev: ServerOptions) => ServerOptions)) => void;
    estimatedRamBytes: number;
    modelLoadBytes: number;
    contextReserveBytes: number;
    runtimeReserveBytes: number;
    flmProcessRamMb: number;
}

const formatGb = (bytes: number) => `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;

export function ServerModelSelectorCard({
    selectedModel,
    onSelectModel,
    models,
    presetsConfig,
    serverStatus,
    setOptions,
    estimatedRamBytes,
    modelLoadBytes,
    contextReserveBytes,
    runtimeReserveBytes,
    flmProcessRamMb,
}: ServerModelSelectorCardProps) {
    const { t } = useTranslation();

    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Cpu size={16} className="text-muted-foreground" />
                    {t('server.model')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Select
                        value={selectedModel}
                        onValueChange={(val) => {
                            if (isPresetId(val)) {
                                const preset = findPresetById(val, presetsConfig);
                                if (preset) {
                                    onSelectModel(val);
                                    setOptions(prev => ({
                                        ...prev,
                                        ...preset.options,
                                    }));
                                }
                            } else {
                                onSelectModel(val);
                                const model = models.find(m => m.name === val);
                                setOptions(prev => ({
                                    ...prev,
                                    ctxLen: model?.contextLength || 0,
                                    asr: false,
                                    embed: false,
                                }));
                            }
                        }}
                        disabled={serverStatus !== "stopped"}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('server.select_model_placeholder')}>
                                {(() => {
                                    if (isPresetId(selectedModel)) {
                                        const preset = findPresetById(selectedModel, presetsConfig);
                                        return preset ? getPresetDisplayName(preset, t) : selectedModel;
                                    }
                                    return selectedModel || t('server.select_model_placeholder');
                                })()}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>{t('tray.presets_group')}</SelectLabel>
                                {getAllPresets(presetsConfig).map(preset => (
                                    <SelectItem key={preset.id} value={preset.id}>
                                        {getPresetDisplayName(preset, t)}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                            <SelectGroup>
                                <SelectLabel>{t('tray.models_group')}</SelectLabel>
                                {models.length === 0 ? (
                                    <SelectItem value="none" disabled>{t('server.no_model_installed')}</SelectItem>
                                ) : (
                                    models.map(m => (
                                        <SelectItem key={m.name} value={m.name}>
                                            {m.name} ({m.size})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border-t border-border pt-2 text-xs leading-4">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                            ~{t('server.estimated_ram')}
                            <InfoTooltip text={t('server.load_estimate_desc')} />
                        </span>
                        <span className="font-mono text-foreground">
                            {estimatedRamBytes ? formatGb(estimatedRamBytes) : "—"}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground" title={t('server.load_estimate_desc')}>
                        {modelLoadBytes ? (
                            <div className="flex items-center gap-2">
                                <span>model {formatGb(modelLoadBytes)}</span>
                                <span>ctx {formatGb(contextReserveBytes)}</span>
                                <span>runtime {formatGb(runtimeReserveBytes)}</span>
                            </div>
                        ) : "—"}
                        {flmProcessRamMb > 0 && (
                            <span className="shrink-0 text-emerald-400">
                                observed {formatGb(flmProcessRamMb * 1024 * 1024)}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
