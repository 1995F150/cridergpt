import { Box, Circle, Cylinder, Grid3x3, Move, RotateCw, Scale, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StudioToolbarProps {
  onAddObject: (type: 'box' | 'sphere' | 'cylinder' | 'plane') => void;
  onDeleteSelected: () => void;
  transformMode: 'translate' | 'rotate' | 'scale';
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  hasSelection: boolean;
}

export function StudioToolbar({
  onAddObject,
  onDeleteSelected,
  transformMode,
  onTransformModeChange,
  hasSelection,
}: StudioToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b">
      <TooltipProvider>
        {/* Add Objects */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddObject('box')}
              >
                <Box className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Cube</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddObject('sphere')}
              >
                <Circle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Sphere</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddObject('cylinder')}
              >
                <Cylinder className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Cylinder</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddObject('plane')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Plane</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Transform Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'translate' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onTransformModeChange('translate')}
                disabled={!hasSelection}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move (G)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'rotate' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onTransformModeChange('rotate')}
                disabled={!hasSelection}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate (R)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'scale' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onTransformModeChange('scale')}
                disabled={!hasSelection}
              >
                <Scale className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Scale (S)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteSelected}
              disabled={!hasSelection}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete (X)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
