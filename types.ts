
export type IdChangeOp = {
  oldId: string;
  newId: string;
};

export interface GlobalTooltipSettings {
  tooltipTrigger: 'hover' | 'click';
  tooltipBackgroundColor: string;
  tooltipTextColor: string;
  tooltipTitleFontSize: number;
  tooltipDescriptionFontSize: number;

  // Global region colors
  defaultRegionColor: string;
  defaultRegionHoverColor: string;
}

export interface RegionData {
  title: string;
  description: string;
  link: string;
  
  // Only image is per-region now
  tooltipImageSrc?: string; // base64 data URL
}