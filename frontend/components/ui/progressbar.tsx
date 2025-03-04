import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import {cn} from '@/lib/utils'

interface ProgressBarProps {
    progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    return (
        <div className={cn("flex justify-center items-center h-full")}>
            <ProgressPrimitive.Root className="relative overflow-hidden bg-gray-200 rounded-full w-1/2 h-4">
                <ProgressPrimitive.Indicator
                    className="bg-gray-500 h-full transition-transform duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                />
            </ProgressPrimitive.Root>
        </div>
    );
};


export default ProgressBar;