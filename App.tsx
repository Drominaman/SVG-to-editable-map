
import React, { useState, useCallback, useEffect } from 'react';
import type { RegionData, GlobalTooltipSettings, IdChangeOp } from './types';
import FileUpload from './components/FileUpload';
import MapDisplay from './components/MapDisplay';
import CustomizationPanel from './components/CustomizationPanel';
import GlobalSettingsModal from './components/GlobalSettingsModal';
import ExportModal from './components/ExportModal';
import { generateEmbedCode } from './services/exportService';
import { HeaderIcon, CodeIcon, UploadIcon, SettingsIcon, MousePointerIcon } from './components/icons';

// Helper to calculate a shade of a color
const adjustColorShade = (hex: string, percent: number): string => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color.split('').map(char => char + char).join('');
  }

  const num = parseInt(color, 16);
  const amount = Math.round(2.55 * percent);

  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};


const App: React.FC = () => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [customizationData, setCustomizationData] = useState<Record<string, RegionData>>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [idChangeOp, setIdChangeOp] = useState<IdChangeOp | null>(null);
  const [globalTooltipSettings, setGlobalTooltipSettings] = useState<GlobalTooltipSettings>({
    tooltipTrigger: 'hover',
    tooltipBackgroundColor: '#111827',
    tooltipTextColor: '#FFFFFF',
    tooltipTitleFontSize: 16,
    tooltipDescriptionFontSize: 14,
    defaultRegionColor: '#FBBF24',
    defaultRegionHoverColor: adjustColorShade('#FBBF24', -10), // Darker shade
  });

  const handleGlobalSettingsChange = (settings: GlobalTooltipSettings) => {
    const newSettings = { ...settings };
    // Always recalculate hover color based on region color for a shade effect.
    newSettings.defaultRegionHoverColor = adjustColorShade(settings.defaultRegionColor, -10); // Darken by 10%
    setGlobalTooltipSettings(newSettings);
  };

  const handleFileLoad = (content: string) => {
    setSvgContent(content);
    setCustomizationData({});
    setSelectedRegionId(null);
  };

  const handleRegionSelect = (id: string | null) => {
    setSelectedRegionId(id);
  };

  const handleDataChange = useCallback((id: string, data: RegionData) => {
    setCustomizationData(prev => ({ ...prev, [id]: data }));
  }, []);

  const handleRegionIdChange = useCallback((oldId: string, newId: string): boolean => {
    const trimmedNewId = newId.trim();
    if (oldId === trimmedNewId) return true;
    if (!trimmedNewId || /\s/.test(trimmedNewId)) {
        alert("Invalid ID format. IDs cannot be empty or contain spaces.");
        return false;
    }

    if (customizationData.hasOwnProperty(trimmedNewId)) {
        alert('This ID is already in use.');
        return false;
    }

    setIdChangeOp({ oldId, newId: trimmedNewId });

    setCustomizationData(prev => {
        const newData = { ...prev };
        const regionInfo = newData[oldId];
        delete newData[oldId];
        if (regionInfo) {
            newData[trimmedNewId] = regionInfo;
        }
        return newData;
    });
    setSelectedRegionId(trimmedNewId);
    return true;
  }, [customizationData]);

  useEffect(() => {
    if (idChangeOp) {
        setIdChangeOp(null);
    }
  }, [idChangeOp]);


  const handleExport = () => {
    if (!svgContent) return;
    const code = generateEmbedCode(svgContent, customizationData, globalTooltipSettings);
    setEmbedCode(code);
    setIsExportModalOpen(true);
  };

  const selectedData = selectedRegionId ? customizationData[selectedRegionId] : undefined;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <HeaderIcon />
          <h1 className="text-xl font-bold text-gray-100">Clickable SVG Map Maker</h1>
        </div>
        <div className="flex items-center gap-4">
          {svgContent && (
            <>
              <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                  <UploadIcon />
                  Change SVG
                  <input type="file" accept=".svg" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => handleFileLoad(ev.target?.result as string);
                          reader.readAsText(file);
                      }
                      e.target.value = ''; // Reset file input
                  }} />
              </label>
              <button
                onClick={() => setIsGlobalSettingsModalOpen(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <SettingsIcon />
                Global Settings
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            disabled={!svgContent}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <CodeIcon />
            Export
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-1">
        {!svgContent ? (
          <div className="flex-grow flex items-center justify-center">
            <FileUpload onFileLoad={handleFileLoad} />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row w-full h-full">
            <div className="flex-grow p-4 md:p-8 flex items-center justify-center bg-gray-900 md:w-2/3">
              <MapDisplay
                svgContent={svgContent}
                onRegionSelect={handleRegionSelect}
                selectedRegionId={selectedRegionId}
                customizationData={customizationData}
                idChangeOp={idChangeOp}
                globalSettings={globalTooltipSettings}
              />
            </div>
            <aside className="w-full md:w-1/3 bg-gray-800 border-l border-gray-700 overflow-y-auto">
              {selectedRegionId ? (
                <CustomizationPanel
                  key={selectedRegionId} // Re-mount component on selection change to reset state
                  selectedRegionId={selectedRegionId}
                  regionData={selectedData}
                  onDataChange={handleDataChange}
                  onIdChange={handleRegionIdChange}
                  existingIds={Object.keys(customizationData)}
                />
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
                    <MousePointerIcon className="mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold text-gray-200">No region selected</h3>
                    <p>Click on a region in the map to start customizing it.</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>

      {isExportModalOpen && (
        <ExportModal code={embedCode} onClose={() => setIsExportModalOpen(false)} />
      )}

      {isGlobalSettingsModalOpen && (
        <GlobalSettingsModal 
            settings={globalTooltipSettings}
            onSettingsChange={handleGlobalSettingsChange}
            onClose={() => setIsGlobalSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
