import React from 'react';
import ReactDOM from 'react-dom';
import './style.css'
import { materialLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const App: React.FC = () => {

  const jsCode = `
import { useDraggableAnimation, useSliderAnimation } from 'steper';

const ref = document.getElementById('list');

useDraggableAnimation(ref, onDragStart, onDragEnd);
const sliderAnimation = useSliderAnimation(ref, duration, onSlideStart, onSlideEnd);

const moveNext = () => sliderAnimation(1);
const movePrev = () => sliderAnimation(-1);
`;

const htmlCode = `
<ul id="list" style="display: flex">
  <li>Slide 1</li>
  <li>Slide 2</li>
  <li>Slide 3</li>
</ul>

<button onClick={movePrev}>Previous</button>
<button onClick={moveNext}>Next</button>
`;

const cssCode = `
ul {
  display: flex;
  gap: 1em;
}`;
  return (
    <div>
      <h1>Steper Demo</h1>
      <ul>
        <li>Slide 1</li>
        <li>Slide 2</li>
        <li>Slide 3</li>
      </ul>

      <h2>HTML</h2>  
      <SyntaxHighlighter language="html" style={materialLight}>
        {htmlCode}
      </SyntaxHighlighter>
   
      <h2>JS</h2>
      <SyntaxHighlighter language="javascript" style={materialLight}>
        {jsCode}
      </SyntaxHighlighter>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));

