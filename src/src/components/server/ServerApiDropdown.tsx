import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import type { ServerStatus } from "../../types";

interface ServerApiDropdownProps {
    apiBaseUrl: string;
    apiModel: string;
    serverStatus: ServerStatus;
}

export function ServerApiDropdown({
    apiBaseUrl,
    apiModel,
    serverStatus,
}: ServerApiDropdownProps) {
    const { t } = useTranslation();
    const [copiedApi, setCopiedApi] = useState<string | null>(null);

    const apiSnippets = {
        baseUrl: apiBaseUrl,
        curl: `curl ${apiBaseUrl}/chat/completions -H "Content-Type: application/json" -d '{"model":"${apiModel}","messages":[{"role":"user","content":"Hello"}]}'`,
        python: `import requests\n\nrequests.post("${apiBaseUrl}/chat/completions", json={"model": "${apiModel}", "messages": [{"role": "user", "content": "Hello"}]})`,
    };

    const copyApiSnippet = async (kind: keyof typeof apiSnippets) => {
        await navigator.clipboard.writeText(apiSnippets[kind]);
        setCopiedApi(kind);
        window.setTimeout(() => setCopiedApi(null), 1500);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" title={t("server.api_description")}>
                    {copiedApi ? <Check size={15} /> : <Copy size={15} />}
                    {t("server.developer_api")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="space-y-1">
                    <div>{t("server.developer_api")}</div>
                    <div className="font-mono text-xs font-normal text-muted-foreground break-all">{apiBaseUrl}</div>
                    <div className="text-xs font-normal text-emerald-400">{t("server.active_model_only")}</div>
                    {serverStatus === "stopped" && <div className="text-xs font-normal text-yellow-400">{t("server.api_start_required")}</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => copyApiSnippet("baseUrl")}>
                    {copiedApi === "baseUrl" ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
                    {t("server.copy_base_url")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyApiSnippet("curl")}>
                    {copiedApi === "curl" ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
                    {t("server.copy_curl")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyApiSnippet("python")}>
                    {copiedApi === "python" ? <Check size={15} className="mr-2" /> : <Copy size={15} className="mr-2" />}
                    {t("server.copy_python")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
