// Utility functions and easing interpolations
const interpolate = (currentX: number, targetX: number, damping: number): number => {
  return currentX + (targetX - currentX) * damping;
};

// Ease-In-Out interpolation
const easeInOut = (currentX: number, targetX: number): number => {
  const t = 0.2;
  return interpolate(currentX, targetX, t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
};

const easeInP = (p: number) => p * p;
const easeOutP = (p: number) => 1 - Math.pow(1 - p, 2);

const easeInOutP = (p: number) => (1 - p) * easeInP(p) + p * easeOutP(p);

// Get the nearest list item
const getNearestListItem = (ref: HTMLElement) => {
  const items = Array.from(ref.children || []) as HTMLElement[];
  const containerRect = ref.getBoundingClientRect();
  const currentX = parseFloat(ref.style.transform.replace('translateX(', '').replace('px)', '')) || 0;

  let distance = Infinity;
  let snapLeft = 0;
  let slideIndex = 0;

  items.forEach((slide, index) => {
    const slideRect = slide.getBoundingClientRect();
    const slideLeft = containerRect.left - slideRect.left;
    const dist = slideLeft - currentX;

    if (Math.abs(dist) < distance) {
      distance = dist;
      slideIndex = index;
      snapLeft = slideLeft;
    }
  });

  return { index: slideIndex, targetX: snapLeft, currentX };
};

const setDataAttribute = (ref: HTMLElement, mode: string) => {
  if (!ref) return;
  ref.dataset.stepperMode = mode;
};

const hasDataAttribute = (ref: HTMLElement, mode: string): boolean => ref.dataset.stepperMode === mode;

const useDraggableAnimation = (
  ref: HTMLElement,
  onDragStart?: (slideElement?: HTMLElement) => void,
  onDragEnd?: (slideElement?: HTMLElement) => void
): (() => void) => {
  const draggingMode = 'dragging';
  const isDragging = { current: false };
  const dragStartX = { current: null as number | null };
  const dragCurrentX = { current: null as number | null };
  const startX = { current: 0 };
  const animationRef = { current: null as number | null };
  let targetIndex = 0;

  const setTranslateX = (x: number) => {
    if (ref) {
      ref.style.transform = `translateX(${x}px)`;
    }
  };

  const animate = () => {
    if (dragCurrentX.current !== null && dragStartX.current !== null) {
      const deltaX = dragCurrentX.current - dragStartX.current;
      const targetX = startX.current + deltaX;
      const currentX = parseFloat(ref.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
      const newX = easeInOut(currentX, targetX);

      setTranslateX(newX);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const snapAnimate = (targetX: number) => {
    if (isDragging.current) return;
    const currentX = parseFloat(ref.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
    const newX = interpolate(currentX, targetX, 0.05);
    setTranslateX(newX);

    const distance = Math.abs(Math.round(targetX - newX));
    if (distance > 0 && hasDataAttribute(ref, draggingMode)) {
      requestAnimationFrame(() => snapAnimate(targetX));
    } else {
      setDataAttribute(ref, '');
      const nearestItem = getNearestListItem(ref);
      onDragEnd && onDragEnd(ref.children[nearestItem.index] as HTMLElement);
    }
  };

  const mouseDown = (e: MouseEvent) => {
    e.preventDefault();

    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragCurrentX.current = e.clientX;
    const nearestItem = getNearestListItem(ref);
    startX.current = nearestItem.currentX;
    ref.style.willChange = 'transform';

    onDragStart && onDragStart(ref.children[nearestItem.index]  as HTMLElement);
    animationRef.current = requestAnimationFrame(animate);
  };

  const mouseMove = (e: MouseEvent) => {
    if (isDragging.current) dragCurrentX.current = e.clientX;
  };

  const mouseUp = () => {
    if (!isDragging.current) return;

    isDragging.current = false;
    dragStartX.current = null;
    dragCurrentX.current = null;
    cancelAnimationFrame(animationRef.current!);
    ref.style.willChange = 'auto';

    const nearestItem = getNearestListItem(ref);
    setDataAttribute(ref, draggingMode);
    requestAnimationFrame(() => snapAnimate(nearestItem.targetX));
    targetIndex = nearestItem.index;
  };

  ref.addEventListener('mousedown', mouseDown);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mouseup', mouseUp);

  return () => {
    ref.removeEventListener('mousedown', mouseDown);
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('mouseup', mouseUp);
    cancelAnimationFrame(animationRef.current!);
  };
};

const useSliderAnimation = (
  ref: HTMLElement,
  duration = 1,
  onSlideStart?: (slideElement: HTMLElement) => void,
  onSlideEnd?: (slideElement: HTMLElement) => void
) => {
  const animationRef = { current: null as number | null };
  const startTimestamp = { current: null as number | null };

  const animate = (timestamp: number, startX: number, endX: number, duration: number, el: HTMLElement) => {
    if (!startTimestamp.current) {
      startTimestamp.current = timestamp;
      onSlideStart?.(el);
    }

    const elapsed = timestamp - startTimestamp.current;
    const progress = Math.min(elapsed / duration, 1);
    const p = easeInOutP(progress);
    const currentX = startX + (endX - startX) * p;

    if (ref) {
      ref.style.transform = `translateX(${currentX}px)`;
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame((ts) => animate(ts, startX, endX, duration, el));
    } else {
      onSlideEnd?.(el);
      startTimestamp.current = null;
    }
  };

  const move = (step: number): number => {
    if (!ref) return 0;

    const nearestItem = getNearestListItem(ref);
    const targetIndex = nearestItem.index + step;

    if (targetIndex < 0 || ref.children.length - 1 < targetIndex) return nearestItem.index;

    const slidesRect = ref.getBoundingClientRect();
    const el = ref.children[targetIndex] as HTMLElement;
    const targetSlideRect = el.getBoundingClientRect();
    const targetX = slidesRect.x - targetSlideRect.x;

    if (nearestItem.targetX - targetX === 0) return targetIndex;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      startTimestamp.current = null;
    }

    setDataAttribute(ref, 'sliding');
    const durationInMilliSec = duration * 1000;
    animationRef.current = requestAnimationFrame((timestamp) =>
      animate(timestamp, nearestItem.currentX, targetX, durationInMilliSec, el)
    );

    return targetIndex;
  };

  return move;
};

// Export the vanilla JS functions
export { useDraggableAnimation, useSliderAnimation, interpolate, easeInOut, easeInOutP };
