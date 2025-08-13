import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Direct Login Test</title>
    </head>
    <body style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h1>Direct Login Test</h1>
        <p>This will test login directly to the backend.</p>
        
        <button onclick="testLogin()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Test Login with simple@admin.com / simple
        </button>
        
        <div id="result" style="margin-top: 20px; padding: 20px; background: #f5f5f5; display: none;">
            <h3>Result:</h3>
            <pre id="resultContent"></pre>
        </div>
        
        <script>
            async function testLogin() {
                const resultDiv = document.getElementById('result');
                const resultContent = document.getElementById('resultContent');
                
                resultDiv.style.display = 'block';
                resultContent.textContent = 'Testing...';
                
                try {
                    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: 'simple@admin.com',
                            password: 'simple'
                        })
                    });
                    
                    const data = await response.json();
                    
                    resultContent.textContent = JSON.stringify({
                        status: response.status,
                        ok: response.ok,
                        data: data
                    }, null, 2);
                    
                    if (response.ok) {
                        resultDiv.style.background = '#d4edda';
                        if (process.env.NODE_ENV === 'development') {
                                                  }
                    } else {
                        resultDiv.style.background = '#f8d7da';
                        if (process.env.NODE_ENV === 'development') {
                                                  }
                    }
                } catch (error) {
                    resultContent.textContent = 'Network Error: ' + error.message;
                    resultDiv.style.background = '#f8d7da';
                    if (process.env.NODE_ENV === 'development') {
                                          }
                }
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
