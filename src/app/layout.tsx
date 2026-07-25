import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ClientLayout } from '@/components/ClientLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CanIRun.AI | Local AI Model Compatibility Checker',
    template: '%s | CanIRun.AI',
  },
  description:
    'Check if your hardware can run local AI models. Get compatibility status, deployment commands, and cloud alternatives for LLMs, image generators, and more.',
  keywords: [
    'AI model compatibility',
    'local AI',
    'GPU requirements',
    'LLM deployment',
    'Stable Diffusion',
    'Ollama',
    'hardware checker',
    'AI inference',
    'model requirements',
  ],
  authors: [{ name: 'CanIRun.AI' }],
  generator: 'Next.js',
  openGraph: {
    title: 'CanIRun.AI | Can Your Hardware Run Local AI?',
    description:
      'Instantly check if your GPU, CPU, and RAM can run the latest AI models. Get deployment guides and cloud alternatives.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CanIRun.AI | Local AI Model Compatibility Checker',
    description:
      'Check hardware compatibility for running local AI models. LLMs, image generators, video models, and more.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {isDev && <Inspector />}
          <ErrorBoundary>
            <ClientLayout>{children}</ClientLayout>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
