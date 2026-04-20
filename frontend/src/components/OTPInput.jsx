import React, { useState, useRef, useEffect } from 'react';

export default function OTPInput({ length = 6, onComplete, disabled }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto-focus next input
    if (element.value !== "" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Trigger onComplete if all digits filled
    if (newOtp.every(val => val !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    data.split("").forEach((char, index) => {
      if (index < length) newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // Focus last character-filled input or the one after it
    const lastIndex = Math.min(data.length, length - 1);
    inputRefs.current[lastIndex].focus();

    if (newOtp.every(val => val !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {otp.map((data, index) => (
        <input
          key={index}
          type="text"
          maxLength="1"
          ref={(el) => (inputRefs.current[index] = el)}
          value={data}
          disabled={disabled}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="w-12 h-16 text-center text-2xl font-black brutal-input bg-white focus:bg-primary/20 focus:outline-none transition-all"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
