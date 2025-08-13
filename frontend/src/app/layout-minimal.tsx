import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Padelyzer',
  description: 'Advanced Padel Analytics Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}