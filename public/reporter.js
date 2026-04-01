// 🔱 SALTY PRE-FLIGHT REPORTER
// This script runs before ANY module to catch evaluation crashes.
(function() {
  if (typeof window === 'undefined') return;
  
  function report(msg, err) {
    var div = document.createElement('div');
    div.id = 'salty-emergency-report';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff9f0;color:#1a1a1a;padding:50px;z-index:999999999;font-family:monospace;overflow:auto;line-height:1.6;border:10px solid #D4AF37;';
    div.innerHTML = '<h1 style="color:#D4AF37;font-size:32px;margin-top:0;">🔱 SALTY EMERGENCY RADAR: CRASH DETECTED</h1>' +
      '<p style="background:rgba(212,175,55,0.1);padding:15px;border-radius:8px;"><b>Error Message:</b> ' + msg + '</p>' +
      '<div style="margin-top:20px;"><b>Technical Stack Trace:</b></div>' +
      '<pre style="background:#0A192F;color:#D4AF37;padding:25px;border-radius:12px;white-space:pre-wrap;font-size:12px;margin-top:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">' + (err && err.stack ? err.stack : (err ? JSON.stringify(err, null, 2) : "No diagnostic data available")) + '</pre>' +
      '<div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(0,0,0,0.1);font-size:11px;opacity:0.6;">' +
        '<div><b>Context:</b> ' + navigator.userAgent + '</div>' +
        '<div><b>Location:</b> ' + window.location.href + '</div>' +
      '</div>' +
      '<button onclick="window.location.reload(true)" style="margin-top:30px;padding:15px 40px;background:#0A192F;color:#D4AF37;border:none;border-radius:50px;cursor:pointer;font-weight:900;text-transform:uppercase;letter-spacing:2px;box-shadow:0 10px 20px rgba(0,0,0,0.2);">Force System Purge</button>';
    
    if (document.body) {
      document.body.appendChild(div);
    } else {
      window.addEventListener('DOMContentLoaded', function() { document.body.appendChild(div); });
    }
  }

  window.addEventListener('error', function(e) { report(e.message, e.error); });
  window.addEventListener('unhandledrejection', function(e) { report('Unhandled Rejection', e.reason); });
  console.log("🔱 Salty Pre-flight Radar: ARMED");
})();
