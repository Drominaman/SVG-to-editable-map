import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { RegionData, GlobalTooltipSettings, IdChangeOp } from '../types';
import { CloseIcon } from './icons';

interface MapDisplayProps {
  svgContent: string;
  onRegionSelect: (id: string | null) => void;
  selectedRegionId: string | null;
  customizationData: Record<string, RegionData>;
  idChangeOp: IdChangeOp | null;
  globalSettings: GlobalTooltipSettings;
}

const CLICKABLE_ELEMENTS = ['path', 'g', 'rect', 'circle', 'polygon', 'ellipse'];

// Tooltip sub-component
const Tooltip: React.FC<{
    content: RegionData;
    settings: GlobalTooltipSettings;
    position: { x: number; y: number };
    onClose?: () => void;
}> = ({ content, settings, position, onClose }) => {
    const titleStyle = {
        fontSize: `${settings.tooltipTitleFontSize}px`,
        color: settings.tooltipTextColor,
    };
    const descriptionStyle = {
        fontSize: `${settings.tooltipDescriptionFontSize}px`,
        color: settings.tooltipTextColor,
    };
    const containerStyle = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: settings.tooltipBackgroundColor,
    };

    return (
        <div 
            className="absolute p-3 rounded-md shadow-lg pointer-events-none z-30 max-w-xs transition-opacity"
            style={containerStyle}
        >
             {settings.tooltipTrigger === 'click' && onClose && (
                <button 
                    onClick={onClose} 
                    className="absolute top-1 right-1 pointer-events-auto"
                    aria-label="Close tooltip"
                    style={{ color: settings.tooltipTextColor }}
                >
                    <CloseIcon width={16} height={16} />
                </button>
            )}
            {content.tooltipImageSrc && (
                <img src={content.tooltipImageSrc} alt={content.title} className="max-w-full h-auto mb-2 rounded" />
            )}
            {content.title && <h3 className="font-bold m-0" style={titleStyle}>{content.title}</h3>}
            {content.description && <p className="m-0 mt-1" style={descriptionStyle}>{content.description}</p>}
        </div>
    );
};


