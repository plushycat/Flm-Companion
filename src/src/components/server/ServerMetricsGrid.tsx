import { MemoryStick, Cpu } from "lucide-react";
import { InfoTooltip } from "../shared/InfoTooltip";
import { formatTokenCount } from "../../lib/formatters";
import { useTranslation } from "react-i18next";

export interface ApiMetrics {
    requests: number;
    ttftMs: number | null;
    promptTokens: number | null;
}

export interface LiveRamStats {
    used: number;
    total: number;
    percentage: number;
    flmProcess: number;
}

interface ServerMetricsGridProps {
    liveRam: LiveRamStats;
    contextValue: number;
    reportedMaxContextLength?: number;
    apiMetrics: ApiMetrics;
}

export function ServerMetricsGrid({
    liveRam,
    contextValue,
    reportedMaxContextLength,
    apiMetrics,
}: ServerMetricsGridProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <MemoryStick size={14} />
                    {t('server.free_ram')}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-foreground">
                        {liveRam.total ? `${((liveRam.total - liveRam.used) / 1024).toFixed(1)} GB` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {liveRam.total ? `${liveRam.percentage.toFixed(1)}% used` : "—"}
                    </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, liveRam.percentage)}%` }}
                    />
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Cpu size={14} />
                    {t('server.flm_process_ram')}
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                    {liveRam.flmProcess ? `${liveRam.flmProcess.toFixed(1)} MB` : "—"}
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('server.launch_context')}
                    <InfoTooltip text={t('server.launch_context_desc')} />
                </div>
                <div className="mt-1 font-mono text-sm text-foreground">
                    {formatTokenCount(contextValue)}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                    {t('server.max_supported')}: {reportedMaxContextLength ? formatTokenCount(reportedMaxContextLength) : "—"}
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('server.api_metrics')}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                        TTFT <span className="font-mono text-foreground">{apiMetrics.ttftMs ? `${apiMetrics.ttftMs} ms` : "—"}</span>
                    </span>
                    <span className="text-muted-foreground">
                        CTX <span className="font-mono text-foreground">
                            {apiMetrics.promptTokens ? `${formatTokenCount(apiMetrics.promptTokens)}${reportedMaxContextLength ? ` / ${formatTokenCount(reportedMaxContextLength)}` : ""}` : "—"}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}
