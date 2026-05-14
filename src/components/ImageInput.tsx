"use client";

import { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageUtils";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

export function ImageInput({ images, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const compressed = await Promise.all(Array.from(files).map(compressImage));
    onChange([...images, ...compressed]);
  }

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {images.map((src, i) => (
        <div key={i} className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
          <button
            type="button"
            className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-gray-900"
            onClick={() => remove(i)}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="w-8 h-8 shrink-0"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        title="Adjuntar imagen"
      >
        <ImagePlus className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="w-8 h-8 shrink-0"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        title="Tomar foto"
      >
        <Camera className="w-4 h-4" />
      </Button>
    </div>
  );
}
