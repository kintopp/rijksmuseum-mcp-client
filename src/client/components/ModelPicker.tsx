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
  const [customModel, setCustomModel] = useState('');

  const isCurated = CURATED_MODELS.some((m) => m.id === model);
  const showCustomInput = !isCurated && customModel !== '';

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
        {showCustomInput ? (
          <input
            type="text"
            placeholder="e.g. openai/gpt-5.4"
            value={customModel}
            onChange={(e) => {
              setCustomModel(e.target.value);
              onModelChange(e.target.value);
            }}
            className="custom-model-input"
          />
        ) : (
          <select
            value={isCurated ? model : ''}
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
        )}
        <button
          onClick={() => {
            if (showCustomInput) {
              // Switch back to dropdown — pick first curated model
              setCustomModel('');
              onModelChange(CURATED_MODELS[0].id);
            } else {
              setCustomModel(model);
              onModelChange(model);
            }
          }}
          className="toggle-custom-btn"
          title={showCustomInput ? 'Use dropdown' : 'Enter custom model ID'}
        >
          {showCustomInput ? 'List' : 'Custom'}
        </button>
      </div>
    </div>
  );
}
