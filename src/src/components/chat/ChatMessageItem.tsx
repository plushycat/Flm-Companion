import { Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/utils";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
    reasoning?: string;
}

interface ChatMessageItemProps {
    message: ChatMessage;
    isLatestAssistant?: boolean;
    isThinking?: boolean;
}

export function ChatMessageItem({ message, isLatestAssistant, isThinking }: ChatMessageItemProps) {
    return (
        <div
            className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start",
                message.role === "system" ? "justify-center" : ""
            )}
        >
            <div
                className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "assistant"
                            ? "bg-muted"
                            : "bg-transparent text-xs text-muted-foreground font-mono"
                )}
            >
                {message.role === "assistant" ? (
                    <>
                        {message.reasoning && (
                            <details
                                className="mb-3 overflow-hidden rounded-md border border-border/60 bg-background/30 text-xs text-muted-foreground"
                                open={isThinking && isLatestAssistant}
                            >
                                <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 font-medium hover:text-foreground">
                                    <Brain className="h-3.5 w-3.5" />
                                    <span>{isThinking && isLatestAssistant ? "Thinking…" : "Thought process"}</span>
                                </summary>
                                <div className="border-t border-border/60 px-3 py-2 whitespace-pre-wrap leading-relaxed opacity-75">
                                    {message.reasoning}
                                </div>
                            </details>
                        )}
                        {message.content && (
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-code:before:content-none prose-code:after:content-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted/60 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                        )}
                    </>
                ) : message.role === "user" ? (
                    <div className="prose prose-sm max-w-none break-words text-inherit prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-code:text-inherit prose-code:bg-black/15 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/25 prose-pre:text-inherit prose-pre:p-3 prose-pre:rounded-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                )}
            </div>
        </div>
    );
}
