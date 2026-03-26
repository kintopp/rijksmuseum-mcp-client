import { useEffect, useRef, useCallback, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { useViewerStore } from '../hooks/useViewerStore.js';
import { parseRegion } from '../lib/types.js';

export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const { iiifUrl, meta, pendingNavigation, clearNavigation, selectRegion } = useViewerStore();
  const [selectMode, setSelectMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const selectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const v = OpenSeadragon({
      element: containerRef.current,
      prefixUrl: '/osd-images/',
      crossOriginPolicy: 'Anonymous',
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      navigatorSizeRatio: 0.15,
      gestureSettingsMouse: { scrollToZoom: true },
      animationTime: 0.5,
      springStiffness: 10,
      maxZoomPixelRatio: 3,
    });
    viewerRef.current = v;
    return () => {
      v.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !iiifUrl) return;
    v.open(iiifUrl as any);
  }, [iiifUrl]);

  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !pendingNavigation) return;

    // Convert pct:x,y,w,h to OSD viewport rect using image dimensions
    const pctToViewport = (region: string): OpenSeadragon.Rect | null => {
      const r = parseRegion(region);
      if (!r) return null;
      const size = v.world.getItemAt(0)?.getContentSize();
      if (!size) return null;
      const imgRect = new OpenSeadragon.Rect(r.x * size.x, r.y * size.y, r.w * size.x, r.h * size.y);
      return v.viewport.imageToViewportRectangle(imgRect);
    };

    if (pendingNavigation.region) {
      const rect = pctToViewport(pendingNavigation.region);
      if (rect) v.viewport.fitBounds(rect);
    }
    if (pendingNavigation.overlays) {
      v.clearOverlays();
      for (const ol of pendingNavigation.overlays) {
        const rect = pctToViewport(ol.region);
        if (!rect) continue;
        const el = document.createElement('div');
        el.className = 'viewer-overlay';
        el.style.border = `2px solid ${ol.color ?? '#ff0000'}`;
        if (ol.label) el.title = ol.label;
        v.addOverlay({ element: el, location: rect });
      }
    }
    clearNavigation();
  }, [pendingNavigation, clearNavigation]);

  // Disable OSD mouse handling when in select mode
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    v.setMouseNavEnabled(!selectMode);
  }, [selectMode]);

  // Selection mode mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!selectMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [selectMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectMode || !dragStart || !selectionRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const sel = selectionRef.current;
    sel.style.display = 'block';
    sel.style.left = `${Math.min(dragStart.x, curX)}px`;
    sel.style.top = `${Math.min(dragStart.y, curY)}px`;
    sel.style.width = `${Math.abs(curX - dragStart.x)}px`;
    sel.style.height = `${Math.abs(curY - dragStart.y)}px`;
  }, [selectMode, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!selectMode || !dragStart) return;
    const v = viewerRef.current;
    if (!v) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    // Convert screen pixels → viewport coords → image coords → percentages
    const vp1 = v.viewport.pointFromPixel(new OpenSeadragon.Point(Math.min(dragStart.x, curX), Math.min(dragStart.y, curY)));
    const vp2 = v.viewport.pointFromPixel(new OpenSeadragon.Point(Math.max(dragStart.x, curX), Math.max(dragStart.y, curY)));
    const img1 = v.viewport.viewportToImageCoordinates(vp1);
    const img2 = v.viewport.viewportToImageCoordinates(vp2);

    const imgSize = v.world.getItemAt(0)?.getContentSize();
    if (!imgSize) return;

    const pctX = Math.max(0, (img1.x / imgSize.x) * 100);
    const pctY = Math.max(0, (img1.y / imgSize.y) * 100);
    const pctW = Math.max(1, ((img2.x - img1.x) / imgSize.x) * 100);
    const pctH = Math.max(1, ((img2.y - img1.y) / imgSize.y) * 100);

    const region = `pct:${pctX.toFixed(1)},${pctY.toFixed(1)},${pctW.toFixed(1)},${pctH.toFixed(1)}`;
    selectRegion(region);

    setDragStart(null);
    setSelectMode(false);
    if (selectionRef.current) selectionRef.current.style.display = 'none';
  }, [selectMode, dragStart, selectRegion]);

  const doZoomIn = useCallback(() => viewerRef.current?.viewport.zoomBy(1.5), []);
  const doZoomOut = useCallback(() => viewerRef.current?.viewport.zoomBy(0.667), []);
  const doHome = useCallback(() => viewerRef.current?.viewport.goHome(), []);
  const doRotateLeft = useCallback(() => {
    const v = viewerRef.current;
    if (v) v.viewport.setRotation(v.viewport.getRotation() - 90);
  }, []);
  const doRotateRight = useCallback(() => {
    const v = viewerRef.current;
    if (v) v.viewport.setRotation(v.viewport.getRotation() + 90);
  }, []);
  const doFullscreen = useCallback(() => {
    const v = viewerRef.current;
    if (v) v.setFullScreen(!v.isFullPage());
  }, []);

  const subtitle = [meta?.creator, meta?.date, meta?.objectNumber].filter(Boolean).join('\u2003\u2003');

  return (
    <div className="viewer-container">
      {meta && (
        <div className="viewer-header">
          <div className="viewer-header-text">
            <h1 className="viewer-title">{meta.title}</h1>
            {subtitle && <div className="viewer-subtitle">{subtitle}</div>}
          </div>
          {meta.collectionUrl && (
            <a href={meta.collectionUrl} target="_blank" rel="noopener" className="viewer-rijks-link">
              Rijksmuseum
            </a>
          )}
        </div>
      )}
      <div className="viewer-osd-wrap">
        <div
          ref={containerRef}
          className={`viewer-osd ${selectMode ? 'select-mode' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        <div ref={selectionRef} className="viewer-selection" style={{ display: 'none' }} />
        {iiifUrl && (
          <div className="viewer-toolbar">
            <button onClick={() => setShowHelp(!showHelp)} title="Keyboard shortcuts" className={showHelp ? 'toolbar-active' : ''}>?</button>
            <button onClick={doZoomIn} title="Zoom in">+</button>
            <button onClick={doZoomOut} title="Zoom out">&minus;</button>
            <button onClick={doHome} title="Reset view" className="toolbar-wide">Reset</button>
            <button onClick={doRotateLeft} title="Rotate left">&#x21bb;</button>
            <button onClick={doRotateRight} title="Rotate right">&#x21ba;</button>
            <button onClick={doFullscreen} title="Fullscreen">&#x2317;</button>
            <span className="toolbar-sep" />
            <button
              onClick={() => { setSelectMode(!selectMode); setDragStart(null); if (selectionRef.current) selectionRef.current.style.display = 'none'; }}
              title="Select region"
              className={selectMode ? 'toolbar-active' : ''}
            >&#x25fb;</button>
          </div>
        )}
        {showHelp && (
          <div className="viewer-help-overlay">
            <div className="viewer-help">
              <h3>Keyboard shortcuts</h3>
              <table>
                <tbody>
                  <tr><td>Scroll</td><td>Zoom in / out</td></tr>
                  <tr><td>Click + drag</td><td>Pan</td></tr>
                  <tr><td>+&ensp;/&ensp;-</td><td>Zoom in / out</td></tr>
                  <tr><td>0</td><td>Reset view</td></tr>
                  <tr><td>r&ensp;/&ensp;R</td><td>Rotate right / left</td></tr>
                  <tr><td>f</td><td>Fullscreen</td></tr>
                </tbody>
              </table>
              <button onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        )}
        {selectMode && (
          <div className="viewer-select-hint">
            Drag to select a region — coordinates will be added to your prompt
          </div>
        )}
      </div>
      {meta && (
        <div className="viewer-footer">
          {meta.license && <span className="viewer-license">{meta.license}</span>}
          {meta.physicalDimensions && <span className="viewer-dims">{meta.physicalDimensions}</span>}
        </div>
      )}
      {!iiifUrl && (
        <div className="viewer-placeholder">
          Ask the assistant to show an artwork and it will appear here
        </div>
      )}
    </div>
  );
}
