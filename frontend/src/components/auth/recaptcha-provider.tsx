'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Script from 'next/script';

interface ReCAPTCHAContextType {
  publicKey: string;
  enabled: boolean;
  loaded: boolean;
}

const ReCAPTCHAContext = createContext<ReCAPTCHAContextType>({
  publicKey: '',
  enabled: false,
  loaded: false,
});

export const useReCAPTCHA = () => useContext(ReCAPTCHAContext);

interface ReCAPTCHAProviderProps {
  children: React.ReactNode;
  publicKey?: string;
  enabled?: boolean;
}

export function ReCAPTCHAProvider({
  children,
  publicKey = process.env.NEXT_PUBLIC_RECAPTCHA_PUBLIC_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Test key
  enabled = process.env.NEXT_PUBLIC_ENABLE_CAPTCHA !== 'false',
}: ReCAPTCHAProviderProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <ReCAPTCHAContext.Provider value={{ publicKey, enabled, loaded }}>
      {enabled && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${publicKey}`}
          onLoad={() => setLoaded(true)}
        />
      )}
      {children}
    </ReCAPTCHAContext.Provider>
  );
}