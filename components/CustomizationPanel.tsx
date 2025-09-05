import React, { useState, useEffect } from 'react';
import type { RegionData } from '../types';
import { InfoIcon, LinkIcon, TitleIcon, IdCardIcon, ImageIcon, TrashIcon } from './icons';

interface CustomizationPanelProps {
  selectedRegionId: string;
  regionData?: RegionData;
  onDataChange: (id: string, data: RegionData) => void;
  onIdChange: (oldId: string, newId: string) => boolean;
  existingIds: string[];
}

const InputField: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; type?: string; placeholder?: string; icon?: React.ReactNode; isTextArea?: boolean; min?: number; max?: number; step?: number; }> = ({ label, value, onChange, type = 'text', placeholder, icon, isTextArea = false, ...props }) => {
  const InputComponent = isTextArea ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <InputComponent
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={isTextArea ? 3 : undefined}
          {...props}
        />
      </div>
    </div>
  );
};

const CustomizationPanel: React.FC<CustomizationPanelProps> = ({ selectedRegionId, regionData, onDataChange, onIdChange, existingIds }) => {
  const [data, setData] = useState<RegionData>({
    title: '', description: '', link: '',
    tooltipImageSrc: '',
  });
  const [currentId, setCurrentId] = useState(selectedRegionId);
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    const defaultData: RegionData = { 
      title: '', description: '', link: '',
      tooltipImageSrc: '',
    };
    
    const initialData = regionData ? { ...defaultData, ...regionData } : defaultData;
    setData(initialData);
    
    if (!regionData) {
      onDataChange(selectedRegionId, initialData);
    }

    setCurrentId(selectedRegionId);
    setIdError(null);
  }, [regionData, selectedRegionId, onDataChange]);

  const handleChange = (field: keyof RegionData, value: string | number) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onDataChange(selectedRegionId, newData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleChange('tooltipImageSrc', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    setCurrentId(newId);
    if (!newId.trim()) setIdError('ID cannot be empty.');
    else if (/\s/.test(newId)) setIdError('ID cannot contain spaces.');
    else if (existingIds.includes(newId) && newId !== selectedRegionId) setIdError('This ID is already in use.');
    else setIdError(null);
  };

  const handleIdInputBlur = () => {
    if (idError || currentId === selectedRegionId) return;
    if (!onIdChange(selectedRegionId, currentId.trim())) {
        setCurrentId(selectedRegionId);
        setIdError('An error occurred. The ID might already be in use.');
        setTimeout(() => setIdError(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 truncate" title={data.title || selectedRegionId}>{data.title || 'Customize Region'}</h2>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2" htmlFor="region-id-input"><IdCardIcon />Region ID</label>
        <input id="region-id-input" type="text" value={currentId} onChange={handleIdInputChange} onBlur={handleIdInputBlur} aria-invalid={!!idError} aria-describedby={idError ? "id-error" : undefined} className={`w-full bg-gray-700 border rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${idError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'}`} />
        {idError && <p id="id-error" className="mt-2 text-sm text-red-400">{idError}</p>}
      </div>
      <div className="border-t border-gray-700 my-6"></div>
      <div className="space-y-4 flex-grow overflow-y-auto pr-2">
        <details open className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <summary className="font-semibold text-lg cursor-pointer">Tooltip Content</summary>
            <div className="mt-4 space-y-4">
                <InputField label="Title" value={data.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., California" icon={<TitleIcon />} />
                <InputField label="Description" value={data.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="A short description for the tooltip." icon={<InfoIcon />} isTextArea={true} />
                <InputField label="Link URL" value={data.link} onChange={(e) => handleChange('link', e.target.value)} placeholder="https://example.com" icon={<LinkIcon />} />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><ImageIcon />Tooltip Image</label>
                     <label className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md py-2 px-3 text-white flex items-center justify-center gap-2 cursor-pointer">
                        <ImageIcon />
                        <span>{data.tooltipImageSrc ? 'Change' : 'Upload'} Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {data.tooltipImageSrc && (
                        <div className="mt-2 relative group">
                            <img src={data.tooltipImageSrc} alt="Tooltip preview" className="w-full h-32 object-cover rounded-md" />
                            <button onClick={() => handleChange('tooltipImageSrc', '')} className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </details>
      </div>
    </div>
  );
};

export default CustomizationPanel;