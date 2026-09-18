import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy, Download, RefreshCw, Monitor, Tablet, Smartphone, Check,
  AlertTriangle, FileCode, Maximize2, Minimize2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Viewport = "desktop" | "tablet" | "mobile";
type GeneratedFile = { path: string; content: string };

const viewportWidths: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

function getFallbackFiles(html: string, css: string, format: string): GeneratedFile[] {
  if (!html && !css) return [];
  const styleExt = format.includes("scss") ? "scss" : "css";

  if (format.startsWith("react")) {
    return [
      { path: "src/components/GeneratedComponent.tsx", content: html },
      ...(css ? [{ path: `src/components/GeneratedComponent.module.${styleExt}`, content: css }] : []),
    ];
  }
  if (format.startsWith("angular")) {
    return [
      { path: "src/app/generated/generated.component.html", content: html },
      ...(css ? [{ path: `src/app/generated/generated.component.${styleExt}`, content: css }] : []),
    ];
  }
  if (format.startsWith("nextjs")) {
    return [
      { path: "src/app/page.tsx", content: html },
      ...(css ? [{ path: `src/app/page.module.${styleExt}`, content: css }] : []),
    ];
  }
  return [
    { path: "index.html", content: html },
    ...(css ? [{ path: `styles.${styleExt}`, content: css }] : []),
  ];
}

function buildPreviewDoc(files: GeneratedFile[]) {
  const previewIndex = files.find((f) => f.path === "preview/index.html");
  const previewCss = files.find((f) => f.path === "preview/styles.css");

  if (previewIndex) {
    let html = previewIndex.content;
    if (previewCss && !html.includes("preview/styles.css")) {
      html = html.includes("</head>")
        ? html.replace("</head>", `<style>${previewCss.content}</style></head>`)
        : `<style>${previewCss.content}</style>${html}`;
    }
    return html;
  }

  const htmlFile = files.find((f) => f.path.endsWith("index.html") || f.path.endsWith(".html"));
  if (!htmlFile) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#888;">No preview available for this format.</body></html>`;
  }

  const cssFile = files.find((f) => f.path.endsWith(".css"));
  let html = htmlFile.content;
  if (cssFile && !html.includes(cssFile.path)) {
    html = html.includes("</head>")
      ? html.replace("</head>", `<style>${cssFile.content}</style></head>`)
      : `<style>${cssFile.content}</style>${html}`;
  }
  return html;
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const state = location.state as {
    html?: string; css?: string; files?: GeneratedFile[];
    format?: string; usedFreeModel?: boolean;
  } | null;

  const html = state?.html || "";
  const css = state?.css || "";
  const format = state?.format || "html-css";
  const usedFreeModel = state?.usedFreeModel || false;

  const files = useMemo(() => {
    if (state?.files && state.files.length > 0) return state.files;
    return getFallbackFiles(html, css, format);
  }, [state?.files, html, css, format]);

  const displayFiles = useMemo(() => files.filter((f) => !f.path.startsWith("preview/")), [files]);
  const previewDoc = useMemo(() => buildPreviewDoc(files), [files]);
  const selectedFile = displayFiles.find((f) => f.path === selectedPath);

  useEffect(() => {
    if (!html && files.length === 0) navigate("/design-to-code");
  }, [html, files.length, navigate]);

  useEffect(() => {
    if (!selectedPath && displayFiles.length > 0) setSelectedPath(displayFiles[0].path);
  }, [selectedPath, displayFiles]);

  if (!html && files.length === 0) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied!` });
  };

  const downloadZip = async () => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    displayFiles.forEach((file) => zip.file(file.path, file.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-to-code-output.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Fullscreen Preview Overlay ── */
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium">Preview</span>
          <div className="flex items-center gap-2">
            {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([vp, Icon]) => (
              <Button key={vp} variant={viewport === vp ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewport(vp)}>
                <Icon className="w-4 h-4" />
              </Button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center p-4 overflow-auto bg-muted/10">
          <iframe
            srcDoc={previewDoc}
            title="Preview"
            className="bg-background rounded-lg shadow-lg border transition-all duration-300"
            style={{ width: viewportWidths[viewport], height: "100%", maxWidth: "100%" }}
            sandbox="allow-scripts"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container max-w-7xl mx-auto">
        {usedFreeModel && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border">
            <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Generated with a free model — results may vary. <a href="/pricing" className="underline font-medium text-foreground">Upgrade for premium quality</a>
            </p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">

          {/* Left: Code Panel */}
          <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-sm font-medium">Generated Files</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/design-to-code")}>
                  <RefreshCw className="w-4 h-4 mr-1" /> New
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadZip}>
                  <Download className="w-4 h-4 mr-1" /> ZIP
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex">
              <div className="w-56 border-r border-border bg-muted/30 overflow-y-auto theme-scrollbar">
                <div className="p-2 space-y-1">
                  {displayFiles.map((file) => (
                    <button key={file.path} onClick={() => setSelectedPath(file.path)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-md text-left transition-colors ${
                        selectedPath === file.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}>
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground font-mono truncate">{selectedFile?.path || "Select a file"}</span>
                  {selectedFile && (
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => copyToClipboard(selectedFile.content, selectedFile.path)}>
                      {copied === selectedFile.path ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-auto theme-scrollbar">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-foreground">
                    {selectedFile?.content || "Select a generated file to view code."}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview Panel */}
          <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-sm font-medium">Live Preview</span>
              <div className="flex items-center gap-1">
                {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([vp, Icon]) => (
                  <Button key={vp} variant={viewport === vp ? "secondary" : "ghost"} size="icon" className="h-8 w-8"
                    onClick={() => setViewport(vp)}>
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
                <div className="w-px h-5 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(true)}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center p-4 overflow-auto bg-muted/30 min-h-0 theme-scrollbar">
              <iframe
                srcDoc={previewDoc}
                title="Preview"
                className="bg-background rounded-lg shadow-lg border transition-all duration-300"
                style={{ width: viewportWidths[viewport], height: "100%", maxWidth: "100%" }}
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
