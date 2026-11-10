import React, { useState } from 'react';
import { Check, Code2, Copy, Download, FileCode, X } from 'lucide-react';
import { KOTLIN_ANDROID_FILES, KotlinSourceFile } from '../data/kotlinProjectFiles';

interface KotlinExportModalProps {
  onClose: () => void;
}

export const KotlinExportModal: React.FC<KotlinExportModalProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<KotlinSourceFile>(KOTLIN_ANDROID_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopyFile = () => {
    navigator.clipboard?.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAllFiles = () => {
    const bundleText = KOTLIN_ANDROID_FILES.map(
      (f) =>
        `// ============================================================================\n` +
        `// FILE: ${f.path}\n` +
        `// DESCRIPTION: ${f.description}\n` +
        `// ============================================================================\n\n` +
        `${f.content}\n\n`
    ).join('\n');

    const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IntervalsIcu_Android_Kotlin_Compose_Project.kt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#141720] border border-slate-800 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#10131b]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                Native Android Project — Kotlin + Jetpack Compose
              </h2>
              <p className="text-xs text-slate-400">
                Ready for Android Studio (Retrofit2 + WorkManager 12h Sync + Compose Canvas Pace Step Diagram)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleDownloadAllFiles}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All Kotlin Files</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Kotlin code viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Browser + Code Viewer */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Sidebar: Kotlin Project Tree */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800/80 bg-[#12151e] p-3 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] font-medium text-slate-400 px-2 pb-1">
              Android Studio Files ({KOTLIN_ANDROID_FILES.length})
            </div>
            {KOTLIN_ANDROID_FILES.map((file) => {
              const isSelected = file.path === selectedFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <FileCode className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                  <div className="min-w-0">
                    <div className="truncate">{file.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      {file.path}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Pane: Code Content */}
          <div className="md:col-span-8 flex flex-col min-h-0 bg-[#0d1017]">
            <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-[#141822]">
              <div className="min-w-0">
                <div className="text-xs font-mono text-slate-200 truncate">
                  {selectedFile.path}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {selectedFile.description}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyFile}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copied ? 'Copied' : 'Copy File'}</span>
              </button>
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
