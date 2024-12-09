import React from 'react';
import { motion } from 'framer-motion';

export function Header() {
  return (
    <div className="bg-white shadow-sm relative">
      <motion.h1
        className="text-2xl font-bold text-gray-800 p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        --
      </motion.h1>
    </div>
  );
}
