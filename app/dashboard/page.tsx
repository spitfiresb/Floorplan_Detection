"use client";

import { useState } from "react";
import Link from "next/link";
import UploadZone from "@/components/floorplan/UploadZone";
import ResultViewer, { Prediction } from "@/components/floorplan/ResultViewer";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface DetectionResult {
    predictions: Prediction[];
    image: {
        width: number;
        height: number;
    }
}

const BackButton = ({ onClick, href }: { onClick?: () => void, href?: string }) => {
    const className = "fixed top-0 left-0 z-50 m-0 inline-flex items-center justify-center p-4 text-white/50 hover:text-white hover:bg-blue-600 transition-all duration-200 ease-out hover:translate-x-1 hover:-translate-y-1";

    if (href) {
        return (
            <Link href={href} className={className}>
                <ArrowLeft className="w-8 h-8" />
            </Link>
        )
    }

    return (
        <button onClick={onClick} className={className}>
            <ArrowLeft className="w-8 h-8" />
        </button>
    )
}

export default function DashboardPage() {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resizeImage = (file: File, maxDimension: number = 1024): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas to Blob failed"));
                        return;
                    }
                    const resizedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                }, file.type);
            };
            img.onerror = (error) => reject(error);
        });
    };

    const handleFileSelect = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        setImageSrc(null); // Clear previous image
        setResult(null);

        try {
            // Resize image
            const resizedFile = await resizeImage(file, 1024);

            // Create local preview from resized file
            const objectUrl = URL.createObjectURL(resizedFile);
            setImageSrc(objectUrl);

            // Create FormData
            const formData = new FormData();
            formData.append("file", resizedFile);

            // Call API
            const response = await fetch("/api/detect", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to process image");
            }

            const data = await response.json();
            setResult(data);

        } catch (err) {
            console.error(err);
            setError("Failed to analyze image. Please check your API key and try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setImageSrc(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="space-y-6">

            {/* Header / Breadcrumbs */}


            {/* Main Content Area */}
            <div className={`transition-all duration-500
                {(imageSrc || result)
                    ? "fixed inset-0 z-50 bg-black"
                    : "h-screen flex flex-col items-center justify-center"
                }
            `}>
                {(imageSrc || result) && (
                    <BackButton onClick={reset} />
                )}

                {!imageSrc ? (
                    <div className="fixed inset-0 flex items-center justify-center p-8">
                        <BackButton href="/" />
                        <div className="w-full max-w-xl">
                            <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full">
                        {isProcessing && !result && (
                            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center flex-col space-y-4">
                                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-white font-medium animate-pulse">Processing</p>
                            </div>
                        )}

                        {result ? (
                            <ResultViewer
                                imageSrc={imageSrc}
                                predictions={result.predictions}
                                imageWidth={result.image.width}
                                imageHeight={result.image.height}
                            />
                        ) : (
                            // Show just image if result not ready yet (before processing or strictly loading)
                            <div className="flex items-center justify-center h-full p-8">
                                <img src={imageSrc} className="max-h-[80vh] max-w-full w-auto object-contain opacity-50 blur-sm transition-all duration-500" />
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-3 rounded-lg shadow-xl backdrop-blur-md">
                        {error}
                    </div>
                )}

            </div>
        </div>
    );
}
