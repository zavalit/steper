# Steper

A lightweight JavaScript library for draggable and slider animations.

## Installation

```bash
npm install steper
```

## Usage

```javascript
import { useDraggableAnimation, useSliderAnimation } from 'steper';

// Initialize your elements and use the functions as need

```

## API

### useDraggableAnimation(ref, onDragStart, onDragEnd)
* ref: The reference to the HTML element.
* onDragStart: Callback function when dragging starts.
* onDragEnd: Callback function when dragging ends.

### useSliderAnimation(ref, duration, onSlideStart, onSlideEnd)
* ref: The referenceC to the HTML element.
* duration: Duration of the slide animation.
* onSlideStart: Callback function when sliding starts.
* onSlideEnd: Callback function when sliding ends.

## License

MIT