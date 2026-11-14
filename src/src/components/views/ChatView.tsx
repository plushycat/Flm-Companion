import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { FlmService } from '../../services/flm';
import { RESPONSE_PRESETS, type ServerStatus, type ReasoningEffort } from '../../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { useAppContext } from '../../contexts';
import { isPresetId, findPresetById } from '../../lib/presets';
import { ChatMessageItem, ChatInputBar, type ChatMessage } from '../chat';

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
    const { serverOptions, installedModels, reasoningEffort, setReasoningEffort, presetsConfig } = useAppContext();
    const actualModel = isPresetId(selectedModel)
        ? findPresetById(selectedModel, presetsConfig)?.model || selectedModel
        : selectedModel;
    const isReasoningModel = installedModels.find(m => m.name === actualModel || m.name === selectedModel)?.isThink ?? false;
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
                        model: actualModel,
                        messages: history,
                        temperature: RESPONSE_PRESETS[responsePreset].temperature,
                        top_p: RESPONSE_PRESETS[responsePreset].topP,
                        stream: true,
                        ...(isReasoningModel ? {
                            reasoning_effort: reasoningEffort,
                            enable_think: reasoningEffort !== 'none',
                            enable_thinking: reasoningEffort !== 'none',
                            chat_template_kwargs: {
                                enable_thinking: reasoningEffort !== 'none',
                            },
                        } : {}),
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

    return (
        <div className="flex flex-col h-full space-y-4 lg:space-y-5 min-h-0">
            {/* Header */}
            <div className="flex justify-between items-center px-1 shrink-0">
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                    {t('sidebar.chat')}
                </h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border shadow-sm shrink-0">
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
                    <div className="flex min-w-0 items-center gap-1.5 text-[13px]" title={isReasoningModel ? '' : t('chat.reasoning_needs_think_model')}>
                        <span className="shrink-0 text-muted-foreground/50">{t('chat.reasoning')}</span>
                        <Select
                            value={reasoningEffort}
                            onValueChange={(v) => setReasoningEffort(v as ReasoningEffort)}
                            disabled={!isReasoningModel}
                        >
                            <SelectTrigger className="h-6 w-[92px] shrink-0 px-2 text-[13px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('chat.reasoning_off')}</SelectItem>
                                <SelectItem value="low">{t('chat.reasoning_low')}</SelectItem>
                                <SelectItem value="medium">{t('chat.reasoning_medium')}</SelectItem>
                                <SelectItem value="high">{t('chat.reasoning_high')}</SelectItem>
                            </SelectContent>
                        </Select>
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
                            <ChatMessageItem
                                key={idx}
                                message={msg}
                                isLatestAssistant={idx === messages.length - 1}
                                isThinking={isThinking}
                            />
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
                <ChatInputBar
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    onStop={stopResponse}
                    isReady={isReady}
                    isRunning={isRunning}
                    isThinking={isThinking}
                />
            </Card>
        </div>
    );
};
