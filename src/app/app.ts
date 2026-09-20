import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'iva-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  @ViewChild('imageInput') private imageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('compareInput') private compareInput?: ElementRef<HTMLInputElement>;
  @ViewChild('artboard') private artboard?: ElementRef<HTMLCanvasElement>;

  imageUrl: string | null = null;
  compareImageUrl: string | null = null;
  fileName = 'No reference loaded';
  compareFileName = 'No comparison loaded';
  zoom = 100;
  showGrid = true;
  showGuides = true;
  showSafeFrame = false;
  showCompositionGuides = true;
  showCropFrame = true;
  showSplitView = false;
  showValueChecker = false;
  mirrorMode = false;
  isFullscreen = false;
  annotationMode = false;
  isPanning = false;
  panX = 0;
  panY = 0;
  pointerStartX = 0;
  pointerStartY = 0;
  panStartX = 0;
  panStartY = 0;
  rotation = 0;
  flipHorizontal = false;
  flipVertical = false;
  selectedAspectRatio = 'free';
  aspectRatios = ['free', '1:1', '4:3', '3:2', '16:9'];
  gridSize = 25;
  gridOpacity = 0.25;
  gridColor = '#cfcab7';
  paletteColors = ['#E7AB4E', '#D9C9A3', '#AFD4D8', '#8AAE73', '#E36F5B'];
  annotationColor = '#E7AB4E';
  annotationSize = 3;
  pixelsPerUnit = 10;
  unit = 'cm';
  imageWidth = 0;
  imageHeight = 0;
  image: HTMLImageElement | null = null;
  compareImage: HTMLImageElement | null = null;
  sampleColor = '#e7ab4e';
  annotationStrokes: Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }> = [];
  pendingStroke: { color: string; size: number; points: Array<{ x: number; y: number }> } | null = null;

  openFilePicker(): void {
    this.imageInput?.nativeElement.click();
  }

  openComparePicker(): void {
    this.compareInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    this.imageUrl = URL.createObjectURL(file);
    this.fileName = file.name;
    const image = new Image();
    image.onload = () => {
      this.image = image;
      this.imageWidth = image.naturalWidth;
      this.imageHeight = image.naturalHeight;
      this.drawCanvas();
    };
    image.src = this.imageUrl;
  }

  onCompareSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.compareImageUrl) URL.revokeObjectURL(this.compareImageUrl);
    this.compareImageUrl = URL.createObjectURL(file);
    this.compareFileName = file.name;
    const image = new Image();
    image.onload = () => {
      this.compareImage = image;
      this.drawCanvas();
    };
    image.src = this.compareImageUrl;
  }

  setZoom(value: number): void {
    this.zoom = Math.min(400, Math.max(25, value));
    this.drawCanvas();
  }

  fitToView(): void {
    this.zoom = 100;
    this.drawCanvas();
  }

  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.drawCanvas();
  }

  toggleGuides(): void {
    this.showGuides = !this.showGuides;
    this.drawCanvas();
  }

  toggleSafeFrame(): void {
    this.showSafeFrame = !this.showSafeFrame;
    this.drawCanvas();
  }

  toggleCompositionGuides(): void {
    this.showCompositionGuides = !this.showCompositionGuides;
    this.drawCanvas();
  }

  toggleCropFrame(): void {
    this.showCropFrame = !this.showCropFrame;
    this.drawCanvas();
  }

  toggleSplitView(): void {
    this.showSplitView = !this.showSplitView;
    this.drawCanvas();
  }

  toggleMirrorMode(): void {
    this.mirrorMode = !this.mirrorMode;
    this.drawCanvas();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
      this.isFullscreen = true;
      return;
    }

    void document.exitFullscreen?.();
    this.isFullscreen = false;
  }

  rotateLeft(): void {
    this.rotation = (this.rotation - 15 + 360) % 360;
    this.drawCanvas();
  }

  rotateRight(): void {
    this.rotation = (this.rotation + 15) % 360;
    this.drawCanvas();
  }

  flipHorizontalToggle(): void {
    this.flipHorizontal = !this.flipHorizontal;
    this.drawCanvas();
  }

  flipVerticalToggle(): void {
    this.flipVertical = !this.flipVertical;
    this.drawCanvas();
  }

  toggleValueChecker(): void {
    this.showValueChecker = !this.showValueChecker;
    this.drawCanvas();
  }

  setAspectRatio(value: string): void {
    this.selectedAspectRatio = value;
    this.drawCanvas();
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:mozfullscreenchange')
  @HostListener('document:MSFullscreenChange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  get measurement(): string {
    if (!this.image) return '--';
    return `${(this.imageWidth / this.pixelsPerUnit).toFixed(1)} x ${(this.imageHeight / this.pixelsPerUnit).toFixed(1)} ${this.unit}`;
  }

  @HostListener('window:resize') onResize(): void {
    this.drawCanvas();
  }

  onCanvasPointerDown(event: MouseEvent): void {
    const canvas = this.artboard?.nativeElement;
    if (!canvas) return;

    if (event.shiftKey) {
      this.isPanning = true;
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
      return;
    }

    if (!this.annotationMode || !this.image) return;

    const point = this.getCanvasPoint(event);
    this.pendingStroke = { color: this.annotationColor, size: this.annotationSize, points: [point] };
  }

  onCanvasPointerMove(event: MouseEvent): void {
    if (this.isPanning) {
      this.panX = this.panStartX + (event.clientX - this.pointerStartX);
      this.panY = this.panStartY + (event.clientY - this.pointerStartY);
      this.drawCanvas();
      return;
    }

    if (!this.annotationMode || !this.pendingStroke) return;
    const point = this.getCanvasPoint(event);
    this.pendingStroke.points.push(point);
    this.drawCanvas();
  }

  onCanvasPointerUp(): void {
    if (this.pendingStroke) {
      this.annotationStrokes.push(this.pendingStroke);
      this.pendingStroke = null;
      this.drawCanvas();
    }
    this.isPanning = false;
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.artboard?.nativeElement;
    if (!canvas || !this.image || this.annotationMode) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const x = Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * pixelRatio));
    const y = Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * pixelRatio));
    const sample = context.getImageData(x, y, 1, 1).data;
    if (sample[3] > 0) {
      this.sampleColor = this.rgbToHex(sample[0], sample[1], sample[2]);
    }
  }

  toggleAnnotationMode(): void {
    this.annotationMode = !this.annotationMode;
    if (!this.annotationMode) {
      this.pendingStroke = null;
    }
    this.drawCanvas();
  }

  clearAnnotations(): void {
    this.annotationStrokes = [];
    this.pendingStroke = null;
    this.drawCanvas();
  }

  addCurrentColorToPalette(): void {
    if (!this.paletteColors.includes(this.sampleColor)) {
      this.paletteColors.push(this.sampleColor);
      if (this.paletteColors.length > 7) {
        this.paletteColors = this.paletteColors.slice(-7);
      }
    }
  }

  selectPaletteColor(color: string): void {
    this.annotationColor = color;
    this.sampleColor = color;
  }

  private getCanvasPoint(event: MouseEvent): { x: number; y: number } {
    const canvas = this.artboard?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private drawCanvas(): void {
    const canvas = this.artboard?.nativeElement;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, bounds.width * pixelRatio);
    canvas.height = Math.max(1, bounds.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const width = bounds.width;
    const height = bounds.height;

    context.fillStyle = '#1d1e1b';
    context.fillRect(0, 0, width, height);
    if (!this.image) {
      this.drawEmptyState(context, width, height);
      return;
    }

    const scale = this.zoom / 100;
    const drawWidth = this.imageWidth * scale;
    const drawHeight = this.imageHeight * scale;
    const left = (width - drawWidth) / 2;
    const top = (height - drawHeight) / 2;
    const originLeft = left + this.panX;
    const originTop = top + this.panY;
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, .35)';
    context.shadowBlur = 30;
    context.shadowOffsetY = 12;
    if (this.showSplitView && this.compareImage) {
      const compareWidth = this.compareImage.naturalWidth * scale;
      const compareHeight = this.compareImage.naturalHeight * scale;
      const compareLeft = originLeft + drawWidth + 20;
      const compareTop = originTop;
      context.drawImage(this.compareImage, compareLeft, compareTop, compareWidth, compareHeight);
      context.strokeStyle = 'rgba(231, 171, 78, .8)';
      context.lineWidth = 1;
      context.strokeRect(compareLeft - 10, compareTop - 10, compareWidth + 20, compareHeight + 20);
    }
    context.translate(originLeft + drawWidth / 2, originTop + drawHeight / 2);
    context.rotate((this.rotation * Math.PI) / 180);
    context.scale(this.flipHorizontal ? -1 : 1, this.flipVertical ? -1 : 1);
    context.drawImage(this.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    if (this.mirrorMode) this.drawMirrorImage(context, this.image, originLeft, originTop, drawWidth, drawHeight);
    if (this.showGrid) this.drawGrid(context, originLeft, originTop, drawWidth, drawHeight, scale);
    if (this.showGuides) this.drawGuides(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.showSafeFrame) this.drawSafeFrame(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.showCompositionGuides) this.drawCompositionGuides(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.showCropFrame) this.drawCropFrame(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.selectedAspectRatio !== 'free') this.drawAspectRatioFrame(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.showValueChecker) this.drawValueChecker(context, originLeft, originTop, drawWidth, drawHeight);
    if (this.annotationMode || this.annotationStrokes.length > 0 || this.pendingStroke) this.drawAnnotations(context, originLeft, originTop, drawWidth, drawHeight);
  }

  private drawGrid(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, scale: number): void {
    const spacing = Math.max(12, this.gridSize * scale);
    context.save();
    context.beginPath();
    context.rect(left, top, width, height);
    context.clip();
    context.strokeStyle = this.withAlpha(this.gridColor, this.gridOpacity);
    context.lineWidth = 0.5;
    for (let x = left; x <= left + width; x += spacing) {
      context.moveTo(x, top);
      context.lineTo(x, top + height);
    }
    for (let y = top; y <= top + height; y += spacing) {
      context.moveTo(left, y);
      context.lineTo(left + width, y);
    }
    context.stroke();
    context.restore();
  }

  private drawGuides(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = 'rgba(231, 171, 78, .8)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left + width / 2, top - 18);
    context.lineTo(left + width / 2, top + height + 18);
    context.moveTo(left - 18, top + height / 2);
    context.lineTo(left + width + 18, top + height / 2);
    context.stroke();
    context.restore();
  }

  private drawMirrorImage(context: CanvasRenderingContext2D, image: HTMLImageElement, left: number, top: number, width: number, height: number): void {
    context.save();
    context.translate(left + width / 2, top + height / 2);
    context.scale(-1, 1);
    context.translate(-(left + width / 2), -(top + height / 2));
    context.globalAlpha = 0.55;
    context.drawImage(image, left, top, width, height);
    context.restore();
  }

  private drawSafeFrame(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    const margin = Math.min(width, height) * 0.12;
    context.save();
    context.setLineDash([8, 8]);
    context.strokeStyle = 'rgba(143, 223, 179, 0.8)';
    context.lineWidth = 1;
    context.strokeRect(left + margin, top + margin, width - margin * 2, height - margin * 2);
    context.restore();
  }

  private drawCompositionGuides(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    context.save();
    context.setLineDash([6, 8]);
    context.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    context.lineWidth = 1;
    const oneThirdX = left + width / 3;
    const twoThirdX = left + (width * 2) / 3;
    const oneThirdY = top + height / 3;
    const twoThirdY = top + (height * 2) / 3;
    context.beginPath();
    context.moveTo(oneThirdX, top);
    context.lineTo(oneThirdX, top + height);
    context.moveTo(twoThirdX, top);
    context.lineTo(twoThirdX, top + height);
    context.moveTo(left, oneThirdY);
    context.lineTo(left + width, oneThirdY);
    context.moveTo(left, twoThirdY);
    context.lineTo(left + width, twoThirdY);
    context.stroke();
    context.restore();
  }

  private drawCropFrame(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    const cropRatio = 3 / 2;
    const cropWidth = width * 0.76;
    const cropHeight = cropWidth / cropRatio;
    const cropLeft = left + (width - cropWidth) / 2;
    const cropTop = top + (height - cropHeight) / 2;
    context.save();
    context.setLineDash([2, 8]);
    context.strokeStyle = 'rgba(231, 171, 78, 0.72)';
    context.lineWidth = 1.2;
    context.strokeRect(cropLeft, cropTop, cropWidth, cropHeight);
    context.restore();
  }

  private drawAspectRatioFrame(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    const ratioMap: Record<string, number> = {
      '1:1': 1,
      '4:3': 4 / 3,
      '3:2': 3 / 2,
      '16:9': 16 / 9
    };
    const ratio = ratioMap[this.selectedAspectRatio] ?? 1;
    const frameWidth = Math.min(width, height * ratio);
    const frameHeight = frameWidth / ratio;
    const frameLeft = left + (width - frameWidth) / 2;
    const frameTop = top + (height - frameHeight) / 2;
    context.save();
    context.setLineDash([10, 8]);
    context.strokeStyle = 'rgba(143, 223, 179, 0.85)';
    context.lineWidth = 1.1;
    context.strokeRect(frameLeft, frameTop, frameWidth, frameHeight);
    context.restore();
  }

  private drawValueChecker(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    context.save();
    context.globalAlpha = 0.3;
    context.filter = 'grayscale(1) brightness(0.7)';
    context.drawImage(this.image as HTMLImageElement, left, top, width, height);
    context.restore();
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }

  private withAlpha(hexColor: string, opacity: number): string {
    const value = hexColor.replace('#', '');
    const normalized = value.length === 3
      ? value.split('').map((char) => char + char).join('')
      : value;
    const numeric = Number.parseInt(normalized, 16);
    const r = (numeric >> 16) & 255;
    const g = (numeric >> 8) & 255;
    const b = numeric & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  private drawAnnotations(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    context.save();
    context.beginPath();
    context.rect(left, top, width, height);
    context.clip();
    const allStrokes = this.pendingStroke ? [...this.annotationStrokes, this.pendingStroke] : this.annotationStrokes;
    for (const stroke of allStrokes) {
      if (!stroke.points.length) continue;
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let index = 1; index < stroke.points.length; index += 1) {
        const point = stroke.points[index];
        context.lineTo(point.x, point.y);
      }
      context.stroke();
    }
    context.restore();
  }

  private drawEmptyState(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.strokeStyle = 'rgba(207, 202, 183, .12)';
    context.lineWidth = 1;
    context.setLineDash([4, 8]);
    context.strokeRect(40, 40, width - 80, height - 80);
    context.setLineDash([]);
    context.fillStyle = '#cfcab7';
    context.textAlign = 'center';
    context.font = '600 16px Georgia, serif';
    context.fillText('Bring a reference into the light', width / 2, height / 2 - 10);
    context.fillStyle = '#8f9188';
    context.font = '13px Arial, sans-serif';
    context.fillText('Open an image to begin measuring and studying', width / 2, height / 2 + 18);
  }
}
