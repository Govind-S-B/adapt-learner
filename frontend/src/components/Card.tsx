import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Card({ title, onClick, disabled = false }: CardProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-8 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
    >
      <motion.h3 
        className="text-2xl font-bold text-gray-800"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {title}
      </motion.h3>
    </motion.button>
  );
}