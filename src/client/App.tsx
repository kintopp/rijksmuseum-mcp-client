import { useState } from 'react';
import { ViewerProvider, useViewerStoreProvider } from './hooks/useViewerStore.js';
import { Viewer } from './components/Viewer.js';
import { Chat } from './components/Chat.js';
import { ModelPicker } from './components/ModelPicker.js';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from './lib/types.js';

const VALID_MODEL_IDS = new Set(AVAILABLE_MODELS.map(m => m.id));

export function App() {
  const viewerStore = useViewerStoreProvider();
  const [password, setPassword] = useState(() => localStorage.getItem('access-password') ?? '');
  const [model, setModel] = useState(() => {
    const stored = localStorage.getItem('openrouter-model');
    return stored && VALID_MODEL_IDS.has(stored) ? stored : DEFAULT_MODEL;
  });
  const [skillContext, setSkillContext] = useState(() => localStorage.getItem('skill-context') !== 'false');

  const handlePasswordChange = (pw: string) => {
    setPassword(pw);
    localStorage.setItem('access-password', pw);
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
            password={password}
            model={model}
            onPasswordChange={handlePasswordChange}
            onModelChange={handleModelChange}
          />
          <div className="skill-toggle">
            <label>
              <input
                type="checkbox"
                checked={skillContext}
                onChange={(e) => {
                  setSkillContext(e.target.checked);
                  localStorage.setItem('skill-context', String(e.target.checked));
                }}
              />
              Use SKILLS.md file
            </label>
            <button
              className="skill-view-btn"
              onClick={() => {
                window.open('/api/skill/main', '_blank');
                window.open('/api/skill/provenance', '_blank');
              }}
            >
              View
            </button>
          </div>
          <Chat password={password} model={model} skillContext={skillContext} />
        </div>
      </div>
    </ViewerProvider>
  );
}
