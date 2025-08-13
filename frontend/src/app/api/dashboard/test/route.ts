import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dashboard BFF Test</title>
        <style>
            body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .result { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; }
            button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin-right: 10px; background: #007bff; color: white; border: none; border-radius: 4px; }
            button:hover { background: #0056b3; }
            pre { white-space: pre-wrap; word-break: break-word; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px; }
            .enabled { background: #d4edda; color: #155724; }
            .disabled { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <h1>Dashboard BFF Endpoint Test</h1>
        <p>Esta página permite probar el nuevo endpoint BFF de dashboard que elimina el hardcoding de clubs.</p>
        
        <div>
            <h3>Feature Flag Status</h3>
            <p>BFF Dashboard: <span id="featureStatus" class="status">Checking...</span></p>
        </div>
        
        <div>
            <button onclick="testBFFEndpoint()">Test BFF Endpoint</button>
            <button onclick="testDirectService()">Test Direct Service</button>
            <button onclick="compareResponses()">Compare Both</button>
        </div>
        
        <div id="result" class="result" style="display: none;">
            <h3>Test Results:</h3>
            <pre id="resultContent"></pre>
        </div>
        
        <script>
            // Check feature flag status
            const bffEnabled = '${process.env.NEXT_PUBLIC_BFF_DASHBOARD}' === 'true';
            document.getElementById('featureStatus').textContent = bffEnabled ? 'ENABLED' : 'DISABLED';
            document.getElementById('featureStatus').className = 'status ' + (bffEnabled ? 'enabled' : 'disabled');
            
            function showResult(content, type = 'result') {
                const resultDiv = document.getElementById('result');
                const resultContent = document.getElementById('resultContent');
                
                resultDiv.style.display = 'block';
                resultDiv.className = 'result ' + type;
                resultContent.textContent = content;
            }
            
            async function testBFFEndpoint() {
                showResult('Testing BFF endpoint...', 'result');
                
                try {
                    const startTime = Date.now();
                    const response = await fetch('/api/dashboard/overview', {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    const duration = Date.now() - startTime;
                    
                    const data = await response.json();
                    
                    const result = {
                        endpoint: 'BFF /api/dashboard/overview',
                        status: response.status,
                        ok: response.ok,
                        duration: duration + 'ms',
                        cacheStatus: response.headers.get('X-Cache') || 'N/A',
                        fallback: response.headers.get('X-Fallback') || 'false',
                        featureEnabled: bffEnabled,
                        dataKeys: Object.keys(data),
                        sampleData: {
                            monthlyRevenue: data.monthlyRevenue,
                            todayReservations: data.todayReservations,
                            activeClients: data.activeClients,
                            occupancyRate: data.occupancyRate,
                            topClientsCount: data.topClients?.length || 0,
                            upcomingEventsCount: data.upcomingEvents?.length || 0
                        }
                    };
                    
                    showResult(JSON.stringify(result, null, 2), response.ok ? 'success' : 'error');
                    
                } catch (error) {
                    showResult('BFF Endpoint Error: ' + error.message, 'error');
                }
            }
            
            async function testDirectService() {
                showResult('Testing direct Django service...', 'result');
                
                try {
                    // This would typically go through the dashboard service
                    // For now, we'll show what would happen
                    const result = {
                        endpoint: 'Direct Django /bi/analytics/club/',
                        note: 'This would use the old hardcoded club mapping',
                        hardcodedEmails: [
                            'letygaez@gmail.com -> 8f3db837-b8f0-4141-abd8-eb9dfff0b27a',
                            'info@clubpadeldemo.com -> 49b44501-d0f2-4235-9af4-ac7e2d2713e4',
                            'test@clubpadel.com -> 011c80d0-4c81-4de2-a4dd-64c3e0205100'
                        ],
                        problem: 'Requires hardcoded email-to-club mapping',
                        solution: 'BFF endpoint uses proper multi-tenant authentication'
                    };
                    
                    showResult(JSON.stringify(result, null, 2), 'warning');
                    
                } catch (error) {
                    showResult('Direct Service Error: ' + error.message, 'error');
                }
            }
            
            async function compareResponses() {
                showResult('Comparing BFF vs Direct approaches...', 'result');
                
                const comparison = {
                    'BFF Approach (/api/dashboard/overview)': {
                        authentication: 'getServerSession() - proper multi-tenant',
                        clubResolution: 'user.club_memberships - dynamic',
                        dataFetching: 'Promise.all() - parallel Django calls',
                        caching: '5 minutes in-memory (Redis ready)',
                        errorHandling: 'Graceful fallbacks + empty metrics',
                        performance: 'Optimized with cache + parallel fetching',
                        maintainability: 'Centralized transformation logic',
                        scalability: 'Multi-tenant ready'
                    },
                    'Direct Approach (dashboard.service.ts)': {
                        authentication: 'useAuthStore client-side',
                        clubResolution: 'Hardcoded email mapping',
                        dataFetching: 'Single Django call with complex fallbacks',
                        caching: 'None',
                        errorHandling: 'Basic try-catch',
                        performance: 'No optimization',
                        maintainability: 'Complex transformation in service',
                        scalability: 'Email hardcoding blocks scaling'
                    },
                    'Migration Strategy': {
                        current: 'BFF as primary, direct as fallback',
                        featureFlag: 'NEXT_PUBLIC_BFF_DASHBOARD=' + bffEnabled,
                        rollout: 'Gradual activation via environment variable',
                        testing: 'A/B test both approaches'
                    }
                };
                
                showResult(JSON.stringify(comparison, null, 2), 'success');
            }
        </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}