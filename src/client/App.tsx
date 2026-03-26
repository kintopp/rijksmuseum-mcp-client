import { useState } from 'react';
import { ViewerProvider, useViewerStoreProvider } from './hooks/useViewerStore.js';
import { Viewer } from './components/Viewer.js';
import { Chat } from './components/Chat.js';
import { ModelPicker } from './components/ModelPicker.js';
import { DEFAULT_MODEL } from './lib/types.js';

export function App() {
  const viewerStore = useViewerStoreProvider();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter-api-key') ?? '');
  const [model, setModel] = useState(() => localStorage.getItem('openrouter-model') ?? DEFAULT_MODEL);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openrouter-api-key', key);
  };

  const handleModelChange = (m: string) => {
    setModel(m);
    localStorage.setItem('openrouter-model', m);
  };

  return (
    <ViewerProvider value={viewerStore}>
      <div className="app">
        <div className="viewer-pane">
          <Viewer />
        </div>
        <div className="chat-pane">
          <ModelPicker
            apiKey={apiKey}
            model={model}
            onApiKeyChange={handleApiKeyChange}
            onModelChange={handleModelChange}
          />
          <Chat apiKey={apiKey} model={model} />
        </div>
      </div>
    </ViewerProvider>
  );
}
