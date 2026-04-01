import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Text } from 'react-konva';
import useImage from 'use-image';

export interface CustomTextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  fontFamily?: string;
  isGradient?: boolean;
  fill2?: string;
  gradientDirection?: 'vertical' | 'horizontal';
  hasOutline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;
}

interface BibPreviewProps {
  backgroundImage: string | null;
  bibNumber: string;
  participantName: string;
  showName: boolean;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontColor2: string;
  isGradient: boolean;
  gradientDirection: 'vertical' | 'horizontal';
  hasOutline: boolean;
  outlineColor: string;
  outlineThickness: number;
  x: number;
  y: number;
  imageX: number;
  imageY: number;
  // Name text props
  nameX: number;
  nameY: number;
  nameFontFamily: string;
  nameFontSize: number;
  nameFontColor: string;
  nameFontColor2: string;
  nameIsGradient: boolean;
  nameGradientDirection: 'vertical' | 'horizontal';
  nameIsRainbow: boolean;
  nameHasOutline: boolean;
  nameOutlineColor: string;
  nameOutlineThickness: number;
  // Category text props
  showCategory: boolean;
  categoryText: string;
  categoryX: number;
  categoryY: number;
  categoryFontSize: number;
  categoryFontColor: string;
  categoryFontFamily: string;
  onDragEnd: (e: any) => void;
  onNameDragEnd: (e: any) => void;
  onCategoryDragEnd: (e: any) => void;
  onImageDragEnd: (e: any) => void;
  stageRef: React.RefObject<any>;
  customTexts: CustomTextElement[];
  onCustomTextDragEnd: (id: string, e: any) => void;
  onCustomTextClick: (id: string) => void;
  selectedTextId: string | null;
}

