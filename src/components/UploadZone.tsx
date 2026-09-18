import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export default function UploadZone({ onFileSelect, selectedFile, onClear }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return;
      onFileSelect(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = () => {
    onClear();
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !selectedFile && inputRef.current?.click()}
      className={cn(
        "relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : selectedFile
          ? "border-primary/50 bg-card"
          : "border-border hover:border-primary/50 hover:bg-card/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <AnimatePresence mode="wait">
        {selectedFile && preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative p-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="absolute top-2 right-2 z-10 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={preview}
              alt="Upload preview"
              className="w-full max-h-64 object-contain rounded-lg"
            />
            <p className="text-sm text-muted-foreground mt-2 text-center truncate">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 py-16 px-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
            >
              <Upload className="w-7 h-7 text-primary" />
            </motion.div>
            <div className="text-center">
              <p className="font-medium text-lg">Drop your design here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Wireframe, screenshot, or hand-drawn sketch
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <ImageIcon className="w-3 h-3" /> PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
