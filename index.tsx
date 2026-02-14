
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>PerHea Readiness | Elite Performance</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand-indigo: #4f46e5;
      --brand-slate: #0f172a;
    }
    body { 
      font-family: 'Plus Jakarta Sans', sans-serif; 
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: contain;
    }
    #panic-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: white;
      z-index: 9999;
      padding: 2rem;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
  </style>
  <script>
    // Robust error handler to catch "White Screen" crashes
    function showPanic(msg, stack) {
      const overlay = document.getElementById('panic-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        document.getElementById('panic-msg').innerText = msg || 'Unknown Error';
        document.getElementById('panic-stack').innerText = stack || 'No stack trace available';
      }
    }

    window.onerror = function(msg, url, line, col, error) {
      showPanic(msg, error ? error.stack : 'Line: ' + line);
      return false;
    };

    window.addEventListener('unhandledrejection', function(event) {
      showPanic('Promise Rejection: ' + event.reason);
    });

    // Catch module loading errors
    window.addEventListener('error', function(e) {
      if (e.target.tagName === 'SCRIPT') {
        showPanic('Failed to load script: ' + e.target.src);
      }
    }, true);
  </script>
<script type="importmap">
{
  "imports": {
    "recharts": "https://esm.sh/recharts@^3.7.0",
    "react-dom/": "https://esm.sh/react-dom@^19.2.4/",
    "@google/genai": "https://esm.sh/@google/genai@^1.40.0",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "react/": "https://esm.sh/react@^19.2.4/",
    "react": "https://esm.sh/react@^19.2.4"
  }
}
</script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
  <div id="root">
    <div class="min-h-screen flex items-center justify-center text-slate-400 font-medium">
      Initializing Arena...
    </div>
  </div>
  
  <!-- Panic Screen for Debugging -->
  <div id="panic-overlay">
    <div class="max-w-md">
      <div class="text-rose-600 text-6xl mb-4">⚠️</div>
      <h1 class="text-2xl font-black mb-2">Application Crash</h1>
      <p id="panic-msg" class="text-slate-600 mb-6 font-mono text-sm bg-slate-100 p-4 rounded-xl break-all"></p>
      <details class="text-left text-[10px] text-slate-400 font-mono">
        <summary class="cursor-pointer mb-2">View Technical Stack Trace</summary>
        <pre id="panic-stack" class="whitespace-pre-wrap max-h-40 overflow-auto bg-slate-50 p-2"></pre>
      </details>
      <button onclick="window.location.reload()" class="mt-8 px-8 py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg">Reload Application</button>
    </div>
  </div>

  <script type="module" src="index.tsx"></script>
</body>
</html>
