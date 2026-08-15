"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { apiRequest, type UploadAccepted } from "@/lib/api-client";
import { useAppConfig } from "@/lib/config-context";

interface UploadDropzoneProps {
  fileId: string | null;
  onChange: (upload: UploadAccepted | null) => void;
  className?: string;
}

const MAX_FILE_MB = 20;

export function UploadDropzone({ fileId, onChange, className }: UploadDropzoneProps) {
  const config = useAppConfig();
  const maxBytes = config.limits.maxUploadBytes;
  const [preview, setPreview] = React.useState<UploadAccepted | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Clear the preview when the parent resets fileId (render-time derived
  // state, the React-endorsed alternative to a setState-in-effect).
  const [prevFileId, setPrevFileId] = React.useState(fileId);
  if (prevFileId !== fileId) {
    setPrevFileId(fileId);
    if (fileId === null) {
      setPreview(null);
      onChange(null);
    }
  }

  const validateClientSide = (file: File): string | null => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return "Unsupported file type. Please upload PNG, JPG or WebP.";
    }
    if (file.size > maxBytes) {
      return `The uploaded image is too large. Maximum file size is ${Math.round(maxBytes / (1024 * 1024))} MB.`;
    }
    return null;
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    const clientError = validateClientSide(file);
    if (clientError) {
      toast.error(clientError);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const upload = await apiRequest<UploadAccepted>("/api/upload", {
        method: "POST",
        body: formData,
        headers: {}, // let the browser set the multipart boundary
      });
      setPreview(upload);
      onChange(upload);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        id="upload-input"
        aria-label="Upload an image to animate"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt="Uploaded source image preview"
            className="mx-auto max-h-72 w-auto object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-zinc-200">
            <span className="truncate">
              {preview.width > 0 ? `${preview.width}×${preview.height}` : "Image ready"} ·{" "}
              {formatBytes(preview.sizeBytes)}
            </span>
            <button
              type="button"
              onClick={clear}
              className="focus-ring flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
              aria-label="Remove uploaded image"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          disabled={uploading}
          className={cn(
            "focus-ring flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:opacity-60",
            dragOver
              ? "border-violet-400 bg-violet-500/10"
              : "border-white/15 bg-white/[0.02] hover:border-white/30",
          )}
          aria-label="Upload an image to animate"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">
                Drag &amp; drop an image here, or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG or WebP · up to {Math.round(MAX_FILE_MB)} MB
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