export const BibPreview: React.FC<BibPreviewProps> = ({
  backgroundImage,
  bibNumber,
  participantName,
  showName,
  fontFamily,
  fontSize,
  fontColor,
  fontColor2,
  isGradient,
  gradientDirection,
  hasOutline,
  outlineColor,
  outlineThickness,
  x,
  y,
  imageX,
  imageY,
  nameX,
  nameY,
  nameFontFamily,
  nameFontSize,
  nameFontColor,
  nameFontColor2,
  nameIsGradient,
  nameGradientDirection,
  nameIsRainbow,
  nameHasOutline,
  nameOutlineColor,
  nameOutlineThickness,
  showCategory,
  categoryText,
  categoryX,
  categoryY,
  categoryFontSize,
  categoryFontColor,
  categoryFontFamily,
  onDragEnd,
  onNameDragEnd,
  onCategoryDragEnd,
  onImageDragEnd,
  stageRef,
  customTexts,
  onCustomTextDragEnd,
  onCustomTextClick,
  selectedTextId,
}) => {
  const [image] = useImage(backgroundImage || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, scale: 1 });
  const textRef = useRef<any>(null);
  const nameRef = useRef<any>(null);
  const categoryRef = useRef<any>(null);

  const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  const safeColor1 = isValidHex(fontColor) ? fontColor : '#000000';
  const safeColor2 = isValidHex(fontColor2) ? fontColor2 : '#FFFFFF';
  const safeOutlineColor = isValidHex(outlineColor) ? outlineColor : '#000000';
  const safeNameColor = isValidHex(nameFontColor) ? nameFontColor : '#000000';
  const safeNameColor2 = isValidHex(nameFontColor2) ? nameFontColor2 : '#666666';
  const safeNameOutlineColor = isValidHex(nameOutlineColor) ? nameOutlineColor : '#ffffff';
  const safeCategoryColor = isValidHex(categoryFontColor) ? categoryFontColor : '#000000';

  useEffect(() => {
    if (textRef.current) {
      const node = textRef.current;
      node.offsetX(node.width() / 2);
      node.offsetY(node.height() / 2);
    }
  }, [bibNumber, fontSize, fontFamily, hasOutline, outlineThickness]);

  useEffect(() => {
    if (nameRef.current && showName) {
      const node = nameRef.current;
      node.offsetX(node.width() / 2);
      node.offsetY(node.height() / 2);
    }
  }, [participantName, nameFontSize, nameFontFamily, showName]);

  useEffect(() => {
    if (categoryRef.current && categoryText) {
      const node = categoryRef.current;
      node.offsetX(node.width() / 2);
      node.offsetY(node.height() / 2);
    }
  }, [categoryText, categoryFontSize, categoryFontFamily, showCategory]);

  useEffect(() => {
    const updateDimensions = () => {
      if (image && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / image.width;
        setDimensions({ width: containerWidth, height: image.height * scale, scale });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(() => updateDimensions());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [image]);

  return (
    <div
      ref={containerRef}
      className={`w-full border-4 border-black bg-[#f8f9fa] flex items-center justify-center relative overflow-hidden ${!image ? 'min-h-[500px]' : ''}`}
    >
      {image ? (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          scaleX={dimensions.scale}
          scaleY={dimensions.scale}
          ref={stageRef}
        >
          <Layer>
            <KonvaImage
              image={image}
              x={imageX}
              y={imageY}
              draggable
              onDragEnd={onImageDragEnd}
            />
            <Text
              id="main-bib-text"
              ref={textRef}
              text={bibNumber}
              x={x}
              y={y}
              align="center"
              fontSize={fontSize}
              fontFamily={fontFamily}
              fill={safeColor1}
              fillPriority={isGradient ? 'linear-gradient' : 'color'}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={
                gradientDirection === 'vertical'
                  ? { x: 0, y: fontSize }
                  : { x: fontSize * bibNumber.length * 0.6, y: 0 }
              }
              fillLinearGradientColorStops={[0, safeColor1, 1, safeColor2]}
              stroke={hasOutline ? safeOutlineColor : undefined}
              strokeWidth={hasOutline ? outlineThickness : 0}
              fillAfterStrokeEnabled={true}
              draggable
              onDragEnd={onDragEnd}
              fontStyle="bold"
            />

            {/* Participant name text — only rendered in CSV mode */}
            {showName && participantName && (
              <Text
                id="name-bib-text"
                ref={nameRef}
                text={participantName}
                x={nameX}
                y={nameY}
                align="center"
                fontSize={nameFontSize}
                fontFamily={nameFontFamily}
                fill={nameIsRainbow ? undefined : safeNameColor}
                fillPriority={nameIsRainbow || nameIsGradient ? 'linear-gradient' : 'color'}
                fillLinearGradientStartPoint={nameIsRainbow ? { x: 0, y: 0 } : { x: 0, y: 0 }}
                fillLinearGradientEndPoint={
                  nameIsRainbow 
                    ? { x: nameFontSize * participantName.length * 0.5, y: 0 }
                    : nameGradientDirection === 'vertical'
                      ? { x: 0, y: nameFontSize }
                      : { x: nameFontSize * participantName.length * 0.5, y: 0 }
                }
                fillLinearGradientColorStops={
                  nameIsRainbow
                    ? [0, '#FF6B6B', 0.2, '#FFD93D', 0.4, '#6BCB77', 0.6, '#4D96FF', 0.8, '#B983FF', 1, '#FF87E8']
                    : [0, safeNameColor, 1, safeNameColor2]
                }
                stroke={nameHasOutline ? safeNameOutlineColor : undefined}
                strokeWidth={nameHasOutline ? nameOutlineThickness : 0}
                fillAfterStrokeEnabled={true}
                draggable
                onDragEnd={onNameDragEnd}
                fontStyle="bold"
              />
            )}

            {/* Category / Distance text */}
            {showCategory && categoryText && (
              <Text
                id="category-bib-text"
                ref={categoryRef}
                text={categoryText}
                x={categoryX}
                y={categoryY}
                align="center"
                fontSize={categoryFontSize}
                fontFamily={categoryFontFamily}
                fill={safeCategoryColor}
                draggable
                onDragEnd={onCategoryDragEnd}
                fontStyle="bold"
              />
            )}

            {customTexts.map((ct) => {
              const ctFontFamily = ct.fontFamily || fontFamily;
              const ctFill1 = ct.fill || '#000000';
              const ctFill2 = ct.fill2 || '#ffffff';
              const ctIsGradient = ct.isGradient || false;
              const ctGradDir = ct.gradientDirection || 'vertical';
              const ctHasOutline = ct.hasOutline || false;
              const ctOutlineColor = ct.outlineColor || '#000000';
              const ctOutlineThickness = ct.outlineThickness || 5;

              return (
                <Text
                  key={ct.id}
                  text={ct.text}
                  x={ct.x}
                  y={ct.y}
                  fontSize={ct.fontSize}
                  fontFamily={ctFontFamily}
                  fill={ctFill1}
                  fillPriority={ctIsGradient ? 'linear-gradient' : 'color'}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={
                    ctGradDir === 'vertical'
                      ? { x: 0, y: ct.fontSize }
                      : { x: ct.fontSize * ct.text.length * 0.6, y: 0 }
                  }
                  fillLinearGradientColorStops={[0, ctFill1, 1, ctFill2]}
                  stroke={ctHasOutline ? ctOutlineColor : undefined}
                  strokeWidth={ctHasOutline ? ctOutlineThickness : 0}
                  fillAfterStrokeEnabled={true}
                  shadowColor={selectedTextId === ct.id ? '#00aaff' : undefined}
                  shadowBlur={selectedTextId === ct.id ? 10 : 0}
                  shadowOpacity={selectedTextId === ct.id ? 1 : 0}
                  draggable
                  onClick={() => onCustomTextClick(ct.id)}
                  onTap={() => onCustomTextClick(ct.id)}
                  onDragEnd={(e) => onCustomTextDragEnd(ct.id, e)}
                  fontStyle="bold"
                />
              );
            })}
          </Layer>
        </Stage>
      ) : (
        <div className="text-black text-center p-8 flex flex-col items-center">
          <div className="w-16 h-1 bg-black mb-6"></div>
          <p className="text-sm font-bold uppercase tracking-widest">Awaiting Background</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-2">Upload an image or PDF to begin</p>
        </div>
      )}
    </div>
  );
};
