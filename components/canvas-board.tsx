"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { useMenuStore, useToolbarStore } from "@/store";
import { ACTION_MENU_ITEMS, ACTIVE_MENU_ITEMS } from "@/constants";

const CanvasBoard = () => {
  const { theme } = useTheme();

  const { activeMenuItem, actionMenuItem, setActionMenu } = useMenuStore();
  const { tools } = useToolbarStore();

  const { color, size } = tools[activeMenuItem];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldDraw = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const canvasHistory = useRef<ImageData[]>([]);
  const historyPosition = useRef(0);

  // Handle action menu items
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    if (actionMenuItem === ACTION_MENU_ITEMS.DOWNLOAD) {
      const URL = canvas.toDataURL();

      ctx.fillStyle = theme === "dark" ? "#09090B" : "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const link = document.createElement("a");
      link.href = URL;
      link.download = `Skribbl-${Date.now()}.jpg`;
      link.click();
    } else if (
      actionMenuItem === ACTION_MENU_ITEMS.UNDO ||
      actionMenuItem === ACTION_MENU_ITEMS.REDO
    ) {
      if (
        historyPosition.current > 0 &&
        actionMenuItem === ACTION_MENU_ITEMS.UNDO
      ) {
        historyPosition.current--;
        ctx.putImageData(canvasHistory.current[historyPosition.current], 0, 0);
      }

      if (
        historyPosition.current < canvasHistory.current.length - 1 &&
        actionMenuItem === ACTION_MENU_ITEMS.REDO
      ) {
        historyPosition.current++;
        ctx.putImageData(canvasHistory.current[historyPosition.current], 0, 0);
      }
    } else if (actionMenuItem === ACTION_MENU_ITEMS.CLEAR) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      canvasHistory.current.push(imageData);
      historyPosition.current = canvasHistory.current.length - 1;
      ctx.putImageData(canvasHistory.current[historyPosition.current], 0, 0);

      setActionMenu(null);
    }

    setActionMenu(null);
  }, [actionMenuItem, setActionMenu, theme]);

  // Initialize canvas and background
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const palmImage = new Image();
    palmImage.src = "/pal.png"; // Ensure this file is in the public/ folder

    palmImage.onload = () => {
      const imgAspect = palmImage.width / palmImage.height;
      const canvasAspect = canvas.width / canvas.height;

      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasAspect > imgAspect) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(palmImage, offsetX, offsetY, drawWidth, drawHeight);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvasHistory.current.push(imageData);
      historyPosition.current = canvasHistory.current.length - 1;
    };

    const handleStartDrawing = (x: number, y: number) => {
      shouldDraw.current = true;

      ctx.beginPath();
      ctx.moveTo(x, y);

      startX.current = x;
      startY.current = y;
    };

    const handleDrawing = (x: number, y: number) => {
      if (!shouldDraw.current) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (canvasHistory.current.length > 0) {
        ctx.putImageData(canvasHistory.current[historyPosition.current], 0, 0);
      }

      if (activeMenuItem === ACTIVE_MENU_ITEMS.LINE) {
        ctx.beginPath();
        ctx.moveTo(startX.current, startY.current);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeMenuItem === ACTIVE_MENU_ITEMS.RECTANGLE) {
        const width = x - startX.current;
        const height = y - startY.current;

        ctx.strokeRect(startX.current, startY.current, width, height);
      } else if (activeMenuItem === ACTIVE_MENU_ITEMS.DIAMOND) {
        const width = x - startX.current;
        const height = y - startY.current;

        ctx.beginPath();
        ctx.moveTo(startX.current + width / 2, startY.current);
        ctx.lineTo(startX.current, startY.current + height / 2);
        ctx.lineTo(startX.current + width / 2, startY.current + height);
        ctx.lineTo(startX.current + width, startY.current + height / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (activeMenuItem === ACTIVE_MENU_ITEMS.ELLIPSE) {
        const radiusX = Math.abs(x - startX.current);
        const radiusY = Math.abs(y - startY.current);

        ctx.beginPath();
        ctx.ellipse(
          startX.current,
          startY.current,
          radiusX,
          radiusY,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };

    const handleStopDrawing = () => {
      shouldDraw.current = false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvasHistory.current.push(imageData);
      historyPosition.current = canvasHistory.current.length - 1;
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleStartDrawing(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleDrawing(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleStopDrawing();
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStartDrawing(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDrawing(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleStopDrawing();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);

      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeMenuItem, color, size]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
  }, [color, size]);

  return <canvas ref={canvasRef}></canvas>;
};

export default CanvasBoard;
