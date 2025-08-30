import React from "react";
import PropTypes from "prop-types";

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize = 3,
  showGradient = true,
  reverse = false,
}) => {
  return (
    <div className={`h-full relative w-full ${containerClassName || ''}`}>
      {/* Animated dots background */}
      <div className="h-full w-full overflow-hidden">
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-white/10 via-transparent to-white/5"></div>
        </div>
      </div>
      
      {/* Optional gradient overlay */}
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};

// PropTypes validation
CanvasRevealEffect.propTypes = {
  animationSpeed: PropTypes.number,
  colors: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  containerClassName: PropTypes.string,
  dotSize: PropTypes.number,
  showGradient: PropTypes.bool,
  reverse: PropTypes.bool
};
