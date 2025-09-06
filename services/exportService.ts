import type { RegionData, GlobalTooltipSettings } from '../types';

export const generateEmbedCode = (svgContent: string, customizationData: Record<string, RegionData>, globalSettings: GlobalTooltipSettings): string => {
  const cleanCustomizationData = JSON.stringify(customizationData, null, 2);
  const cleanGlobalSettings = JSON.stringify(globalSettings, null, 2);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive SVG Map</title>
    <style>
        body { font-family: sans-serif; margin: 0; padding: 0; }
        #map-container { position: relative; width: 100%; max-width: 900px; margin: 20px auto; }
        #map-container svg { width: 100%; height: auto; display: block; }
        #map-container svg .map-region { cursor: pointer; transition: fill 0.2s ease-in-out; }
        #map-container svg .map-region-text {
            font-family: sans-serif;
            font-size: 10px;
            fill: #000000;
            stroke: white;
            stroke-width: 0.5px;
            paint-order: stroke;
            text-anchor: middle;
            dominant-baseline: central;
            pointer-events: none;
        }
        #map-tooltip { 
            position: absolute; 
            display: none; 
            padding: 10px 15px; 
            border-radius: 5px; 
            z-index: 10; 
            font-size: 14px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
            max-width: 250px;
            pointer-events: none;
            line-height: 1.4;
        }
        #map-tooltip.tooltip-click {
            pointer-events: auto;
        }
        #map-tooltip img { max-width: 100%; height: auto; margin-bottom: 8px; border-radius: 3px; }
        #map-tooltip h3 { margin: 0 0 5px 0; font-weight: bold; }
        #map-tooltip p { margin: 0; }
        #map-tooltip-close { 
            position: absolute;
            top: 5px;
            right: 5px;
            width: 18px;
            height: 18px;
            padding: 0;
            border: none;
            background: transparent;
            cursor: pointer;
            color: inherit;
            font-size: 20px;
            line-height: 1;
            display: none; /* Hidden by default */
        }
    </style>
