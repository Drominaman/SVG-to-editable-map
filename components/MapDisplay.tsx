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

// Tooltip sub-component, now using forwardRef to get its DOM element for measurements
const Tooltip = React.forwardRef<HTMLDivElement, {
    content: RegionData;
    settings: GlobalTooltipSettings;
    onClose?: () => void;
}>(({ content, settings, onClose }, ref) => {
    const titleStyle = {
        fontSize: `${settings.tooltipTitleFontSize}px`,
        color: settings.tooltipTextColor,
    };
    const descriptionStyle = {
        fontSize: `${settings.tooltipDescriptionFontSize}px`,
        color: settings.tooltipTextColor,
    };
    const containerStyle = {
        backgroundColor: settings.tooltipBackgroundColor,
    };

    return (
        <div 
            ref={ref}
            className="absolute p-3 rounded-md shadow-lg z-30 max-w-xs transition-all duration-200 ease-in-out opacity-0 pointer-events-none"
            style={containerStyle}
        >
             {settings.tooltipTrigger === 'click' && onClose && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
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
});
Tooltip.displayName = 'Tooltip';


const MapDisplay: React.FC<MapDisplayProps> = ({ svgContent, onRegionSelect, selectedRegionId, customizationData, idChangeOp, globalSettings }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ 
      id: string;
      event?: { clientX: number, clientY: number } 
  } | null>(null);
  
  useLayoutEffect(() => {
    const container = svgContainerRef.current;
    if (idChangeOp && container) {
        const escapedOldId = idChangeOp.oldId.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
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
        if(globalSettings.tooltipTrigger === 'hover') {
           const data = customizationData[target.id];
           if (data?.title || data?.description || data?.tooltipImageSrc) {
               setActiveTooltip({ id: target.id, event: { clientX: e.clientX, clientY: e.clientY }});
           }
        }
    };
    
    const handleMouseLeave = () => {
        if(globalSettings.tooltipTrigger === 'hover') {
            setActiveTooltip(null);
        }
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


  // This effect translates selectedRegionId into an activeTooltip when in 'click' mode
  useEffect(() => {
    if (globalSettings.tooltipTrigger !== 'click') {
        if (activeTooltip && !activeTooltip.event) { // Clear lingering click tooltips if mode changes
            setActiveTooltip(null);
        }
        return;
    }

    if (selectedRegionId) {
        const data = customizationData[selectedRegionId];
        if (data && (data.title || data.description || data.tooltipImageSrc)) {
            setActiveTooltip({ id: selectedRegionId });
        } else {
            setActiveTooltip(null);
        }
    } else {
        setActiveTooltip(null);
    }
  }, [selectedRegionId, globalSettings.tooltipTrigger, customizationData]);


  // This effect handles positioning the tooltip to ensure it's always visible.
  useLayoutEffect(() => {
    const tooltipEl = tooltipRef.current;
    const containerEl = svgContainerRef.current;

    if (!activeTooltip || !tooltipEl || !containerEl) {
        if (tooltipEl) tooltipEl.style.opacity = '0';
        return;
    }

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    
    let top = 0;
    let left = 0;

    if (globalSettings.tooltipTrigger === 'hover' && activeTooltip.event) {
        const { clientX, clientY } = activeTooltip.event;
        const offsetX = 15;

        left = clientX + offsetX;
        if (left + tooltipRect.width > window.innerWidth) {
            left = clientX - tooltipRect.width - offsetX;
        }

        top = clientY + offsetX;
        if (top + tooltipRect.height > window.innerHeight) {
            top = clientY - tooltipRect.height - offsetX;
        }
        
        left -= containerRect.left;
        top -= containerRect.top;

    } else if (globalSettings.tooltipTrigger === 'click') {
        const escapedId = activeTooltip.id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
        const element = containerEl.querySelector(`#${escapedId}`);
        const svg = containerEl.querySelector('svg');

        if (element && svg) {
            const bbox = (element as SVGGraphicsElement).getBBox();
            const svgRect = svg.getBoundingClientRect();
            
            if(svg.viewBox.baseVal.width > 0) {
                const scaleX = svgRect.width / svg.viewBox.baseVal.width;
                const scaleY = svgRect.height / svg.viewBox.baseVal.height;
                
                const elementCenterX = (svgRect.left - containerRect.left) + (bbox.x + bbox.width / 2) * scaleX;
                const elementTopY = (svgRect.top - containerRect.top) + bbox.y * scaleY;
                const elementBottomY = (svgRect.top - containerRect.top) + (bbox.y + bbox.height) * scaleY;
                
                const offset = 10;

                top = elementTopY - tooltipRect.height - offset;
                if (top < 0) {
                    top = elementBottomY + offset;
                }

                left = elementCenterX - tooltipRect.width / 2;
                if (left < 0) left = offset;
                if (left + tooltipRect.width > containerRect.width) {
                    left = containerRect.width - tooltipRect.width - offset;
                }
            }
        }
    }
    
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.opacity = '1';

  }, [activeTooltip, globalSettings.tooltipTrigger, customizationData]);


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
                ref={tooltipRef}
                content={tooltipData} 
                settings={globalSettings}
                onClose={globalSettings.tooltipTrigger === 'click' ? () => onRegionSelect(null) : undefined}
            />
        )}
    </div>
  );
};

export default MapDisplay;