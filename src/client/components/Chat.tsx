import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import { useViewerStore } from '../hooks/useViewerStore.js';
import { MessageBubble } from './MessageBubble.js';

interface Props {
  password: string;
  model: string;
  skillContext: boolean;
}

const REGION_RE = /pct:[\d.]+,[\d.]+,[\d.]+,[\d.]+/;

export function Chat({ password, model, skillContext }: Props) {
  const viewer = useViewerStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<Set<string>>(new Set());

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, error, stop } = useChat({
    api: '/api/chat',
    body: { model, password, skillContext },
    maxSteps: 10,
  });

  // Scan new tool invocations for viewer commands
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant' || !msg.parts) continue;
      for (const part of msg.parts) {
        if (part.type !== 'tool-invocation') continue;
        const { toolCallId, toolName, state, result } = (part as any).toolInvocation;
        if (state !== 'result' || processedRef.current.has(toolCallId)) continue;
        processedRef.current.add(toolCallId);

        const text = typeof result === 'string' ? result : JSON.stringify(result);

        if (toolName === 'get_artwork_image') {
          try {
            const parsed = JSON.parse(text);
            const sc = parsed.structuredContent ?? parsed;
            if (sc.iiifInfoUrl) {
              viewer.openArtwork(sc.iiifInfoUrl, {
                title: sc.title ?? 'Artwork',
                creator: sc.creator,
                date: sc.date,
                objectNumber: sc.objectNumber,
                license: sc.license,
                physicalDimensions: sc.physicalDimensions,
                collectionUrl: sc.collectionUrl,
                fullUrl: sc.fullUrl,
                width: sc.width,
                height: sc.height,
              });
            }
          } catch {
            const iiifMatch = text.match(/https:\/\/iiif\.micr\.io\/[^\s"]+\/info\.json/);
            if (iiifMatch) {
              viewer.openArtwork(iiifMatch[0], { title: 'Artwork' });
            }
          }
        } else if (toolName === 'navigate_viewer') {
          try {
            const parsed = JSON.parse(text);
            const sc = parsed.structuredContent ?? parsed;
            const cmds: Array<{ action: string; region?: string; label?: string; color?: string }> = sc.commands ?? [];
            let navRegion: string | undefined;
            const overlays: Array<{ region: string; label?: string; color?: string }> = [];
            for (const cmd of cmds) {
              if (cmd.action === 'navigate' && cmd.region) navRegion = cmd.region;
              if (cmd.action === 'add_overlay' && cmd.region) overlays.push({ region: cmd.region, label: cmd.label, color: cmd.color });
              if (cmd.action === 'clear_overlays') overlays.length = 0;
            }
            viewer.navigate({ region: navRegion, overlays: overlays.length ? overlays : undefined });
          } catch {
            const regionMatch = text.match(REGION_RE);
            if (regionMatch) viewer.navigate({ region: regionMatch[0] });
          }
        }
      }
    }
  }, [messages]);

  // Pick up region selections from the viewer
  useEffect(() => {
    if (!viewer.selectedRegion) return;
    const prefix = input ? `${input} ` : '';
    setInput(`${prefix}[Selected region: ${viewer.selectedRegion}] `);
    viewer.clearSelectedRegion();
  }, [viewer.selectedRegion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canSend = password.length > 0 && !isLoading;

  return (
    <div className="chat">
      <div className="message-list">
        {messages.length === 0 && (
          <div className="chat-welcome">
            Ask me about the Rijksmuseum collection. Try: "Search for Rembrandt paintings" or "Show me The Night Watch"
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && (
          <div className="message message-assistant">
            <div className="message-role">Assistant</div>
            <div className="message-text thinking">Thinking...</div>
          </div>
        )}
        {error && (
          <div className="chat-error">
            Error: {error.message}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={password ? 'Ask about the Rijksmuseum collection...' : 'Enter the access password to start'}
          disabled={!canSend && !isLoading}
          className="chat-input"
        />
        {isLoading ? (
          <button type="button" onClick={stop} className="chat-send chat-stop">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!canSend || !input.trim()} className="chat-send">
            Send
          </button>
        )}
      </form>
    </div>
  );
}
