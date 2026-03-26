import { useState } from 'react';
import { CURATED_MODELS } from '../lib/types.js';

interface Props {
  apiKey: string;
  model: string;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  budget: 'Budget',
  mid: 'Mid-tier',
  premium: 'Premium',
};

export function ModelPicker({ apiKey, model, onApiKeyChange, onModelChange }: Props) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="model-picker">
      <div className="model-picker-row">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="OpenRouter API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="api-key-input"
        />
        <button
          onClick={() => setShowKey(!showKey)}
          className="toggle-key-btn"
          title={showKey ? 'Hide key' : 'Show key'}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="model-picker-row">
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="model-select"
        >
          {Object.entries(TIER_LABELS).map(([tier, label]) => (
            <optgroup key={tier} label={label}>
              {CURATED_MODELS.filter((m) => m.tier === tier).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}
