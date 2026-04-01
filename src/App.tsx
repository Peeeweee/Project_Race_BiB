import React, { useState, useRef } from 'react';
import { BibPreview, CustomTextElement } from './components/BibPreview';
import { Upload, Download, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

import { motion, AnimatePresence } from 'motion/react';

const padNumber = (num: number, length: number) => {
  return num.toString().padStart(length, '0');
};

function App() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [distance, setDistance] = useState('5KM');
  const [startNumber, setStartNumber] = useState('0001');
  const [endNumber, setEndNumber] = useState('0010');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(120);
  const [fontColor, setFontColor] = useState('#000000');
  const [fontColor2, setFontColor2] = useState('#ffffff');
  const [isGradient, setIsGradient] = useState(false);
  const [gradientDirection, setGradientDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [hasOutline, setHasOutline] = useState(false);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineThickness, setOutlineThickness] = useState(5);
  const [x, setX] = useState(400);
  const [y, setY] = useState(300);
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportChunkLabel, setExportChunkLabel] = useState('');
  const [step, setStep] = useState<'design' | 'review'>('design');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');
  const [customTexts, setCustomTexts] = useState<CustomTextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newCustomText, setNewCustomText] = useState('');
  
  const stageRef = useRef<any>(null);

  const startNum = parseInt(startNumber, 10) || 1;
  const endNum = parseInt(endNumber, 10) || 10;
  const totalBibs = Math.max(1, endNum - startNum + 1);
  const padding = startNumber.length;
  const currentReviewBib = padNumber(startNum + reviewIndex, padding);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        // Load PDF.js dynamically to avoid bundler issues
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        // Render at a high resolution (e.g., 3x) for good print quality
        const viewport = page.getViewport({ scale: 3.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setBackgroundImage(canvas.toDataURL('image/png'));
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF. Please try an image file instead.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnd = (e: any) => {
    setX(e.target.x());
    setY(e.target.y());
  };

  const handleImageDragEnd = (e: any) => {
    setImageX(e.target.x());
    setImageY(e.target.y());
  };

  const handleAddCustomText = () => {
    if (!newCustomText.trim()) return;
    const newId = Date.now().toString();
    const offset = (customTexts.length % 5) * 30; // Add offset so they don't perfectly overlap
    setCustomTexts([...customTexts, {
      id: newId,
      text: newCustomText,
      x: 200 + offset,
      y: 200 + offset,
      fontSize: 40,
      fill: fontColor,
      fontFamily: fontFamily,
      isGradient: isGradient,
      fill2: fontColor2,
      gradientDirection: gradientDirection,
      hasOutline: hasOutline,
      outlineColor: outlineColor,
      outlineThickness: outlineThickness
    }]);
    setSelectedTextId(newId);
    setNewCustomText('');
  };

  const handleCustomTextDragEnd = (id: string, e: any) => {
    setCustomTexts(texts => texts.map(t => 
      t.id === id ? { ...t, x: e.target.x(), y: e.target.y() } : t
    ));
  };

  const handleCustomTextClick = (id: string) => {
    setSelectedTextId(id);
  };

  const updateCustomText = (id: string, updates: Partial<CustomTextElement>) => {
    setCustomTexts(texts => texts.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const deleteCustomText = (id: string) => {
    setCustomTexts(texts => texts.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Synchronously draws one bib onto the offscreen canvas.
  // All Canvas 2D calls are synchronous — the canvas is ready to read immediately after.
  const drawBibToCanvas = (
    ctx: CanvasRenderingContext2D,
    bgImg: HTMLImageElement,
    bibNumber: string,
    opts: {
      exportWidth: number; exportHeight: number;
      imgOffX: number; imgOffY: number;
      textX: number; textY: number;
      color1: string; color2: string; strokeColor: string;
    }
  ): void => {
    const { exportWidth, exportHeight, imgOffX, imgOffY, textX, textY, color1, color2, strokeColor } = opts;

    ctx.clearRect(0, 0, exportWidth, exportHeight);
    ctx.drawImage(bgImg, imgOffX, imgOffY, bgImg.naturalWidth, bgImg.naturalHeight);

    for (const ct of customTexts) {
      ctx.save();
      ctx.font = `bold ${ct.fontSize}px "${ct.fontFamily || fontFamily}"`;
      ctx.textBaseline = 'top';
      if (ct.isGradient) {
        const g = (gradientDirection === 'vertical')
          ? ctx.createLinearGradient(ct.x, ct.y, ct.x, ct.y + ct.fontSize)
          : ctx.createLinearGradient(ct.x, ct.y, ct.x + ct.fontSize * ct.text.length * 0.6, ct.y);
        g.addColorStop(0, ct.fill || '#000000');
        g.addColorStop(1, ct.fill2 || '#ffffff');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = ct.fill || '#000000';
      }
      if (ct.hasOutline) {
        ctx.strokeStyle = ct.outlineColor || '#000000';
        ctx.lineWidth   = ct.outlineThickness || 5;
        ctx.strokeText(ct.text, ct.x, ct.y);
      }
      ctx.fillText(ct.text, ct.x, ct.y);
      ctx.restore();
    }

    ctx.save();
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (isGradient) {
      const g = (gradientDirection === 'vertical')
        ? ctx.createLinearGradient(textX, textY - fontSize / 2, textX, textY + fontSize / 2)
        : ctx.createLinearGradient(textX - fontSize * bibNumber.length * 0.3, textY,
                                   textX + fontSize * bibNumber.length * 0.3, textY);
      g.addColorStop(0, color1);
      g.addColorStop(1, color2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = color1;
    }
    if (hasOutline) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth   = outlineThickness;
      ctx.strokeText(bibNumber, textX, textY);
    }
    ctx.fillText(bibNumber, textX, textY);
    ctx.restore();
  };

  // Async version: draws then encodes to PNG ArrayBuffer (for ZIP).
  // Blobs live outside the V8 heap — memory-safe for large batches.
  const renderBibToBlob = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    bgImg: HTMLImageElement,
    bibNumber: string,
    opts: {
      exportWidth: number; exportHeight: number;
      imgOffX: number; imgOffY: number;
      textX: number; textY: number;
      color1: string; color2: string; strokeColor: string;
    }
  ): Promise<ArrayBuffer> => {
    drawBibToCanvas(ctx, bgImg, bibNumber, opts);
    return new Promise<ArrayBuffer>((resolve, reject) => {
      canvas.toBlob(async blob => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        resolve(await blob.arrayBuffer());
      }, 'image/png');
    });
  };

  const exportImages = async () => {
    if (!stageRef.current || !backgroundImage) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportChunkLabel('');

    // ── How many bibs per ZIP file (keeps RAM bounded) ────────────────────
    // 100 bibs × ~1–3 MB each ≈ 100–300 MB peak — safely within Chrome limits.
    // PDF format doesn't chunk (use smaller ranges for PDF).
    const CHUNK_SIZE = 100;

    try {
      const stage = stageRef.current;
      const scale        = stage.scaleX() || 1;
      const exportWidth  = Math.round(stage.width()  / scale);
      const exportHeight = Math.round(stage.height() / scale);

      // Pre-load background once
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = reject;
        img.src = backgroundImage;
      });

      // Single off-screen canvas reused for all bibs
      const offscreen = document.createElement('canvas');
      offscreen.width  = exportWidth;
      offscreen.height = exportHeight;
      const ctx = offscreen.getContext('2d')!;

      // Snapshot text & image positions from Konva (don't touch it again)
      const textNode = stage.findOne('#main-bib-text');
      const imgNode  = stage.findOne('Image');
      const imgOffX  = imgNode  ? imgNode.x()  : 0;
      const imgOffY  = imgNode  ? imgNode.y()  : 0;
      const textX    = textNode ? textNode.x() : exportWidth  / 2;
      const textY    = textNode ? textNode.y() : exportHeight / 2;

      const isValidHex  = (h: string) => /^#([0-9A-F]{3}){1,2}$/i.test(h);
      const color1      = isValidHex(fontColor)    ? fontColor    : '#000000';
      const color2      = isValidHex(fontColor2)   ? fontColor2   : '#ffffff';
      const strokeColor = isValidHex(outlineColor) ? outlineColor : '#000000';
      const renderOpts  = { exportWidth, exportHeight, imgOffX, imgOffY, textX, textY, color1, color2, strokeColor };

      // ── PDF path ──────────────────────────────────────────────────────────
      // jsPDF holds ALL images in RAM until save() — can't free them mid-chunk.
      // Fix: use JPEG (5–10× smaller than PNG) + smaller chunk size of 30.
      if (exportFormat === 'pdf') {
        const PDF_CHUNK = 30; // ~10–30 MB peak per chunk at JPEG quality 0.85
        const totalChunks = Math.ceil(totalBibs / PDF_CHUNK);

        for (let chunk = 0; chunk < totalChunks; chunk++) {
          const chunkStart = startNum + chunk * PDF_CHUNK;
          const chunkEnd   = Math.min(chunkStart + PDF_CHUNK - 1, endNum);
          const chunkLabel = totalChunks > 1
            ? `Part ${chunk + 1} of ${totalChunks} — bibs ${padNumber(chunkStart, padding)}–${padNumber(chunkEnd, padding)}`
            : `Generating PDF…`;

          setExportChunkLabel(chunkLabel);

          // Fresh jsPDF per chunk — previous chunk's memory freed after save()
          const pdf = new jsPDF({
            orientation: exportWidth > exportHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [exportWidth, exportHeight],
          });

          for (let i = chunkStart; i <= chunkEnd; i++) {
            const bib = padNumber(i, padding);
            // Draw synchronously onto the shared canvas, then pass the canvas to addImage
            drawBibToCanvas(ctx, bgImg, bib, renderOpts);
            if (i > chunkStart) pdf.addPage([exportWidth, exportHeight], exportWidth > exportHeight ? 'landscape' : 'portrait');
            // Canvas element passed directly — jsPDF reads it synchronously as JPEG (5–10× smaller than PNG)
            pdf.addImage(offscreen, 'JPEG', 0, 0, exportWidth, exportHeight, undefined, 'FAST');

            const globalDone = (chunk * PDF_CHUNK) + (i - chunkStart + 1);
            if (globalDone % 5 === 0 || i === chunkEnd) {
              setExportProgress(Math.round((globalDone / totalBibs) * 100));
              await new Promise<void>(r => setTimeout(r, 0));
            }
          }

          const filename = totalChunks > 1
            ? `race-bibs-${padNumber(chunkStart, padding)}-${padNumber(chunkEnd, padding)}.pdf`
            : 'race-bibs.pdf';
          pdf.save(filename);

          // Give GC time to reclaim old jsPDF object before next chunk
          await new Promise<void>(r => setTimeout(r, 300));
        }

        setExportProgress(100);
        await new Promise(r => setTimeout(r, 300));
        return;
      }


      // ── ZIP path — chunked to keep RAM bounded ────────────────────────────
      const totalChunks = Math.ceil(totalBibs / CHUNK_SIZE);

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const chunkStart = startNum + chunk * CHUNK_SIZE;
        const chunkEnd   = Math.min(chunkStart + CHUNK_SIZE - 1, endNum);
        const chunkLabel = totalChunks > 1
          ? `Part ${chunk + 1} of ${totalChunks} — bibs ${padNumber(chunkStart, padding)}–${padNumber(chunkEnd, padding)}`
          : `Generating ZIP…`;

        setExportChunkLabel(chunkLabel);

        // Fresh JSZip per chunk — previous chunk's memory is freed after saveAs
        const zip = new JSZip();

        for (let i = chunkStart; i <= chunkEnd; i++) {
          const bib = padNumber(i, padding);
          const buf = await renderBibToBlob(ctx, offscreen, bgImg, bib, renderOpts);
          zip.file(`bib-${bib}.png`, buf);

          // Global progress across all chunks
          const globalDone = (chunk * CHUNK_SIZE) + (i - chunkStart + 1);
          if (globalDone % 5 === 0 || i === chunkEnd) {
            setExportProgress(Math.round((globalDone / totalBibs) * 100));
            await new Promise<void>(r => setTimeout(r, 0));
          }
        }

        // Compress + download this chunk, then let GC reclaim memory
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
        const filename = totalChunks > 1
          ? `race-bibs-${padNumber(chunkStart, padding)}-${padNumber(chunkEnd, padding)}.zip`
          : 'race-bibs.zip';
        saveAs(blob, filename);

        // Yield a full frame so the browser can GC and paint before next chunk
        await new Promise<void>(r => setTimeout(r, 200));
      }

      setExportProgress(100);
      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      console.error('Export failed', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportChunkLabel('');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isExporting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6"
          >
            <div className="max-w-3xl w-full flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-[120px] md:text-[200px] font-black tracking-tighter leading-none mb-4 font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500"
              >
                {exportProgress}%
              </motion.div>
              
              <div className="text-xl md:text-3xl font-bold uppercase tracking-[0.5em] animate-pulse mb-16 text-center">
                Generating Bibs
              </div>
              
              <div className="w-full max-w-xl h-4 bg-gray-900 border-2 border-gray-800 relative overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-white"
                  initial={{ width: "0%" }}
                  animate={{ width: `${exportProgress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              
              <p className="mt-8 text-sm font-mono text-gray-400 uppercase tracking-widest text-center">
                {exportChunkLabel || 'Please wait…'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-white text-black p-6 md:p-12 font-sans selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="order-2 md:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
              TOOL 1 OF 1 • BIB GENERATOR
            </p>
            <div className="w-12 h-1 bg-black"></div>
          </div>
          <h1 className="order-1 md:order-2 text-6xl md:text-8xl font-black text-left md:text-right leading-[0.85] tracking-tighter">
            RACE <span style={{ fontStyle: 'italic', letterSpacing: '-0.04em' }}>BiB</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Controls Panel */}
          {step === 'design' && (
            <div className="lg:col-span-5 space-y-12">

            {/* 1. Design Upload */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-b-4 border-black pb-2 flex justify-between items-center">
                <span>01. Background</span>
              </h2>
              <label className="block w-full p-8 border-4 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer text-center group">
                <Upload className="w-8 h-8 mx-auto mb-4 text-black group-hover:text-white transition-colors" />
                <span className="text-xs font-bold uppercase tracking-widest">Click to upload image or PDF</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageUpload} />
              </label>
            </section>

            {/* 2. Race Details */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-b-4 border-black pb-2">
                02. Data
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Distance / Category</label>
                  <input
                    type="text"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full p-4 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-lg"
                    placeholder="e.g. 5KM"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Start No.</label>
                    <input
                      type="text"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      className="w-full p-4 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">End No.</label>
                    <input
                      type="text"
                      value={endNumber}
                      onChange={(e) => setEndNumber(e.target.value)}
                      className="w-full p-4 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-lg"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Typography */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-b-4 border-black pb-2">
                03. Typography
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full p-4 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-lg appearance-none bg-white cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="Inter">INTER</option>
                    <option value="Carter One">CARTER ONE</option>
                    <option value="Rethink Sans">RETHINK SANS</option>
                    <option value="Oswald">OSWALD</option>
                    <option value="Anton">ANTON</option>
                    <option value="Roboto">ROBOTO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-4">Font Size</label>
                  <div className="flex items-center gap-6">
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="10"
                      max="2000"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-24 p-3 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Colors */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-b-4 border-black pb-2">
                04. Colors
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-8 h-8 border-4 border-black bg-white">
                      <input
                        type="checkbox"
                        checked={isGradient}
                        onChange={(e) => setIsGradient(e.target.checked)}
                        className="peer absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      <div className="hidden peer-checked:block w-4 h-4 bg-black"></div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black">Enable Gradient</span>
                  </label>

                  {isGradient && (
                    <div className="flex items-center gap-4 border-l-4 border-black pl-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gradientDirection"
                          value="vertical"
                          checked={gradientDirection === 'vertical'}
                          onChange={(e) => setGradientDirection(e.target.value as 'vertical' | 'horizontal')}
                          className="w-4 h-4 text-black border-2 border-black focus:ring-black"
                        />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600">Up/Down</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gradientDirection"
                          value="horizontal"
                          checked={gradientDirection === 'horizontal'}
                          onChange={(e) => setGradientDirection(e.target.value as 'vertical' | 'horizontal')}
                          className="w-4 h-4 text-black border-2 border-black focus:ring-black"
                        />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600">Left/Right</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Primary Color</label>
                    <div className="flex items-center border-4 border-black p-1 bg-white">
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="w-12 h-12 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="ml-3 font-mono text-sm uppercase font-bold w-full focus:outline-none bg-transparent"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  {isGradient && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Secondary Color</label>
                      <div className="flex items-center border-4 border-black p-1 bg-white">
                        <input
                          type="color"
                          value={fontColor2}
                          onChange={(e) => setFontColor2(e.target.value)}
                          className="w-12 h-12 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={fontColor2}
                          onChange={(e) => setFontColor2(e.target.value)}
                          className="ml-3 font-mono text-sm uppercase font-bold w-full focus:outline-none bg-transparent"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Outline Controls */}
                <div className="pt-6 border-t-4 border-black mt-6">
                  <label className="flex items-center gap-4 cursor-pointer group mb-6">
                    <div className="relative flex items-center justify-center w-8 h-8 border-4 border-black bg-white">
                      <input
                        type="checkbox"
                        checked={hasOutline}
                        onChange={(e) => setHasOutline(e.target.checked)}
                        className="peer absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      <div className="hidden peer-checked:block w-4 h-4 bg-black"></div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black">Enable Outline</span>
                  </label>

                  {hasOutline && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Outline Color</label>
                        <div className="flex items-center border-4 border-black p-1 bg-white">
                          <input
                            type="color"
                            value={outlineColor}
                            onChange={(e) => setOutlineColor(e.target.value)}
                            className="w-12 h-12 cursor-pointer border-0 p-0 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            value={outlineColor}
                            onChange={(e) => setOutlineColor(e.target.value)}
                            className="ml-3 font-mono text-sm uppercase font-bold w-full focus:outline-none bg-transparent"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-4">Outline Thickness</label>
                        <div className="flex items-center gap-6">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={outlineThickness}
                            onChange={(e) => setOutlineThickness(Number(e.target.value))}
                            className="flex-1"
                          />
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={outlineThickness}
                            onChange={(e) => setOutlineThickness(Number(e.target.value))}
                            className="w-20 p-3 border-4 border-black rounded-none focus:ring-0 focus:outline-none focus:border-black font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Export */}
            <button
              onClick={() => {
                setReviewIndex(0);
                setStep('review');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={!backgroundImage || isExporting}
              className="w-full py-6 px-6 bg-black hover:bg-gray-800 text-white text-sm font-bold uppercase tracking-[0.2em] rounded-none transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-8 border-4 border-black"
            >
              REVIEW & EXPORT
            </button>
          </div>
          )}

          {/* Preview Panel */}
          <div className={step === 'design' ? "lg:col-span-7" : "lg:col-span-12 max-w-5xl mx-auto w-full"}>
            <div className={step === 'design' ? "sticky top-12" : ""}>
              {step === 'design' ? (
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex justify-between items-end">
                    <h2 className="text-sm font-bold uppercase tracking-widest">Live Preview</h2>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Drag elements to position</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center border-2 border-black bg-white">
                      <input 
                        type="text" 
                        value={newCustomText}
                        onChange={(e) => setNewCustomText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomText()}
                        placeholder="Type text/emoji..."
                        className="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 outline-none w-32"
                      />
                      <button 
                        onClick={handleAddCustomText} 
                        disabled={!newCustomText.trim()}
                        className="bg-black text-white p-1 hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title="Add Text"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => { setStartNumber('0001'); setEndNumber('0010'); }} className="text-[10px] font-bold uppercase tracking-[0.1em] text-black border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors">Reset Numbers</button>
                    <button onClick={() => { setX(400); setY(300); }} className="text-[10px] font-bold uppercase tracking-[0.1em] text-black border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors">Reset Text Pos</button>
                    <button onClick={() => { setImageX(0); setImageY(0); }} className="text-[10px] font-bold uppercase tracking-[0.1em] text-black border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors">Reset Image Pos</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <button 
                      onClick={() => setStep('design')} 
                      className="border-4 border-black px-6 py-3 font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors"
                    >
                      ← Back to Design
                    </button>
                    <div className="text-center">
                      <h2 className="text-2xl font-black uppercase tracking-widest">Review & Adjust</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Drag elements to fix alignment</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex bg-gray-100 p-1 border-2 border-black">
                        <button
                          onClick={() => setExportFormat('zip')}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${exportFormat === 'zip' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
                        >
                          ZIP
                        </button>
                        <button
                          onClick={() => setExportFormat('pdf')}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${exportFormat === 'pdf' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
                        >
                          PDF
                        </button>
                      </div>
                      <button 
                        onClick={exportImages} 
                        disabled={!backgroundImage || isExporting}
                        className="bg-black text-white px-8 py-3 font-bold uppercase text-xs hover:bg-gray-800 transition-colors flex items-center gap-2 border-4 border-black disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" /> Export Batch ({exportFormat.toUpperCase()})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 bg-white p-6 border-4 border-black">
                    <button 
                      onClick={() => setReviewIndex(i => Math.max(0, i - 1))} 
                      disabled={reviewIndex === 0} 
                      className="p-2 border-2 border-transparent hover:border-black disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex justify-between items-end text-xs font-bold font-mono uppercase tracking-widest">
                        <span className="text-gray-400">Start: {padNumber(startNum, padding)}</span>
                        <span className="text-3xl text-black">{currentReviewBib}</span>
                        <span className="text-gray-400">End: {padNumber(endNum, padding)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={totalBibs - 1} 
                        value={reviewIndex} 
                        onChange={(e) => setReviewIndex(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <button 
                      onClick={() => setReviewIndex(i => Math.min(totalBibs - 1, i + 1))} 
                      disabled={reviewIndex === totalBibs - 1} 
                      className="p-2 border-2 border-transparent hover:border-black disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Custom Text Editor */}
              {selectedTextId && (
                <div className="mb-4 p-4 border-4 border-black bg-gray-50 flex flex-col gap-4">
                  {(() => {
                    const ct = customTexts.find(t => t.id === selectedTextId);
                    if (!ct) return null;
                    return (
                      <>
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                          <h3 className="text-sm font-black uppercase tracking-widest">Edit Custom Text</h3>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => deleteCustomText(ct.id)} 
                              className="bg-red-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 border-2 border-red-500 transition-colors"
                            >
                              Delete
                            </button>
                            <button 
                              onClick={() => setSelectedTextId(null)} 
                              className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 border-2 border-black transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Text Input */}
                          <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Text / Emoji</label>
                            <input 
                              type="text" 
                              value={ct.text} 
                              onChange={e => updateCustomText(ct.id, { text: e.target.value })} 
                              className="w-full border-2 border-black p-2 text-sm focus:outline-none focus:ring-0" 
                            />
                          </div>

                          {/* Typography */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Font Family</label>
                            <select 
                              value={ct.fontFamily || 'Inter'} 
                              onChange={e => updateCustomText(ct.id, { fontFamily: e.target.value })}
                              className="w-full border-2 border-black p-2 text-sm focus:outline-none focus:ring-0"
                            >
                              <option value="Inter">Inter</option>
                              <option value="Anton">Anton</option>
                              <option value="Bebas Neue">Bebas Neue</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="Oswald">Oswald</option>
                              <option value="Righteous">Righteous</option>
                              <option value="Russo One">Russo One</option>
                              <option value="Space Grotesk">Space Grotesk</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Size</label>
                            <input 
                              type="number" 
                              value={ct.fontSize} 
                              onChange={e => updateCustomText(ct.id, { fontSize: Number(e.target.value) })} 
                              className="w-full border-2 border-black p-2 text-sm focus:outline-none focus:ring-0" 
                            />
                          </div>

                          {/* Colors & Gradients */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest">Color</label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={ct.isGradient || false} 
                                  onChange={e => updateCustomText(ct.id, { isGradient: e.target.checked })}
                                  className="w-3 h-3 border-2 border-black rounded-none checked:bg-black checked:text-black focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Gradient</span>
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="color" 
                                value={ct.fill} 
                                onChange={e => updateCustomText(ct.id, { fill: e.target.value })} 
                                className="h-9 w-full cursor-pointer border-2 border-black p-0.5" 
                              />
                              {ct.isGradient && (
                                <input 
                                  type="color" 
                                  value={ct.fill2 || '#ffffff'} 
                                  onChange={e => updateCustomText(ct.id, { fill2: e.target.value })} 
                                  className="h-9 w-full cursor-pointer border-2 border-black p-0.5" 
                                />
                              )}
                            </div>
                            {ct.isGradient && (
                              <select 
                                value={ct.gradientDirection || 'vertical'} 
                                onChange={e => updateCustomText(ct.id, { gradientDirection: e.target.value as 'vertical' | 'horizontal' })}
                                className="w-full border-2 border-black p-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-0"
                              >
                                <option value="vertical">Vertical</option>
                                <option value="horizontal">Horizontal</option>
                              </select>
                            )}
                          </div>

                          {/* Outline */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest">Outline</label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={ct.hasOutline || false} 
                                  onChange={e => updateCustomText(ct.id, { hasOutline: e.target.checked })}
                                  className="w-3 h-3 border-2 border-black rounded-none checked:bg-black checked:text-black focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Enable</span>
                              </label>
                            </div>
                            {ct.hasOutline && (
                              <div className="flex gap-2">
                                <input 
                                  type="color" 
                                  value={ct.outlineColor || '#000000'} 
                                  onChange={e => updateCustomText(ct.id, { outlineColor: e.target.value })} 
                                  className="h-9 w-full cursor-pointer border-2 border-black p-0.5" 
                                />
                                <input 
                                  type="number" 
                                  value={ct.outlineThickness || 5} 
                                  onChange={e => updateCustomText(ct.id, { outlineThickness: Number(e.target.value) })} 
                                  className="w-full border-2 border-black p-2 text-sm focus:outline-none focus:ring-0" 
                                  placeholder="Thickness"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <BibPreview
                backgroundImage={backgroundImage}
                bibNumber={step === 'review' ? currentReviewBib : startNumber}
                fontFamily={fontFamily}
                fontSize={fontSize}
                fontColor={fontColor}
                fontColor2={fontColor2}
                isGradient={isGradient}
                gradientDirection={gradientDirection}
                hasOutline={hasOutline}
                outlineColor={outlineColor}
                outlineThickness={outlineThickness}
                x={x}
                y={y}
                imageX={imageX}
                imageY={imageY}
                onDragEnd={handleDragEnd}
                onImageDragEnd={handleImageDragEnd}
                stageRef={stageRef}
                customTexts={customTexts}
                onCustomTextDragEnd={handleCustomTextDragEnd}
                onCustomTextClick={handleCustomTextClick}
                selectedTextId={selectedTextId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* kpd easter egg — developer signature */}
      <div
        title="made with ♥ by kpd"
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '16px',
          fontSize: '9px',
          fontWeight: 900,
          letterSpacing: '0.35em',
          color: 'rgba(0,0,0,0.08)',
          userSelect: 'none',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          cursor: 'default',
          transition: 'color 0.3s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.55)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.08)')}
      >
        kpd
      </div>
      </div>
    </>
  );
}

export default App;
