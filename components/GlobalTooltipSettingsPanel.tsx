import React from 'react';
import type { GlobalTooltipSettings } from '../types';

interface GlobalTooltipSettingsPanelProps {
  settings: GlobalTooltipSettings;
  onSettingsChange: (settings: GlobalTooltipSettings) => void;
}

const InputField: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; min?: number; }> = ({ label, value, onChange, type = 'text', ...props }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          {...props}
        />
      </div>
    </div>
  );
};

const GlobalTooltipSettingsPanel: React.FC<GlobalTooltipSettingsPanelProps> = ({ settings, onSettingsChange }) => {
    
  const handleChange = (field: keyof GlobalTooltipSettings, value: string | number) => {
    const newSettings = { ...settings, [field]: value };
    onSettingsChange(newSettings);
  };

  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Global Tooltip Settings</h2>
      <div className="space-y-4 flex-grow overflow-y-auto pr-2">

        <details open className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <summary className="font-semibold text-lg cursor-pointer">Tooltip Style</summary>
            <div className="mt-4 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <InputField label="Background" type="color" value={settings.tooltipBackgroundColor} onChange={(e) => handleChange('tooltipBackgroundColor', e.target.value)} />
                    <InputField label="Text Color" type="color" value={settings.tooltipTextColor} onChange={(e) => handleChange('tooltipTextColor', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Title Font Size (px)" type="number" min={8} value={settings.tooltipTitleFontSize} onChange={(e) => handleChange('tooltipTitleFontSize', parseInt(e.target.value, 10) || 16)} />
                    <InputField label="Desc. Font Size (px)" type="number" min={8} value={settings.tooltipDescriptionFontSize} onChange={(e) => handleChange('tooltipDescriptionFontSize', parseInt(e.target.value, 10) || 14)} />
                </div>
            </div>
        </details>

        <details open className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <summary className="font-semibold text-lg cursor-pointer">Tooltip Behavior</summary>
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Trigger</label>
                <div className="flex gap-4 rounded-md bg-gray-700 p-1">
                    <button onClick={() => handleChange('tooltipTrigger', 'hover')} className={`w-full py-1 rounded transition-colors ${settings.tooltipTrigger !== 'click' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>On Hover</button>
                    <button onClick={() => handleChange('tooltipTrigger', 'click')} className={`w-full py-1 rounded transition-colors ${settings.tooltipTrigger === 'click' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>On Click</button>
                </div>
            </div>
        </details>
      </div>
    </div>
  );
};

export default GlobalTooltipSettingsPanel;
