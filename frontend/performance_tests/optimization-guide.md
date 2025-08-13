# Frontend Performance Optimization Guide

## 🎯 Performance Targets

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Total Blocking Time (TBT)**: < 300ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s

## 🚀 Implemented Optimizations

### 1. Code Splitting & Lazy Loading

```typescript
// Dynamic imports for route-based splitting
const DashboardPage = dynamic(() => import('./dashboard-produccion/page'), {
  loading: () => <DashboardSkeleton />,
  ssr: false // Disable SSR for heavy components
});

// Component-level lazy loading
const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});
```

### 2. Image Optimization

```typescript
// Use Next.js Image component with optimization
import Image from 'next/image';

<Image
  src="/court-image.jpg"
  alt="Court"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  priority={isAboveFold}
  quality={85}
  formats={['webp', 'avif']}
/>

// Responsive images
<Image
  src="/hero.jpg"
  alt="Hero"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  fill
  style={{ objectFit: 'cover' }}
/>
```

### 3. Bundle Size Optimization

```javascript
// next.config.js
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  webpack: (config, { isServer }) => {
    // Tree shaking for lodash
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es',
    };
    
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : '../analyze/client.html',
        })
      );
    }
    
    return config;
  },
};
```

### 4. React Performance Optimizations

```typescript
// Memoization for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.data.id === nextProps.data.id;
});

// Use callback for event handlers
const handleClick = useCallback((id: string) => {
  // Handle click
}, [dependencies]);

// UseMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => b.score - a.score);
}, [data]);

// Virtualization for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )}
</FixedSizeList>
```

### 5. API Response Caching

```typescript
// SWR for data fetching with caching
import useSWR from 'swr';

const { data, error, isLoading } = useSWR(
  '/api/courts/availability',
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
    fallbackData: cachedData,
  }
);

// React Query alternative
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['courts', date],
  queryFn: () => fetchCourtAvailability(date),
  staleTime: 60 * 1000, // 1 minute
  cacheTime: 5 * 60 * 1000, // 5 minutes
});
```

### 6. Critical CSS & Font Loading

```typescript
// _document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://api.padelyzer.com" />
        
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Critical CSS inline */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### 7. Service Worker & PWA

```javascript
// public/sw.js
const CACHE_NAME = 'padelyzer-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache first, then network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

### 8. Render Optimization Techniques

```typescript
// Debounce expensive operations
import { debounce } from 'lodash-es';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchCourts(query);
  }, 300),
  []
);

// Intersection Observer for lazy rendering
const LazyComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={ref}>
      {isVisible ? <ExpensiveComponent /> : <Placeholder />}
    </div>
  );
};
```

## 📊 Performance Monitoring

### 1. Web Vitals Tracking

```typescript
// pages/_app.tsx
import { reportWebVitals } from 'next/web-vitals';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics
  if (metric.label === 'web-vital') {
    console.log(metric);
    
    // Send to your analytics service
    analytics.track('Web Vitals', {
      metric: metric.name,
      value: Math.round(metric.value),
      label: metric.label,
    });
  }
}
```

### 2. Custom Performance Marks

```typescript
// Measure specific operations
performance.mark('search-start');

// Perform search
const results = await searchCourts(query);

performance.mark('search-end');
performance.measure('court-search', 'search-start', 'search-end');

const measure = performance.getEntriesByName('court-search')[0];
console.log(`Court search took ${measure.duration}ms`);
```

## 🛠️ Build Optimizations

### 1. Next.js Configuration

```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compress: true,
  
  experimental: {
    optimizeCss: true,
    legacyBrowsers: false,
  },
  
  images: {
    domains: ['images.padelyzer.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|avif)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
```

### 2. TypeScript Optimization

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "removeComments": true,
    "moduleResolution": "bundler",
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

## 📱 Mobile Performance

### 1. Touch Optimization

```typescript
// Reduce touch delay
const handleTouch = (e: TouchEvent) => {
  e.preventDefault(); // Prevent 300ms delay
  // Handle touch
};

// Passive event listeners
useEffect(() => {
  const element = ref.current;
  if (element) {
    element.addEventListener('touchstart', handleTouch, { passive: true });
  }
  
  return () => {
    if (element) {
      element.removeEventListener('touchstart', handleTouch);
    }
  };
}, []);
```

### 2. Viewport Optimization

```html
<!-- Prevent zooming and optimize viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

<!-- iOS specific optimizations -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

## 🔍 Performance Debugging

### 1. Chrome DevTools Performance

```javascript
// Add performance markers
performance.mark('component-render-start');

// Component logic

performance.mark('component-render-end');
performance.measure('component-render', 'component-render-start', 'component-render-end');
```

### 2. React DevTools Profiler

- Enable "Record why each component rendered"
- Look for unnecessary re-renders
- Check render duration
- Identify expensive components

### 3. Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run analyze

# Check for:
# - Large dependencies
# - Duplicate modules
# - Unused exports
```

## 📈 Continuous Monitoring

### 1. Lighthouse CI in GitHub Actions

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lhci:mobile
      - uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci
```

### 2. Real User Monitoring (RUM)

```typescript
// Track real user metrics
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  fetch('/api/analytics/performance', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    }),
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```