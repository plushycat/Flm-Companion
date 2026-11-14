import { Sliders, Cog } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { InfoTooltip } from "../shared/InfoTooltip";
import { useTranslation } from "react-i18next";
import { formatTokenCount } from "../../lib/formatters";
import { RESPONSE_PRESETS, type PerformanceMode, type ResponsePreset, type ServerOptions, type ServerStatus } from "../../types";

export interface ServerAdvancedSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: ServerOptions;
    handleOptionChange: (key: keyof ServerOptions, value: ServerOptions[keyof ServerOptions]) => void;
    serverStatus: ServerStatus;
    contextValue: number;
    contextChoices: number[];
    backendOptions: string[];
    defaultPrefillLength: number;
    prefillChoices: number[];
}

export function ServerAdvancedSettingsDialog({
    open,
    onOpenChange,
    options,
    handleOptionChange,
    serverStatus,
    contextValue,
    contextChoices,
    backendOptions,
    defaultPrefillLength,
    prefillChoices,
}: ServerAdvancedSettingsDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                    <Sliders size={16} />
                    {t('server.advanced_settings')}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[min(92vw,960px)] max-w-4xl max-h-[85vh] overflow-visible flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('server.advanced_settings')}</DialogTitle>
                    <DialogDescription>{t('server.advanced_settings_desc')}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
                    {/* Features Accordion */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="features" className="border-none">
                            <Card className="bg-card border-border shadow-sm">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Cog size={16} className="text-muted-foreground" />
                                        {t('server.features')}
                                    </CardTitle>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="space-y-4 pt-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-foreground">{t('server.enable_asr')}</span>
                                                <InfoTooltip text={t('server.asr_desc')} />
                                            </div>
                                            <Switch
                                                checked={options.asr}
                                                onCheckedChange={(checked) => handleOptionChange('asr', checked)}
                                                disabled={serverStatus !== "stopped"}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-foreground">{t('server.enable_embeddings')}</span>
                                                <InfoTooltip text={t('server.embeddings_desc')} />
                                            </div>
                                            <Switch
                                                checked={options.embed}
                                                onCheckedChange={(checked) => handleOptionChange('embed', checked)}
                                                disabled={serverStatus !== "stopped"}
                                            />
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>

                    {/* Launch Parameters (Always Expanded) */}
                    <div className="space-y-4 pt-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <label className="block text-xs font-medium text-muted-foreground">{t('server.power_mode')}</label>
                                                <InfoTooltip text={t('server.power_mode_desc')} />
                                            </div>
                                            <Select
                                                value={options.pmode}
                                                onValueChange={(value) => handleOptionChange('pmode', value as PerformanceMode)}
                                                disabled={serverStatus !== "stopped"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('server.power_mode')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="powersaver">{t('chat.power_modes.powersaver')}</SelectItem>
                                                    <SelectItem value="balanced">{t('chat.power_modes.balanced')}</SelectItem>
                                                    <SelectItem value="performance">{t('chat.power_modes.performance')}</SelectItem>
                                                    <SelectItem value="turbo">{t('chat.power_modes.turbo')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <label className="block text-xs font-medium text-muted-foreground">{t('server.sampling_preset')}</label>
                                                <InfoTooltip text={t('server.sampling_preset_desc')} />
                                            </div>
                                            <Select
                                                value={options.responsePreset || (options.caveman ? "caveman" : "balanced")}
                                                onValueChange={(value) => handleOptionChange('responsePreset', value as ResponsePreset)}
                                                disabled={serverStatus !== "stopped"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="precise">{t('chat.sampling_precise')} ({RESPONSE_PRESETS.precise.temperature}/{RESPONSE_PRESETS.precise.topP})</SelectItem>
                                                    <SelectItem value="balanced">{t('chat.sampling_balanced')} ({RESPONSE_PRESETS.balanced.temperature}/{RESPONSE_PRESETS.balanced.topP})</SelectItem>
                                                    <SelectItem value="creative">{t('chat.sampling_creative')} ({RESPONSE_PRESETS.creative.temperature}/{RESPONSE_PRESETS.creative.topP})</SelectItem>
                                                    <SelectItem value="caveman">{t('chat.caveman_mode')} ({RESPONSE_PRESETS.caveman.temperature}/{RESPONSE_PRESETS.caveman.topP})</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.host')}</label>
                                                    <InfoTooltip text={t('server.host_desc')} />
                                                </div>
                                                <Input
                                                    type="text"
                                                    value={options.host || "127.0.0.1"}
                                                    onChange={(e) => handleOptionChange('host', e.target.value)}
                                                    disabled={serverStatus !== "stopped"}
                                                    className="bg-input border-input text-foreground h-9"
                                                    placeholder="127.0.0.1"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.port')}</label>
                                                    <InfoTooltip text={t('server.port_desc')} />
                                                </div>
                                                <Input
                                                    type="number"
                                                    value={options.port}
                                                    onChange={(e) => handleOptionChange('port', parseInt(e.target.value))}
                                                    disabled={serverStatus !== "stopped"}
                                                    className="bg-input border-input text-foreground h-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.socket_conn')}</label>
                                                    <InfoTooltip text={t('server.socket_conn_desc')} />
                                                </div>
                                                <Input
                                                    type="number"
                                                    value={options.socket}
                                                    onChange={(e) => handleOptionChange('socket', parseInt(e.target.value))}
                                                    disabled={serverStatus !== "stopped"}
                                                    className="bg-input border-input text-foreground h-9"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.queue_len')}</label>
                                                    <InfoTooltip text={t('server.queue_len_desc')} />
                                                </div>
                                                <Input
                                                    type="number"
                                                    value={options.qLen}
                                                    onChange={(e) => handleOptionChange('qLen', parseInt(e.target.value))}
                                                    disabled={serverStatus !== "stopped"}
                                                    className="bg-input border-input text-foreground h-9"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <label className="block text-xs font-medium text-muted-foreground">{t('server.context_tokens')}</label>
                                                <InfoTooltip text={t('server.context_tokens_desc')} />
                                            </div>
                                            <Select
                                                value={String(contextValue)}
                                                onValueChange={(value) => handleOptionChange('ctxLen', Number(value))}
                                                disabled={serverStatus !== "stopped"}
                                            >
                                                <SelectTrigger className="bg-input border-input text-foreground h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {contextChoices.map(length => (
                                                        <SelectItem key={length} value={String(length)}>
                                                            {formatTokenCount(length)} tokens
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.backend')}</label>
                                                    <InfoTooltip text={t('server.backend_desc')} />
                                                </div>
                                                <Select
                                                    value={options.backend || "__auto__"}
                                                    onValueChange={(value) => handleOptionChange('backend', value === "__auto__" ? "" : value)}
                                                    disabled={serverStatus !== "stopped"}
                                                >
                                                    <SelectTrigger className="bg-input border-input text-foreground h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__auto__">{t('server.backend_auto')}</SelectItem>
                                                        {backendOptions.map((backend) => (
                                                            <SelectItem key={backend} value={backend}>{backend}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.decision_model')}</label>
                                                    <InfoTooltip text={t('server.decision_model_desc')} />
                                                </div>
                                                <Select
                                                    value={options.decision || "none"}
                                                    onValueChange={(value) => handleOptionChange('decision', value === "none" ? "" : value)}
                                                    disabled={serverStatus !== "stopped"}
                                                >
                                                    <SelectTrigger className="bg-input border-input text-foreground h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">{t('server.disabled')}</SelectItem>
                                                        {['d3:lite', 'd3:nano', 'd3:mini', 'd3:turbo', 'd3:ultra'].map(value => (
                                                            <SelectItem key={value} value={value}>{value}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <label className="block text-xs font-medium text-muted-foreground">{t('server.prefill_chunk')}</label>
                                                <InfoTooltip text={t('server.prefill_chunk_desc')} />
                                            </div>
                                            <Select
                                                value={String(options.prefillChunkLen || defaultPrefillLength)}
                                                onValueChange={(value) => handleOptionChange('prefillChunkLen', Number(value))}
                                                disabled={serverStatus !== "stopped"}
                                            >
                                                <SelectTrigger className="bg-input border-input text-foreground h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {prefillChoices.map(length => (
                                                        <SelectItem key={length} value={String(length)}>{formatTokenCount(length)} tokens</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.prefix_cache_mb')}</label>
                                                    <InfoTooltip text={t('server.prefix_cache_mb_desc')} />
                                                </div>
                                                <Input type="number" min="0" value={options.prefixCacheMb ?? ""} onChange={(e) => handleOptionChange('prefixCacheMb', parseInt(e.target.value) || 0)} disabled={serverStatus !== "stopped"} className="bg-input border-input text-foreground h-9" placeholder="4096" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.prefix_slots')}</label>
                                                    <InfoTooltip text={t('server.prefix_slots_desc')} />
                                                </div>
                                                <Input type="number" min="0" max="32" value={options.prefixSlots ?? ""} onChange={(e) => handleOptionChange('prefixSlots', parseInt(e.target.value) || 0)} disabled={serverStatus !== "stopped"} className="bg-input border-input text-foreground h-9" placeholder="8" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.prefix_min_gain')}</label>
                                                    <InfoTooltip text={t('server.prefix_min_gain_desc')} />
                                                </div>
                                                <Input type="number" min="0" value={options.prefixMinGain ?? ""} onChange={(e) => handleOptionChange('prefixMinGain', parseInt(e.target.value) || 0)} disabled={serverStatus !== "stopped"} className="bg-input border-input text-foreground h-9" placeholder="128" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <label className="block text-xs font-medium text-muted-foreground">{t('server.image_resize')}</label>
                                                    <InfoTooltip text={t('server.image_resize_desc')} />
                                                </div>
                                                <Select value={String(options.imgPreResize ?? 2)} onValueChange={(value) => handleOptionChange('imgPreResize', Number(value))} disabled={serverStatus !== "stopped"}>
                                                    <SelectTrigger className="bg-input border-input text-foreground h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(value => <SelectItem key={value} value={String(value)}>{value === 0 ? t('server.original') : `${[0, 480, 720, 1080, 1440, 2160, 2880, 3240, 4320][value]}p`}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-foreground">{t('server.enable_cors')}</span>
                                                    <InfoTooltip text={t('server.enable_cors_desc')} />
                                                </div>
                                                <Switch
                                                    checked={options.cors}
                                                    onCheckedChange={(checked) => handleOptionChange('cors', checked)}
                                                    disabled={serverStatus !== "stopped"}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-foreground">{t('server.enable_preemption')}</span>
                                                    <InfoTooltip text={t('server.enable_preemption_desc')} />
                                                </div>
                                                <Switch
                                                    checked={options.preemption}
                                                    onCheckedChange={(checked) => handleOptionChange('preemption', checked)}
                                                    disabled={serverStatus !== "stopped"}
                                                />
                                            </div>
                                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
