'use client';

import { useEffect } from 'react';

export function ForceLightMode() {
  useEffect(() => {
    // Remove dark class from documentElement
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    
    // Ensure light mode is applied
    document.documentElement.style.colorScheme = 'light';
    
    // Remove any theme from localStorage
    localStorage.removeItem('theme');
    
    // Create a MutationObserver to prevent dark class from being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains('dark')) {
            target.classList.remove('dark');
          }
        }
      });
    });
    
    // Observe changes to html and body elements
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return null;
}