const MapDisplay: React.FC<MapDisplayProps> = ({ svgContent, onRegionSelect, selectedRegionId, customizationData, idChangeOp, globalSettings }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; position: { x: number, y: number } } | null>(null);
  
  useLayoutEffect(() => {
    const container = svgContainerRef.current;
    if (idChangeOp && container) {
        const escapedOldId = idChangeOp.oldId.replace(/([!"#$%&'()*+,./:;<=>?@[\]^\\`{|}~])/g, '\\\\$1');
        try {
            const element = container.querySelector(`#${escapedOldId}`);
            if (element) {
                element.id = idChangeOp.newId;
            }
        } catch (e) {
            console.error("Failed to query selector with escaped ID:", escapedOldId, e);
        }
    }
  }, [idChangeOp]);


  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;
    
    container.innerHTML = svgContent;
    const svg = container.querySelector('svg');
    if (!svg) return;

    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    let idCounter = 0;
    const elements = svg.querySelectorAll(CLICKABLE_ELEMENTS.join(', '));

    const handleClick = (e: Event) => {
        e.stopPropagation();
        const target = e.currentTarget as SVGElement;
        onRegionSelect(target.id);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        const target = e.currentTarget as SVGElement;
        if(globalSettings.tooltipTrigger !== 'click') {
           const data = customizationData[target.id];
           if (data?.title || data?.description || data?.tooltipImageSrc) {
               setActiveTooltip({ id: target.id, position: { x: e.clientX + 15, y: e.clientY + 15 }});
           }
        }
    };
    
    const handleMouseLeave = () => {
        setActiveTooltip(prev => {
            if (!prev) return null;
            return globalSettings.tooltipTrigger === 'click' ? prev : null;
        });
    };

    elements.forEach(el => {
      const element = el as SVGElement;
      if (!element.id) {
        element.id = `map-region-${idCounter++}`;
      }
      
      element.removeEventListener('click', handleClick);
      element.addEventListener('click', handleClick);
      element.removeEventListener('mousemove', handleMouseMove as EventListener);
      element.addEventListener('mousemove', handleMouseMove as EventListener);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.addEventListener('mouseleave', handleMouseLeave);
    });

    const handleContainerClick = (e: MouseEvent) => {
        if (e.target === container || e.target === svg) {
            onRegionSelect(null);
        }
    }

    container.addEventListener('click', handleContainerClick);
    
    return () => {
      elements.forEach(el => {
          el.removeEventListener('click', handleClick);
          el.removeEventListener('mousemove', handleMouseMove as EventListener);
          el.removeEventListener('mouseleave', handleMouseLeave);
      });
      container.removeEventListener('click', handleContainerClick);
    };
  }, [svgContent, customizationData, onRegionSelect, globalSettings.tooltipTrigger]);


  useEffect(() => {
    // Manage 'click' tooltips based on selectedRegionId
    if (selectedRegionId) {
        if (globalSettings.tooltipTrigger === 'click') {
            const data = customizationData[selectedRegionId];
            if (!data || (!data.title && !data.description && !data.tooltipImageSrc)) {
                onRegionSelect(null); // Deselect if no content to show
                return;
            };

            const containerRect = svgContainerRef.current?.getBoundingClientRect();
            const element = svgContainerRef.current?.querySelector(`#${selectedRegionId.replace(/([!"#$%&'()*+,./:;<=>?@[\]^\\`{|}~])/g, '\\\\$1')}`);
            if(element && containerRect) {
                const bbox = (element as SVGGraphicsElement).getBBox();
                const svg = svgContainerRef.current?.querySelector('svg');
                const svgRect = svg?.getBoundingClientRect();
                if(svgRect) {
                    const scaleX = svgRect.width / svg.viewBox.baseVal.width;
                    const scaleY = svgRect.height / svg.viewBox.baseVal.height;
                    const x = svgRect.left - containerRect.left + (bbox.x + bbox.width / 2) * scaleX;
                    const y = svgRect.top - containerRect.top + (bbox.y + bbox.height / 2) * scaleY;
                    setActiveTooltip({ id: selectedRegionId, position: {x, y}});
                }
            }
        } else {
             setActiveTooltip(prev => prev?.id === selectedRegionId ? null : prev);
        }
    } else {
        setActiveTooltip(prev => {
            if (!prev) return null;
            return globalSettings.tooltipTrigger === 'click' ? null : prev;
        });
    }
  }, [selectedRegionId, customizationData, globalSettings.tooltipTrigger, onRegionSelect]);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;
    
    const elements = container.querySelectorAll(CLICKABLE_ELEMENTS.join(', '));
    elements.forEach(el => {
        const element = el as SVGElement & { originalFill?: string, originalStroke?: string };
        const id = element.id;

        if (element.originalStroke === undefined) {
          element.originalStroke = element.style.stroke || element.getAttribute('stroke') || 'none';
        }

        const isSelected = id === selectedRegionId;

        element.style.fill = globalSettings.defaultRegionColor;

        const applyHover = () => {
            element.style.fill = globalSettings.defaultRegionHoverColor;
        };
        const removeHover = () => {
            element.style.fill = globalSettings.defaultRegionColor;
        };
        element.removeEventListener('mouseenter', applyHover);
        element.removeEventListener('mouseleave', removeHover);
        element.addEventListener('mouseenter', applyHover);
        element.addEventListener('mouseleave', removeHover);

        if (isSelected) {
            element.style.stroke = '#3b82f6';
            element.style.strokeWidth = '2px';
            element.style.cursor = 'pointer';
        } else {
            element.style.stroke = element.originalStroke;
            element.style.strokeWidth = '1';
            element.style.cursor = 'pointer';
        }
    });

  }, [selectedRegionId, svgContent, globalSettings]);

  const tooltipData = activeTooltip ? customizationData[activeTooltip.id] : null;

  return (
    <div ref={svgContainerRef} className="w-full h-full max-h-[80vh] aspect-auto relative">
        {activeTooltip && tooltipData && (
            <Tooltip 
                content={tooltipData} 
                settings={globalSettings}
                position={activeTooltip.position} 
                onClose={globalSettings.tooltipTrigger === 'click' ? () => onRegionSelect(null) : undefined}
            />
        )}
    </div>
  );
};

export default MapDisplay;