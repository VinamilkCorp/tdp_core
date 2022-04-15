import * as React from 'react';

interface HexSizeSliderProps {
  callback: (n: number) => void;
  currentValue: number;
}

export function HexSizeSlider({ callback, currentValue }: HexSizeSliderProps) {
  return (
    <div className="ps-2 pt-1 m-0">
      <label htmlFor="alphaSlider" className="form-label m-0 p-0">
        Hex Size
      </label>
      <input
        type="range"
        onChange={(e) => callback(+e.currentTarget.value)}
        className="form-range"
        value={currentValue}
        min="3"
        max="30"
        step="1"
        id="alphaSlider"
      />
    </div>
  );
}
