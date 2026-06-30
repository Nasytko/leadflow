"use client";

import { cn } from "@/lib/utils";

type PreviewButton = {
  label: string;
};

type Props = {
  html: string;
  buttons?: PreviewButton[];
  className?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>/gi, "")
    .replace(/<\/b>/gi, "")
    .replace(/<i>/gi, "")
    .replace(/<\/i>/gi, "")
    .replace(/<code>/gi, "")
    .replace(/<\/code>/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function TelegramMessagePreview({ html, buttons = [], className }: Props) {
  const lines = stripHtml(html).split("\n").filter((l, i, arr) => l || arr[i + 1] !== "");

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="w-full max-w-[340px]">
        <div className="rounded-[24px] border-4 border-slate-800 bg-slate-900 p-2 shadow-2xl">
          <div className="rounded-[18px] bg-[#0e1621] overflow-hidden">
            <div className="bg-[#17212b] px-4 py-3 flex items-center gap-3 border-b border-white/5">
              <div className="h-9 w-9 rounded-full bg-[#5288c1] flex items-center justify-center text-white text-sm font-bold">
                LB
              </div>
              <div>
                <p className="text-white text-sm font-medium">LeadBridge Bot</p>
                <p className="text-[#6c7883] text-xs">online</p>
              </div>
            </div>
            <div className="p-4 min-h-[280px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMxYTI0MmUiLz48L3N2Zz4=')]">
              <div className="inline-block max-w-[95%] rounded-2xl rounded-tl-sm bg-[#182533] px-3 py-2.5 shadow-md">
                <div className="text-[#f5f5f5] text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                  {lines.map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < lines.length - 1 && "\n"}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#6c7883] text-right mt-1">14:32</p>
              </div>
              {buttons.length > 0 && (
                <div className="mt-2 space-y-1.5 max-w-[95%]">
                  {buttons.map((btn, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-[#2b5278]/60 border border-[#3d6a99]/40 px-3 py-2 text-center text-[#6ab2f2] text-xs font-medium"
                    >
                      {btn.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
