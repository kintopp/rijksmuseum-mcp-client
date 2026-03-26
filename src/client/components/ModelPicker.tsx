import { useState } from 'react';
import { AVAILABLE_MODELS } from '../lib/types.js';

interface Props {
  password: string;
  model: string;
  onPasswordChange: (password: string) => void;
  onModelChange: (model: string) => void;
}

const VALID_PASSWORD = 'sk-c-5';

export function ModelPicker({ password, model, onPasswordChange, onModelChange }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const isValid = password.toLowerCase() === VALID_PASSWORD;

  return (
    <div className="model-picker">
      <div className="model-picker-row">
        <input
          type="password"
          placeholder="Enter access password"
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
            setSubmitted(false);
          }}
          onBlur={() => { if (password) setSubmitted(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') setSubmitted(true); }}
          className="api-key-input"
        />
        {submitted && (
          <span className={`password-feedback ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? 'Access granted' : 'Wrong password'}
          </span>
        )}
      </div>
      <div className="model-picker-row">
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="model-select"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
