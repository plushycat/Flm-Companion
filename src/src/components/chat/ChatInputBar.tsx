import { useRef } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

interface ChatInputBarProps {
    input: string;
    setInput: (val: string) => void;
    onSend: () => void;
    onStop: () => void;
    isReady: boolean;
    isRunning: boolean;
    isThinking: boolean;
}

export function ChatInputBar({
    input,
    setInput,
    onSend,
    onStop,
    isReady,
    isRunning,
    isThinking,
}: ChatInputBarProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape" && isThinking) {
            e.preventDefault();
            onStop();
            return;
        }
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const insert = "  "; // 2 spaces for code indentation
            const nextValue = input.substring(0, start) + insert + input.substring(end);
            setInput(nextValue);
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + insert.length;
            });
            return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div
            className={cn(
                "relative min-h-14 border-t bg-background/50 backdrop-blur supports-backdrop-filter:bg-background/50 transition-opacity",
                !isReady && "opacity-60"
            )}
        >
            <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={(e) => {
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`;
                }}
                placeholder={
                    isReady
                        ? t("chat.type_message")
                        : isRunning
                            ? t("chat.waiting_model")
                            : t("chat.start_model_to_chat")
                }
                disabled={!isRunning}
                className="h-full min-h-14 max-h-32 w-full resize-none content-center rounded-none border-0 bg-transparent px-4 py-3 pr-24 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <Button
                tabIndex={-1}
                onClick={isThinking ? onStop : onSend}
                disabled={isThinking ? false : !isReady || !input.trim()}
                aria-label={isThinking ? "Stop" : "Send"}
                title={isThinking ? "Stop" : "Send"}
                className={cn(
                    "absolute inset-y-0 right-0 !h-auto w-20 rounded-none rounded-r-lg border-0 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:brightness-90",
                    isThinking
                        ? "bg-muted text-foreground hover:bg-accent"
                        : input.trim() && isReady
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground"
                )}
            >
                {isThinking ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </Button>
        </div>
    );
}
