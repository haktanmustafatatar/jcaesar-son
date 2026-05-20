"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function SecurityShield() {
  const [isTampered, setIsTampered] = useState(false);

  useEffect(() => {
    // 1. Clear consoles and silence logs in production completely
    if (process.env.NODE_ENV === "production" || typeof window !== "undefined") {
      try {
        console.log = () => {};
        console.info = () => {};
        console.debug = () => {};
        console.warn = () => {};
        console.error = () => {};
      } catch (e) {}
    }

    // 2. Right-click / Context Menu Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Prevent keyboard inspect shortcuts (F12, Ctrl+Shift+I, Cmd+Opt+I, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        setIsTampered(true);
        return false;
      }
      
      // Ctrl+Shift+I / Cmd+Opt+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === "i") {
        e.preventDefault();
        setIsTampered(true);
        return false;
      }

      // Ctrl+Shift+J / Cmd+Opt+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === "j") {
        e.preventDefault();
        setIsTampered(true);
        return false;
      }

      // Ctrl+Shift+C / Cmd+Opt+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === "c") {
        e.preventDefault();
        setIsTampered(true);
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "u") {
        e.preventDefault();
        setIsTampered(true);
        return false;
      }
    };

    // 4. Actively detect DevTools opening by size difference
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        setIsTampered(true);
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    const interval = setInterval(detectDevTools, 1000);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  if (isTampered) {
    return (
      <div className="fixed inset-0 z-[99999] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),transparent)] pointer-events-none" />
        <div className="relative space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-bounce-slow">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight uppercase">Güvenlik İhlali</h1>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              J.Caesar kurumsal koruma protokolü devreye girdi. Kaynak kodların veya sistem detaylarının incelenmesi güvenlik politikalarımız gereği yasaklanmıştır.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all text-xs uppercase tracking-widest"
          >
            Sistemi Yeniden Yükle
          </button>
        </div>
      </div>
    );
  }

  return null;
}
