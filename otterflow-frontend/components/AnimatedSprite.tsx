"use client";

import React, { useState, useEffect } from "react";

const AnimatedSprite: React.FC = () => {
  // Array of sprite image URLs (ensure these images are in your public folder)
  const images = ["/otterleft.jpeg", "/otterright.jpeg", "/otterpointing.jpeg"];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        let nextIndex = prevIndex + 1;
        if (nextIndex >= images.length) {
          // When the cycle is complete, reset the index and increase the offset
          nextIndex = 0;
          setOffset((prevOffset) => prevOffset + 20); // Adjust 20px as needed
        }
        return nextIndex;
      });
    }, 500); // Cycle every 500ms; adjust as needed
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        transform: `translateX(${offset}px)`,
        transition: "transform 0.5s linear",
      }}
    >
      <img
        src={images[currentIndex]}
        alt="Animated Otter"
        style={{ width: "40px", height: "40px" }} // Adjust size as needed
      />
    </div>
  );
};

export default AnimatedSprite;
