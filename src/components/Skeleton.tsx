import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
    const baseClass = "shimmer-sweep bg-[#EFE9E1]";
    const variantClass = {
        text: "h-4 w-full rounded",
        rect: "rounded-2xl",
        circle: "rounded-full"
    };

    return (
        <div className={`${baseClass} ${variantClass[variant]} ${className}`} />
    );
};

export const PropertyCardSkeleton = () => (
    <div className="bg-white rounded-[2rem] shadow-card overflow-hidden">
        <Skeleton className="h-80 w-full" />
        <div className="p-5 space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-20 ml-auto" />
                </div>
            </div>
        </div>
    </div>
);

export const PropertyDetailsSkeleton = () => (
    <div className="bg-[#FDFCFB] min-h-screen">
        <Skeleton className="w-full h-[60vh] md:h-[75vh] rounded-b-[3.5rem]" />
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
                <Skeleton className="h-40 w-full rounded-3xl" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
            </div>
        </div>
    </div>
);

export const BookingSkeleton = () => (
    <div className="fixed inset-0 bg-sand flex justify-center items-end sm:items-center p-0 sm:p-4">
        <div className="bg-white/80 backdrop-blur-xl w-full max-w-2xl h-full sm:h-[90vh] sm:rounded-[3rem] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-8 py-6 flex items-center justify-between border-b border-black/5">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-40" />
                </div>
                <div className="w-12"></div>
            </div>
            <div className="flex-1 p-8 space-y-10">
                <div className="flex gap-6 p-6 bg-white rounded-[2.5rem]">
                    <Skeleton className="w-24 h-24 rounded-[1.8rem]" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-1/3 mt-2" />
                    </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-32 w-full rounded-[2.5rem]" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-14 w-full rounded-[2rem]" />
                    <Skeleton className="h-24 w-full rounded-[2.5rem]" />
                </div>
            </div>
        </div>
    </div>
);

export default Skeleton;
