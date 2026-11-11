/**
 * Bored AI Web — Universal Bug Report & Telemetry Widget
 * Automatically captures console errors and provides a tiny floating button
 * to report broken sites via GitHub Issues on dmytro-filatov-88/bored-ai-web.
 */
(function () {
  if (window.__BORED_AI_WIDGET_LOADED__) return;
  window.__BORED_AI_WIDGET_LOADED__ = true;

  var capturedErrors = [];
  var pathParts = window.location.pathname.split('/').filter(Boolean);
  var siteSlug = window.__BORED_AI_SLUG__ || pathParts[0] || document.title || 'unknown-site';

  window.addEventListener('error', function (e) {
    capturedErrors.push(
      (e.message || 'Error') + ' at ' + (e.filename || 'inline') + ':' + (e.lineno || 0)
    );
    if (capturedErrors.length > 5) capturedErrors.shift();
    highlightBugButton();
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : 'Unhandled rejection';
    capturedErrors.push('Promise Rejection: ' + reason);
    if (capturedErrors.length > 5) capturedErrors.shift();
    highlightBugButton();
  });

  var btn = null;
  function highlightBugButton() {
    if (!btn) return;
    btn.style.borderColor = '#ff4757';
    btn.style.boxShadow = '0 0 12px rgba(255, 71, 87, 0.6)';
  }

  function createWidget() {
    var container = document.createElement('div');
    container.id = 'bored-ai-floating-bar';
    container.style.cssText = [
      'position:fixed',
      'bottom:12px',
      'right:12px',
      'z-index:2147483647',
      'display:flex',
      'gap:6px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'font-size:12px',
      'user-select:none'
    ].join(';');

    var hubLink = document.createElement('a');
    hubLink.href = 'https://dmytro-filatov-88.github.io/bored-ai-web/';
    hubLink.target = '_blank';
    hubLink.rel = 'noopener';
    hubLink.textContent = '🎲 Bored AI Web';
    hubLink.title = 'Back to Bored AI Web Hub';
    hubLink.style.cssText = [
      'background:rgba(15,15,20,0.72)',
      'color:rgba(255,255,255,0.85)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'border:1px solid rgba(255,255,255,0.15)',
      'border-radius:999px',
      'padding:5px 10px',
      'text-decoration:none',
      'transition:all 0.2s ease',
      'line-height:1'
    ].join(';');
    hubLink.onmouseenter = function () { hubLink.style.background = 'rgba(30,30,42,0.95)'; };
    hubLink.onmouseleave = function () { hubLink.style.background = 'rgba(15,15,20,0.72)'; };

    btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🐛 Fix Site';
    btn.title = 'Site broken or buggy? Tell the AI agent to fix it!';
    btn.style.cssText = [
      'background:rgba(15,15,20,0.72)',
      'color:rgba(255,255,255,0.85)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'border:1px solid rgba(255,255,255,0.15)',
      'border-radius:999px',
      'padding:5px 10px',
      'cursor:pointer',
      'font:inherit',
      'transition:all 0.2s ease',
      'line-height:1'
    ].join(';');
    btn.onmouseenter = function () { btn.style.background = 'rgba(255,71,87,0.85)'; };
    btn.onmouseleave = function () { btn.style.background = 'rgba(15,15,20,0.72)'; };

    btn.onclick = function () {
      var note = window.prompt(
        'What is broken on "' + siteSlug + '"? (Leave blank if it just doesn\'t work)',
        ''
      );
      if (note === null) return;

      var title = '[BROKEN] ' + siteSlug + (note ? ': ' + note.slice(0, 60) : '');
      var errorBlock = capturedErrors.length
        ? '\n\n### Captured Console Errors\n```\n' + capturedErrors.join('\n') + '\n```'
        : '\n\n_No console exceptions captured automatically._';

      var body = [
        '### Broken Site Report',
        '- **Slug**: `' + siteSlug + '`',
        '- **URL**: ' + window.location.href,
        '- **User Note**: ' + (note || '_No details provided — please inspect and repair._'),
        '- **Viewport**: ' + window.innerWidth + 'x' + window.innerHeight,
        '- **User-Agent**: `' + navigator.userAgent + '`',
        errorBlock
      ].join('\n');

      var issueUrl =
        'https://github.com/dmytro-filatov-88/bored-ai-web/issues/new?labels=broken-site&title=' +
        encodeURIComponent(title) +
        '&body=' +
        encodeURIComponent(body);

      window.open(issueUrl, '_blank', 'noopener');
    };

    container.appendChild(hubLink);
    container.appendChild(btn);
    document.body.appendChild(container);
    if (capturedErrors.length > 0) highlightBugButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
