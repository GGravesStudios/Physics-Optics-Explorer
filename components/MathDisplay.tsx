import React from 'react';
import Equation from './Equation';

// This component acts as an adapter to migrate away from KaTeX.
// It uses the text-based Equation component instead.

interface MathDisplayProps {
  latex: string;
  block?: boolean;
}

const MathDisplay: React.FC<MathDisplayProps> = ({ latex, block = false }) => {
  return <Equation latex={latex} inline={!block} />;
};

export default MathDisplay;