</head>
<body>

    <div id="map-container"></div>
    <div id="map-tooltip">
        <button id="map-tooltip-close" aria-label="Close tooltip">&times;</button>
        <div id="map-tooltip-content"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const mapContainer = document.getElementById('map-container');
            const tooltip = document.getElementById('map-tooltip');
            const tooltipContent = document.getElementById('map-tooltip-content');
            const tooltipClose = document.getElementById('map-tooltip-close');
            const svgContent = \`${svgContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/script>/gi, '<\\/script>')}\`;
            const customizationData = ${cleanCustomizationData};
            const globalSettings = ${cleanGlobalSettings};

            mapContainer.innerHTML = svgContent;
            const svg = mapContainer.querySelector('svg');
            if (!svg) { console.error("SVG element not found!"); return; }

            const clickableElements = ['path', 'g', 'rect', 'circle', 'polygon', 'ellipse'];
            const allRegions = svg.querySelectorAll(clickableElements.join(','));
            let idCounter = 0;
            let activeClickRegionId = null;

            function hideTooltip() {
                tooltip.style.display = 'none';
                activeClickRegionId = null;
                tooltip.classList.remove('tooltip-click');
            }

            tooltipClose.addEventListener('click', hideTooltip);
            svg.addEventListener('click', (e) => {
                if(e.target === svg) hideTooltip();
            });

            allRegions.forEach(region => {
                if (!region.id) region.id = \`map-region-\${idCounter++}\`;
                
                const regionId = region.id;
                const data = customizationData[regionId];

                // Only make regions with data interactive
                if (data) {
                    region.classList.add('map-region');
                    region.style.fill = globalSettings.defaultRegionColor || 'none';
                    const trigger = globalSettings.tooltipTrigger || 'hover';

                    if(trigger === 'click') {
                        region.addEventListener('click', (e) => {
                            e.stopPropagation();

                            let contentHTML = '';
                            if (data.tooltipImageSrc) contentHTML += \`<img src="\${data.tooltipImageSrc}" alt="\${data.title || ''}">\`;
                            if (data.title) contentHTML += \`<h3 style="font-size:\${globalSettings.tooltipTitleFontSize || 16}px;">\${data.title}</h3>\`;
                            if (data.description) contentHTML += \`<p style="font-size:\${globalSettings.tooltipDescriptionFontSize || 14}px;">\${data.description}</p>\`;
                            
                            if (!contentHTML.trim()) return;

                            if (activeClickRegionId === regionId) {
                                hideTooltip();
                                return;
                            }
                            
                            activeClickRegionId = regionId;
                            tooltip.classList.add('tooltip-click');
                            tooltipClose.style.display = 'block';
                            
                            tooltipContent.innerHTML = contentHTML;

                            tooltip.style.backgroundColor = globalSettings.tooltipBackgroundColor || 'rgba(0,0,0,0.8)';
                            tooltip.style.color = globalSettings.tooltipTextColor || '#fff';
                            tooltipClose.style.color = globalSettings.tooltipTextColor || '#fff';

                            const bbox = region.getBBox();
                            const svgRect = svg.getBoundingClientRect();
                            const containerRect = mapContainer.getBoundingClientRect();
                            const scaleX = svgRect.width / svg.viewBox.baseVal.width;
                            const scaleY = svgRect.height / svg.viewBox.baseVal.height;
                            
                            const x = svgRect.left - containerRect.left + (bbox.x + bbox.width / 2) * scaleX;
                            const y = svgRect.top - containerRect.top + (bbox.y + bbox.height / 2) * scaleY;
                            
                            tooltip.style.display = 'block';
                            let left = x - tooltip.offsetWidth / 2;
                            let top = y - tooltip.offsetHeight - 10;
                            
                            if(top < containerRect.top) top = y + bbox.height/2 * scaleY + 10;
                            if(left < 0) left = 10;
                            if(left + tooltip.offsetWidth > containerRect.width) left = containerRect.width - tooltip.offsetWidth - 10;

                            tooltip.style.left = left + 'px';
                            tooltip.style.top = top + 'px';

                            if(data.link) {
                                tooltip.style.cursor = 'pointer';
                                tooltip.onclick = () => window.open(data.link, '_blank');
                            } else {
                                tooltip.style.cursor = 'default';
                                tooltip.onclick = null;
                            }
                        });
                    } else { // Hover trigger
                        region.addEventListener('mousemove', (e) => {
                            if (activeClickRegionId) return;
                            
                            let contentHTML = '';
                            if (data.tooltipImageSrc) contentHTML += \`<img src="\${data.tooltipImageSrc}" alt="\${data.title || ''}">\`;
                            if (data.title) contentHTML += \`<h3 style="font-size:\${globalSettings.tooltipTitleFontSize || 16}px;">\${data.title}</h3>\`;
                            if (data.description) contentHTML += \`<p style="font-size:\${globalSettings.tooltipDescriptionFontSize || 14}px;">\${data.description}</p>\`;
                            
                            if (!contentHTML.trim()) return;

                            tooltip.classList.remove('tooltip-click');
                            tooltipClose.style.display = 'none';
                            tooltip.style.cursor = 'default';
                            tooltip.onclick = null;

                            tooltipContent.innerHTML = contentHTML;
                            tooltip.style.backgroundColor = globalSettings.tooltipBackgroundColor || 'rgba(0,0,0,0.8)';
                            tooltip.style.color = globalSettings.tooltipTextColor || '#fff';

                            tooltip.style.display = 'block';
                            const containerRect = mapContainer.getBoundingClientRect();
                            let left = e.pageX - containerRect.left + 15;
                            let top = e.pageY - containerRect.top + 15;

                            if (left + tooltip.offsetWidth > containerRect.width) {
                                left = e.pageX - containerRect.left - tooltip.offsetWidth - 15;
                            }
                            if (top + tooltip.offsetHeight > containerRect.height) {
                                top = e.pageY - containerRect.top - tooltip.offsetHeight - 15;
                            }

                            tooltip.style.left = left + 'px';
                            tooltip.style.top = top + 'px';
                        });
                        
                        region.addEventListener('mouseleave', () => {
                            if (!activeClickRegionId) tooltip.style.display = 'none';
                        });
                        
                        region.addEventListener('click', (e) => {
                            if (data && data.link) window.open(data.link, '_blank');
                        });
                    }

                    region.addEventListener('mouseenter', () => {
                        region.style.fill = globalSettings.defaultRegionHoverColor;
                    });

                    region.addEventListener('mouseleave', () => {
                        region.style.fill = globalSettings.defaultRegionColor;
                    });
                }
            });

            // Add titles on top of regions
            Object.keys(customizationData).forEach(regionId => {
                const data = customizationData[regionId];
                if (data && data.title) {
                    // FIX: Escaped the backtick character in the regex. Since this script is inside a template literal,
                    // the unescaped backtick was breaking the string, causing a syntax error and leading to
                    // multiple follow-on errors about variables not being defined.
                    const escapedId = regionId.replace(/([!"#$%&'()*+,./:;<=>?@[\]^\\\`{|}~])/g, '\\\\$1');
                    try {
                        const region = svg.querySelector('#' + escapedId);
                        if (region) {
                            const bbox = region.getBBox();
                            if (bbox.width > 0 || bbox.height > 0) {
                                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                text.setAttribute('x', String(bbox.x + bbox.width / 2));
                                text.setAttribute('y', String(bbox.y + bbox.height / 2));
                                text.setAttribute('class', 'map-region-text');
                                text.textContent = data.title;
                                svg.appendChild(text);
                            }
                        }
                    } catch (e) {
                        console.warn('Could not add title for region #' + regionId, e);
                    }
                }
            });
        });
    </script>

</body>
</html>
`;
};
