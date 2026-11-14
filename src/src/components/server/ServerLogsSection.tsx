import { FileText } from "lucide-react";
import { Card, CardTitle } from "../ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { LogsViewer } from "../shared/LogsViewer";
import { useTranslation } from "react-i18next";
import type { ServerStatus } from "../../types";

interface ServerLogsSectionProps {
    logs: string[];
    onClearLogs: () => void;
    serverStatus: ServerStatus;
}

export function ServerLogsSection({
    logs,
    onClearLogs,
    serverStatus,
}: ServerLogsSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="lg:col-span-3 lg:h-full lg:min-h-0">
            {/* Mobile: Accordion */}
            <div className="lg:hidden">
                <Accordion type="single" collapsible defaultValue="logs" className="w-full">
                    <AccordionItem value="logs" className="border-none">
                        <Card className="bg-card border-border shadow-sm">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <FileText size={16} className="text-muted-foreground" />
                                    {t('server.logs_title')}
                                </CardTitle>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="px-6 pb-4">
                                    <LogsViewer
                                        logs={logs}
                                        variant="content"
                                        className="h-80 overflow-y-auto"
                                        onClear={onClearLogs}
                                        emptyMessage={serverStatus === "stopped" ? t('server.waiting_logs') : t('server.no_logs')}
                                    />
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
            </div>
            {/* Desktop: Normal display */}
            <div className="hidden lg:flex lg:h-full">
                <LogsViewer
                    logs={logs}
                    className="h-full w-full"
                    onClear={onClearLogs}
                    emptyMessage={serverStatus === "stopped" ? t('server.waiting_logs') : t('server.no_logs')}
                />
            </div>
        </div>
    );
}
