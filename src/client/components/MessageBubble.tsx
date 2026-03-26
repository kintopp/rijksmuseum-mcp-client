import type { Message } from 'ai';
import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  return (
    <div className={`message message-${message.role}`}>
      <div className="message-role">{message.role === 'user' ? 'You' : 'Assistant'}</div>
      {message.content && (
        <div className="message-text">
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </div>
      )}
      {message.parts?.map((part, i) => {
        if (part.type === 'tool-invocation') {
          return <ToolInvocation key={i} invocation={part} />;
        }
        return null;
      })}
    </div>
  );
}

function ToolInvocation({ invocation }: { invocation: any }) {
  const [expanded, setExpanded] = useState(false);
  const { toolInvocation } = invocation;
  const { toolName, state } = toolInvocation;

  if (state === 'call' || state === 'partial-call') {
    return (
      <div className="tool-call tool-pending">
        <span className="tool-spinner">...</span> Calling {toolName}
      </div>
    );
  }

  // state === 'result'
  const resultText = typeof toolInvocation.result === 'string'
    ? toolInvocation.result
    : JSON.stringify(toolInvocation.result, null, 2);

  const summary = toolName === 'get_artwork_image'
    ? 'Opened artwork in viewer'
    : toolName === 'navigate_viewer'
      ? 'Navigated viewer'
      : `${toolName} completed`;

  return (
    <div className="tool-call tool-done">
      <button className="tool-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? '▼' : '▶'} {summary}
      </button>
      {expanded && <pre className="tool-result">{resultText}</pre>}
    </div>
  );
}
