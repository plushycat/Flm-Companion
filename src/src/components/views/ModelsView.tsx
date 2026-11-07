import { RefreshCw, HardDrive, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FlmService } from "../../services/flm";
import { NotificationService } from "../../services/notification";
import type { FlmModel, HardwareInfo } from "../../types";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { useTranslation } from "react-i18next";
import { GenericAlertDialog } from "../shared/GenericAlertDialog";
import { ModelCard } from "../shared/ModelCard";
import { getPerformanceWarning } from "../../lib/performance";

interface ModelsViewProps {
    installedModels: FlmModel[];
    onRefresh: () => void;
    hardwareInfo: HardwareInfo | null;
}

export const ModelsView = ({ installedModels, onRefresh, hardwareInfo }: ModelsViewProps) => {
    const { t } = useTranslation();
    const [availableModels, setAvailableModels] = useState<FlmModel[]>([]);
    const [catalogQuery, setCatalogQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [downloadStatus, setDownloadStatus] = useState<string>("");
    const [downloadBytes, setDownloadBytes] = useState<string | null>(null);
    const cancelRequested = useRef(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    const loadModels = async (force = false) => {
        setLoading(true);
        try {
            const available = await FlmService.listModels("not-installed", force);
            setAvailableModels(available);
        } catch (error) {
            console.error("Failed to load models:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadModels();
    }, []);

    const handleDelete = async (name: string) => {
        try {
            setLoading(true);
            await FlmService.removeModel(name);
            // Notify deletion success
            NotificationService.send(
                t("app.notification_model_delete_complete_title"),
                t("app.notification_model_delete_complete_body", { model: name })
            );
            onRefresh();
            await loadModels(true);
        } catch (e) {
            // Notify deletion error
            NotificationService.send(
                t("app.notification_model_delete_error_title"),
                t("app.notification_model_delete_error_body", { model: name })
            );
            setAlertMessage(t("models.error_delete") + e);
            setAlertOpen(true);
            setLoading(false);
        }
    };

    const handleDownload = async (modelName: string) => {
        if (downloadingModel) return;
        setDownloadingModel(modelName);
        cancelRequested.current = false;
        setDownloadProgress(0);
        setDownloadStatus(t("models.download_starting"));
        setDownloadBytes(null);

        NotificationService.send(
            t("app.notification_model_download_start_title"),
            t("app.notification_model_download_start_body", { model: modelName })
        );

        let totalFiles = 1;
        let baseProgress = 0;
        let currentFileProgress = 0;
        let overallProgress: number | null = null;

        try {
            await FlmService.pullModel(modelName, (data) => {
                const cleanData = data
                    .replace(/\x1B(?:[@-_]|\[[0-?]*[ -/]*[@-~])/g, "")
                    .replace(/\[[0-9;?]*[ -/]*[@-~]/g, "")
                    .replace(/\r/g, "")
                    .replace(/^\[FLM\]\s+/, "")
                    .trim();
                const progressData = cleanData.replace(
                    /^[^\n]*?(?=(?:Downloading \d+\/\d+:|Overall progress:|Downloading:))/,
                    ""
                );

                // Check for "Downloading X/Y" to set total files
                const fileCountMatch = progressData.match(/Downloading (\d+)\/(\d+):/);
                if (fileCountMatch) {
                    const current = parseInt(fileCountMatch[1]);
                    const total = parseInt(fileCountMatch[2]);
                    totalFiles = total;
                    baseProgress = ((current - 1) / total) * 100;
                    currentFileProgress = 0;
                    overallProgress = null;
                    setDownloadStatus(t("models.download_file_progress", { current, total }));
                }

                // Check for "Overall progress: P%"
                const overallMatch = progressData.match(/Overall progress:\s*([\d.]+)%/);
                if (overallMatch) {
                    overallProgress = parseFloat(overallMatch[1]);
                    currentFileProgress = 0;
                }

                // Check for "Downloading: P%"
                const downloadingMatch = progressData.match(/Downloading:\s*([\d.]+)%/);
                if (downloadingMatch) {
                    currentFileProgress = parseFloat(downloadingMatch[1]);
                }

                const bytesMatch = progressData.match(/([\d.]+\s*(?:KB|MB|GB|TB))\s*\/\s*([\d.]+\s*(?:KB|MB|GB|TB))/i);
                if (bytesMatch) setDownloadBytes(`${bytesMatch[1]} / ${bytesMatch[2]}`);

                const totalProgress = overallProgress ?? baseProgress + currentFileProgress / totalFiles;
                setDownloadProgress(Math.round(totalProgress));

            });

            setDownloadStatus(t("models.download_complete"));
            setDownloadProgress(100);
            // Notify download complete
            NotificationService.send(
                t("app.notification_model_download_complete_title"),
                t("app.notification_model_download_complete_body", { model: modelName })
            );
            setTimeout(() => {
                setDownloadingModel(null);
                setDownloadProgress(0);
                setDownloadStatus("");
                setDownloadBytes(null);
                onRefresh();
                loadModels(true);
            }, 1000);
        } catch (error) {
            if (cancelRequested.current) {
                setDownloadStatus(t("common.cancel"));
                setTimeout(() => {
                    setDownloadingModel(null);
                    setDownloadProgress(0);
                    setDownloadStatus("");
                }, 500);
                return;
            }
            // Notify download error
            NotificationService.send(
                t("app.notification_model_download_error_title"),
                t("app.notification_model_download_error_body", { model: modelName })
            );
            setDownloadStatus(t("models.download_error", { error }));
            setTimeout(() => setDownloadingModel(null), 3000);
        }
    };

    const handleCancelDownload = async () => {
        if (!downloadingModel) return;
        cancelRequested.current = true;
        setDownloadStatus(t("common.cancel"));
        await FlmService.cancelPullModel();
    };

    const isInstalled = (name: string) => installedModels.some((m) => m.name === name);
    const filteredAvailableModels = availableModels.filter((model) => {
        const query = catalogQuery.trim().toLowerCase();
        return !query || `${model.name} ${model.description || ""}`.toLowerCase().includes(query);
    });

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("models.title")}
                    </h2>
                    <p className="text-muted-foreground text-sm">{t("models.subtitle")}</p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => {
                        onRefresh();
                        loadModels(true);
                    }}
                    disabled={loading || !!downloadingModel}
                    className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    {t("models.refresh")}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Installed Models */}
                <ModelList
                    title={t("models.installed_title")}
                    icon={<HardDrive size={16} />}
                    models={installedModels}
                    emptyMessage={t("models.no_installed_models")}
                    renderModel={(model) => (
                        <ModelCard
                            key={model.name}
                            model={model}
                            performanceWarning={getPerformanceWarning(model, hardwareInfo)}
                            onDelete={handleDelete}
                            disabled={!!downloadingModel}
                        />
                    )}
                />

                {/* Available Models */}
                <ModelList
                    title={t("models.available_title")}
                    icon={<Download size={16} />}
                    models={filteredAvailableModels}
                    header={<Input
                        value={catalogQuery}
                        onChange={(e) => setCatalogQuery(e.target.value)}
                        placeholder={t("models.search_placeholder")}
                        className="h-8 w-56 text-xs"
                    />}
                    emptyMessage={t("models.no_available_models")}
                    renderModel={(model) => (
                        <ModelCard
                            key={model.name}
                            model={model}
                            performanceWarning={getPerformanceWarning(model, hardwareInfo)}
                            isInstalled={isInstalled(model.name)}
                            isDownloading={downloadingModel === model.name}
                            downloadProgress={downloadProgress}
                            downloadBytes={downloadBytes}
                            downloadStatus={downloadStatus}
                            onDownload={handleDownload}
                            onCancelDownload={handleCancelDownload}
                            disabled={!!downloadingModel}
                        />
                    )}
                />
            </div>

            <GenericAlertDialog
                open={alertOpen}
                onOpenChange={setAlertOpen}
                description={alertMessage}
            />
        </div>
    );
};

interface ModelListProps {
    title: string;
    icon: React.ReactNode;
    models: FlmModel[];
    emptyMessage: string;
    renderModel: (model: FlmModel) => React.ReactNode;
    header?: React.ReactNode;
}

function ModelList({ title, icon, models, emptyMessage, renderModel, header }: ModelListProps) {
    return (
        <div className="flex flex-col space-y-3 h-auto lg:h-full">
            <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                {header}
            </div>
            <Card className="bg-card border-border overflow-hidden flex-1 flex flex-col shadow-sm min-h-0">
                <CardContent className="p-0 flex-1 h-full relative">
                    <ScrollArea className="h-[calc(50vh-130px)] lg:h-[calc(100vh-200px)]">
                        {models.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground italic">
                                {emptyMessage}
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {models.map(renderModel)}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
