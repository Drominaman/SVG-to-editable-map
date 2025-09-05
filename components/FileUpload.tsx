
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onFileLoad: (content: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null) => {
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileLoad(e.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid SVG file.');
    }
  }, [onFileLoad]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = ''; // Reset to allow re-uploading the same file
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full max-w-2xl p-10 border-4 border-dashed rounded-2xl text-center transition-all duration-300 ${isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 hover:border-gray-500'}`}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="text-indigo-400">
            <UploadIcon width="64" height="64" />
        </div>
        <h2 className="text-2xl font-bold text-gray-200">Upload your SVG map</h2>
        <p className="text-gray-400">Drag & drop your file here or click to browse</p>
        <label className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg cursor-pointer transition-colors">
          Browse File
          <input type="file" accept=".svg" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
    </div>
  );
};

export default FileUpload;
