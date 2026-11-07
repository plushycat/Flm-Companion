import { useState, useEffect, useRef } from 'react';
import { Brain, Send, Square, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { FlmService } from '../../services/flm';
import { RESPONSE_PRESETS, type ServerStatus } from '../../types';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { useAppContext } from '../../contexts';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
}

function splitReasoning(text: string, reasoning = '') {
    const start = text.indexOf('<think>');
    if (start === -1) return { reasoning, content: text };
    const bodyStart = start + '<think>'.length;
    const end = text.indexOf('</think>', bodyStart);
    if (end === -1) return { reasoning: reasoning + text.slice(bodyStart), content: '' };
    return {
        reasoning: reasoning + text.slice(bodyStart, end),
        content: text.slice(end + '</think>'.length).trimStart(),
    };
}

interface ChatViewProps {
    selectedModel: string;
    serverStatus: ServerStatus;
}

const API_BASE_URL = 'http://127.0.0.1:52626/v1';
export const ChatView = ({ selectedModel, serverStatus }: ChatViewProps) => {
    const { t } = useTranslation();
    const { serverOptions } = useAppContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const responsePreset = serverOptions?.responsePreset ?? 'balanced';
    const systemPrompt = 'systemPrompt' in RESPONSE_PRESETS[responsePreset]
        ? RESPONSE_PRESETS[responsePreset].systemPrompt
        : undefined;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (serverStatus === 'running') {
            setIsRunning(true);
            setIsReady(true);
        } else if (serverStatus === 'starting') {
            setIsRunning(true);
            setIsReady(false);
        } else {
            setIsRunning(false);
            setIsReady(false);
        }
    }, [serverStatus]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const stopResponse = () => {
        abortControllerRef.current?.abort();
    };

    const handleSend = async () => {
        if (!input.trim() || !isReady || isThinking) return;

        const userMsg = input;
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsReady(false);
        setIsThinking(true);

        // Create a new empty assistant message to stream into
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            if (serverStatus === 'running') {
                const history = [
                    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
                    ...messages.filter(message => message.role !== 'system'),
                    { role: 'user' as const, content: userMsg },
                ];
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const response = await fetch(`${API_BASE_URL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: history,
                        temperature: RESPONSE_PRESETS[responsePreset].temperature,
                        top_p: RESPONSE_PRESETS[responsePreset].topP,
                        stream: true,
                    }),
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) throw new Error(`API request failed (${response.status})`);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let rawAssistant = '';
                let rawReasoning = '';
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        const payload = line.slice(5).trim();
                        if (payload === '[DONE]') continue;
                        try {
                            const delta = JSON.parse(payload).choices?.[0]?.delta;
                            const content = delta?.content || '';
                            const reasoning = delta?.reasoning_content || '';
                            if (content || reasoning) {
                                rawAssistant += content;
                                rawReasoning += reasoning;
                                const parsed = splitReasoning(rawAssistant, rawReasoning);
                                setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', ...parsed }]);
                            }
                        } catch {
                            // Ignore malformed SSE chunks.
                        }
                    }
                }
                setIsReady(true);
                setIsThinking(false);
                abortControllerRef.current = null;
            } else {
                await FlmService.sendChatMessage(userMsg);
            }
        } catch (e) {
            setIsReady(true);
            setIsThinking(false);
            abortControllerRef.current = null;
            if (!(e instanceof DOMException && e.name === 'AbortError')) {
                setMessages(prev => [...prev, { role: 'system', content: t('chat.system_error', { error: e }) }]);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && isThinking) {
            e.preventDefault();
            stopResponse();
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Controls */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border shadow-sm">
                <div className="flex min-w-0 flex-1 items-baseline gap-5">
                    <div className="flex min-w-0 items-baseline gap-1.5 text-[13px]">
                        <span className="shrink-0 text-muted-foreground/50">Model:</span>
                        <span className="truncate font-mono text-foreground" title={selectedModel}>
                            {selectedModel || t('chat.select_model')}
                        </span>
                    </div>

                    <div className="flex min-w-0 items-baseline gap-1.5 text-[13px]">
                        <span className="shrink-0 text-muted-foreground/50">Preset:</span>
                        <span className="truncate font-mono text-foreground" title={responsePreset}>
                            {responsePreset === 'precise' && t('chat.sampling_precise')}
                            {responsePreset === 'balanced' && t('chat.sampling_balanced')}
                            {responsePreset === 'creative' && t('chat.sampling_creative')}
                            {responsePreset === 'caveman' && t('chat.caveman_mode')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMessages([])}
                        disabled={!messages.length || isThinking}
                        aria-label={t('chat.clear')}
                        title={t('chat.clear')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        disabled
                        className={cn(
                            'gap-2',
                            serverStatus === 'running' && 'border-green-500/40 bg-green-500/10 text-green-400 opacity-100',
                            serverStatus === 'starting' && 'border-blue-500/40 bg-blue-500/10 text-blue-400 opacity-100',
                            serverStatus === 'stopped' && 'border-red-500/40 bg-red-500/10 text-red-400 opacity-100',
                        )}
                    >
                        <span className={cn(
                            'h-2 w-2 rounded-full',
                            serverStatus === 'running' && 'bg-green-400',
                            serverStatus === 'starting' && 'bg-blue-400 animate-pulse',
                            serverStatus === 'stopped' && 'bg-red-400',
                        )} />
                        {serverStatus === 'running' ? t('chat.server_ready') : serverStatus === 'starting' ? t('chat.server_starting') : t('chat.server_offline')}
                    </Button>
                </div>
            </div>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex w-full",
                                    msg.role === 'user' ? "justify-end" : "justify-start",
                                    msg.role === 'system' ? "justify-center" : ""
                                )}
                            >
                                <div className={cn(
                                    "rounded-lg px-4 py-2 max-w-[80%]",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground"
                                        : msg.role === 'assistant'
                                            ? "bg-muted"
                                            : "bg-transparent text-xs text-muted-foreground font-mono"
                                )}>
                                    {msg.role === 'assistant' ? (
                                        <>
                                            {msg.reasoning && (
                                                <details
                                                    className="mb-3 overflow-hidden rounded-md border border-border/60 bg-background/30 text-xs text-muted-foreground"
                                                    open={isThinking && idx === messages.length - 1}
                                                >
                                                    <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 font-medium hover:text-foreground">
                                                        <Brain className="h-3.5 w-3.5" />
                                                        <span>{isThinking && idx === messages.length - 1 ? 'Thinking…' : 'Thought process'}</span>
                                                    </summary>
                                                    <div className="border-t border-border/60 px-3 py-2 whitespace-pre-wrap leading-relaxed opacity-75">
                                                        {msg.reasoning}
                                                    </div>
                                                </details>
                                            )}
                                            {msg.content && <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>}
                                        </>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-4 py-2">
                                    <span className="animate-pulse">...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className={cn(
                    "relative min-h-14 border-t bg-background/50 backdrop-blur supports-backdrop-filter:bg-background/50 transition-opacity",
                    !isReady && "opacity-60"
                )}>
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onInput={e => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`;
                            }}
                            placeholder={isReady ? t('chat.type_message') : isRunning ? t('chat.waiting_model') : t('chat.start_model_to_chat')}
                            disabled={!isRunning}
                            className="h-full min-h-14 max-h-32 w-full resize-none content-center rounded-none border-0 bg-transparent px-4 py-3 pr-24 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                        />
                        <Button
                            onClick={isThinking ? stopResponse : handleSend}
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
            </Card>
        </div>
    );
};
