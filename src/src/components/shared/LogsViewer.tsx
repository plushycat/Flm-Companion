import { useEffect, useRef, useState } from "react";
import { Terminal, Copy, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { getLogColorClass } from "../../lib/formatters";

interface LogsViewerProps {
    logs: string[];
    title?: string;
    emptyMessage?: string;
    className?: string;
    autoScroll?: boolean;
    /** "card" = with Card wrapper (default), "content" = just the logs content without Card */
    variant?: "card" | "content";
    /** Callback to clear the logs */
    onClear?: () => void;
}

/**
 * Reusable component for displaying log output
 * Used in ServerView and can be used standalone
 */
export function LogsViewer({
    logs,
    title,
    emptyMessage,
    className = "",
    autoScroll = true,
    variant = "card",
    onClear,
}: LogsViewerProps) {
    const { t } = useTranslation();
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (autoScroll) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    const displayTitle = title || t("server.logs_title");
    const displayEmptyMessage = emptyMessage || t("server.waiting_logs");

    const handleCopy = async () => {
        if (logs.length === 0) return;
        try {
            await navigator.clipboard.writeText(logs.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy logs:", error);
        }
    };

    // Content-only variant (for use inside accordions, etc.)
    if (variant === "content") {
        return (
            <div className="space-y-2">
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={logs.length === 0}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer disabled:cursor-not-allowed"
                    >
                        {copied ? <Check size={14} className="mr-1 text-green-600 dark:text-green-400" /> : <Copy size={14} className="mr-1" />}
                        {copied ? t("logs.copied") : t("logs.copy")}
                    </Button>
                    {onClear && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            disabled={logs.length === 0}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer disabled:cursor-not-allowed"
                        >
                            <Trash2 size={14} className="mr-1" />
                            {t("logs.clear")}
                        </Button>
                    )}
                </div>
                <div className={`font-mono text-xs space-y-1 bg-secondary/50 dark:bg-black text-foreground dark:text-zinc-300 p-4 rounded-md border border-border dark:border-zinc-800 ${className}`}>
                    {logs.length === 0 ? (
                        <div className="text-muted-foreground text-center py-8 italic">
                            {displayEmptyMessage}
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`break-all ${getLogColorClass(log)}`}>
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        );
    }

    // Card variant (default)
    return (
        <Card
            className={`bg-secondary/40 dark:bg-black border-border dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm ${className}`}
        >
            <CardHeader className="bg-secondary/70 dark:bg-zinc-950 px-4 py-3 border-b border-border dark:border-zinc-800 flex flex-row justify-between items-center space-y-0 shrink-0">
                <CardTitle className="text-sm font-medium text-foreground dark:text-zinc-200 flex items-center gap-2">
                    <Terminal size={16} className="text-muted-foreground" />
                    {displayTitle}
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={logs.length === 0}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-zinc-900 cursor-pointer disabled:cursor-not-allowed"
                        title={t("logs.copy")}
                    >
                        {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
                    </Button>
                    {onClear && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            disabled={logs.length === 0}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-zinc-900 cursor-pointer disabled:cursor-not-allowed"
                            title={t("logs.clear")}
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1 min-h-0 bg-secondary/30 dark:bg-black text-foreground dark:text-zinc-300">
                {logs.length === 0 ? (
                    <div className="text-zinc-500 dark:text-zinc-500 text-center mt-20 italic">
                        {displayEmptyMessage}
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`break-all ${getLogColorClass(log)}`}>
                            {log}
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </CardContent>
        </Card>
    );
}
