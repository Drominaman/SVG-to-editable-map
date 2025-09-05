
import React, { useState } from 'react';
import { ClipboardCheckIcon, ClipboardIcon, CloseIcon } from './icons';

interface ExportModalProps {
  code: string;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ code, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Embed Code</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
          <p className="text-gray-300 mb-4">Copy and paste this code into your HTML file to embed the interactive map.</p>
          <div className="relative">
            <textarea
              readOnly
              value={code}
              className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-gray-200 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 bg-gray-700 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded-md transition-all text-xs flex items-center gap-2"
            >
              {copied ? <ClipboardCheckIcon /> : <ClipboardIcon />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
