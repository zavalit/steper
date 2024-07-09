// Utility functions and easing interpolations
const interpolate = (currentX: number, targetX: number, damping: number): number => {
  return currentX + (targetX - currentX) * damping;
};

// Ease-In-Out interpolation
const easeInOut = (currentX: number, targetX: number): number => {
  const t = 0.2;
  return interpolate(currentX, targetX, t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
};

const easeInOutP = (p: number): number => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

// Get the nearest list item
const getNearestListItem = (ref: HTMLElement): { index: number; targetX: number; currentX: number } => {
  const items = Array.from(ref.children) as HTMLElement[];
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

const getListItemXByIndex = (ref: HTMLElement, index: number): number => {
  const containerRect = ref.getBoundingClientRect();
  const items = Array.from(ref.children) as HTMLElement[];
  const indexRect = items[index]?.getBoundingClientRect();

  return indexRect ? containerRect.left - indexRect.left : 0;
};

const setXByIndex = (ref: HTMLElement, index: number): void => {
  const x = getListItemXByIndex(ref, index);
  setTranslateX(ref, x);
};

const setClass = (ref: HTMLElement, className: string): void => {
  ref.className = '';
  className && ref.classList.add(className);
};

const hasClass = (ref: HTMLElement, className: string): boolean => ref.classList.contains(className);

const setTranslateX = (ref: HTMLElement, x: number): void => {
  if (ref) {
    ref.style.transform = `translateX(${x}px)`;
  }
};

type SignalCB = (value: number) => void;

class Signal {
  private cbs: SignalCB[] = [];

  add(cb: SignalCB): void {
    this.cbs.push(cb);
  }

  fire(value: number): void {
    this.cbs.forEach(cb => cb(value));
  }

  destroy(): void {
    this.cbs = [];
  }
}

const draggableAnimation = (
  ref: HTMLElement,
  onDragStart?: (el: HTMLElement) => void,
  onDragEnd?: (el: HTMLElement) => void
): [Signal, () => void] => {
  const draggingClassName = 'dragging';
  let isDragging = false;
  let dragStartX: number | null = null;
  let dragCurrentX: number | null = null;
  let startX = 0;
  let animationRef: number | null = null;
  const targetIndex = { current: 0 };

  const targetIndexSignal = new Signal();
  targetIndexSignal.add(value => (targetIndex.current = value));

  const animate = (): void => {
    if (dragCurrentX !== null && dragStartX !== null) {
      const deltaX = dragCurrentX - dragStartX;
      const targetX = startX + deltaX;
      const currentX = parseFloat(ref.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
      const newX = easeInOut(currentX, targetX);

      setTranslateX(ref, newX);
    }

    animationRef = requestAnimationFrame(animate);
  };

  const snapAnimate = (targetX: number): void => {
    if (isDragging) return;
    const currentX = parseFloat(ref.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
    const newX = interpolate(currentX, targetX, 0.05);
    setTranslateX(ref, newX);

    const distance = Math.abs(Math.round(targetX - newX));
    if (distance > 0 && hasClass(ref, draggingClassName)) {
      requestAnimationFrame(() => snapAnimate(targetX));
    } else {
      setClass(ref, '');
      const nearestItem = getNearestListItem(ref);
      onDragEnd && onDragEnd(ref.children[nearestItem.index] as HTMLElement);
    }
  };

  const startDrag = (clientX: number): void => {
    isDragging = true;
    dragStartX = clientX;
    dragCurrentX = clientX;
    const nearestItem = getNearestListItem(ref);
    startX = nearestItem.currentX;
    ref.style.willChange = 'transform';

    onDragStart && onDragStart(ref.children[nearestItem.index] as HTMLElement);
    animationRef = requestAnimationFrame(animate);
  };

  const stopDrag = (): void => {
    if (!isDragging) return;

    isDragging = false;
    dragStartX = null;
    dragCurrentX = null;
    if (animationRef !== null) cancelAnimationFrame(animationRef);
    ref.style.willChange = 'auto';

    const nearestItem = getNearestListItem(ref);
    setClass(ref, draggingClassName);
    requestAnimationFrame(() => snapAnimate(nearestItem.targetX));
    targetIndexSignal.fire(nearestItem.index);
  };

  const mouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    startDrag(e.clientX);
  };

  const mouseMove = (e: MouseEvent): void => {
    if (isDragging) dragCurrentX = e.clientX;
  };

  const mouseUp = (): void => stopDrag();

  const touchStart = (e: TouchEvent): void => {
    e.preventDefault();
    startDrag(e.touches[0].clientX);
  };

  const touchMove = (e: TouchEvent): void => {
    if (isDragging) dragCurrentX = e.touches[0].clientX;
  };

  const touchEnd = (): void => stopDrag();

  ref.addEventListener('mousedown', mouseDown);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mouseup', mouseUp);

  ref.addEventListener('touchstart', touchStart);
  window.addEventListener('touchmove', touchMove);
  window.addEventListener('touchend', touchEnd);

  return [
    targetIndexSignal,
    () => {
      ref.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);

      ref.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);

      targetIndexSignal.destroy();
      if (animationRef !== null) cancelAnimationFrame(animationRef);
    },
  ];
};

const sliderAnimation = (
  ref: HTMLElement,
  duration: number = 1,
  onSlideStart?: (el: HTMLElement) => void,
  onSlideEnd?: (el: HTMLElement) => void
): ((step: number) => number) => {
  if (!ref) {
    console.warn('useSliderAnimation: no parent container');
  }
  let animationRef: number | null = null;
  let startTimestamp: number | null = null;

  const animate = (timestamp: number, startX: number, endX: number, duration: number, el: HTMLElement): void => {
    if (!startTimestamp) {
      startTimestamp = timestamp;
      onSlideStart?.(el);
    }

    const elapsed = timestamp - startTimestamp;
    const progress = Math.min(elapsed / duration, 1);
    const p = easeInOutP(progress);
    const currentX = startX + (endX - startX) * p;

    if (ref) {
      ref.style.transform = `translateX(${currentX}px)`;
    }

    if (progress < 1) {
      animationRef = requestAnimationFrame(ts => animate(ts, startX, endX, duration, el));
    } else {
      onSlideEnd?.(el);
      startTimestamp = null;
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

    if (animationRef) {
      cancelAnimationFrame(animationRef);
      startTimestamp = null;
    }

    setClass(ref, 'sliding');
    const durationInMilliSec = duration * 1000;
    animationRef = requestAnimationFrame(timestamp =>
      animate(timestamp, nearestItem.currentX, targetX, durationInMilliSec, el)
    );

    return targetIndex;
  };

  return move;
};

export { draggableAnimation, sliderAnimation, setXByIndex };
