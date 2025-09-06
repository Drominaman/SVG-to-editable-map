
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
  mode: 'edit' | 'preview';
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


const MapDisplay: React.FC<MapDisplayProps> = ({ svgContent, onRegionSelect, selectedRegionId, customizationData, idChangeOp, globalSettings, mode }) => {
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

  // Effect to setup the SVG DOM, runs only when a new SVG is loaded.
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

    elements.forEach(el => {
      const element = el as SVGElement;
      if (!element.id) {
        element.id = `map-region-${idCounter++}`;
      }
    });
  }, [svgContent]);

  // Effect to manage all event listeners. Re-attaches when interaction logic changes.
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Prevent default behavior of any links within the SVG to stop navigation in the editor
    const links = svg.querySelectorAll('a');
    const preventNavigation = (e: Event) => e.preventDefault();
    links.forEach(link => {
      link.addEventListener('click', preventNavigation);
    });

    const elements = svg.querySelectorAll(CLICKABLE_ELEMENTS.join(', '));

    const handleClick = (e: Event) => {
        e.stopPropagation();
        const target = e.currentTarget as SVGElement;
        
        if (mode === 'edit') {
            onRegionSelect(target.id);
        } else { // Preview Mode
            const data = customizationData[target.id];
            
            if (globalSettings.tooltipTrigger === 'click') {
                if (data?.title || data?.description || data?.tooltipImageSrc) {
                     setActiveTooltip(prev => (prev?.id === target.id && !prev.event) ? null : { id: target.id });
                } else {
                    setActiveTooltip(null);
                }
            }

            if (data?.link) {
                window.open(data.link, '_blank');
            }
        }
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
      el.addEventListener('click', handleClick);
      el.addEventListener('mousemove', handleMouseMove as EventListener);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    const handleContainerClick = (e: MouseEvent) => {
        if (e.target === container || e.target === svg) {
            if (mode === 'edit') {
                onRegionSelect(null);
            } else { // In preview, clicking outside closes click tooltips
                setActiveTooltip(null);
            }
        }
    }

    container.addEventListener('click', handleContainerClick);
    
    return () => {
      elements.forEach(el => {
          el.removeEventListener('click', handleClick);
          el.removeEventListener('mousemove', handleMouseMove as EventListener);
          el.removeEventListener('mouseleave', handleMouseLeave);
      });
      links.forEach(link => {
        link.removeEventListener('click', preventNavigation);
      });
      container.removeEventListener('click', handleContainerClick);
    };
  }, [svgContent, customizationData, onRegionSelect, globalSettings.tooltipTrigger, mode]);


  // This effect translates selectedRegionId into an activeTooltip when in 'click' mode
  useEffect(() => {
    if (mode !== 'edit' || globalSettings.tooltipTrigger !== 'click') {
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
  }, [selectedRegionId, globalSettings.tooltipTrigger, customizationData, mode]);


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

        const isSelected = mode === 'edit' && id === selectedRegionId;

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
        } else {
            element.style.stroke = element.originalStroke;
            element.style.strokeWidth = '1';
        }
        element.style.cursor = 'pointer';
    });

  }, [selectedRegionId, svgContent, globalSettings, mode]);

  // Effect to display region labels inside the editor
  useEffect(() => {
    const svg = svgContainerRef.current?.querySelector('svg');
    if (!svg) return;

    // Clear existing labels first to prevent duplicates on re-render
    svg.querySelectorAll('.editor-region-label').forEach(el => el.remove());

    if (mode !== 'edit' || !globalSettings.showRegionLabels) {
      return;
    }

    const elements = svg.querySelectorAll(CLICKABLE_ELEMENTS.join(', '));
    elements.forEach(el => {
      const element = el as SVGElement;
      const id = element.id;
      if (!id) return;

      const data = customizationData[id];
      const labelText = data?.title || id;

      try {
        const bbox = (element as SVGGraphicsElement).getBBox();
        
        // Don't add labels to empty/zero-size elements
        if (bbox.width > 0 || bbox.height > 0) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(bbox.x + bbox.width / 2));
          text.setAttribute('y', String(bbox.y + bbox.height / 2));
          text.setAttribute('class', 'editor-region-label');
          text.textContent = labelText;

          // Apply styles for visibility. These are robust for most SVG scales.
          Object.assign(text.style, {
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fill: '#FFFFFF',
            fontSize: '10px',
            stroke: 'rgba(0,0,0,0.8)',
            strokeWidth: '0.5px',
            paintOrder: 'stroke',
            pointerEvents: 'none',
            fontFamily: 'sans-serif',
          });
          
          svg.appendChild(text);
        }
      } catch (e) {
        // Getting BBox can fail for non-rendered elements, so we ignore these errors.
      }
    });
  }, [svgContent, customizationData, globalSettings.showRegionLabels, mode]);


  const tooltipData = activeTooltip ? customizationData[activeTooltip.id] : null;
  
  const handleTooltipClose = () => {
      if (mode === 'edit') {
        onRegionSelect(null);
      } else {
        setActiveTooltip(null);
      }
  };


  return (
    <div ref={svgContainerRef} className="w-full h-full max-h-[80vh] aspect-auto relative">
        {activeTooltip && tooltipData && (
            <Tooltip 
                ref={tooltipRef}
                content={tooltipData} 
                settings={globalSettings}
                onClose={globalSettings.tooltipTrigger === 'click' ? handleTooltipClose : undefined}
            />
        )}
    </div>
  );
};

export default MapDisplay;
