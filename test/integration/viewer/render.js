// @ts-check
const { escapeHTML } = require('../../../src/utils');

/**
 * @param {string} title
 * @param {string} actual
 * @param {string} expected
 */
function renderTestDiff(title, actual, expected) {
  return `
    <div class="test-case">
      <h2>${title}</h2>
      <div class="row">
        <div>
          <h3>Actual</h3>
          <div class="output">${renderInIframe(actual)}</div>
        </div>
        <div>
          <h3>Expected</h3>
          <div class="output">${renderInIframe(expected)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {string} title
 * @param {string} content
 */
function renderNewCase(title, content) {
  return `
  <div class="test-case">
    <h2>${title} (new)</h2>
    <div class="row">
      <div class="output">${renderInIframe(content)}</div>
      <pre class="html"><code>${escapeHTML(content)}</code></div>
    </div>
  </div>
`;
}

/** @param {string} html */
function renderInIframe(html) {
  return `
  <iframe srcdoc="${escapeHTML(`
    <html>
      <head>
        <style>
          .grvsc-container {
            --grvsc-line-highlighted-background-color: rgba(255, 255, 255, 0.2); /* default: transparent */
            --grvsc-line-highlighted-border-color: rgba(255, 255, 255, 0.5); /* default: transparent */
            --grvsc-line-highlighted-border-width: 2px; /* default: 2px */
          }
        </style>
      </head>
      <body style="padding: 0; margin: 0">${html}</body>
    </html>
  `)}"></iframe>`;
}

/** @param {string} casesHTML */
function renderDocument(casesHTML) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>gatsby-remark-vscode - Integration tests</title>
      <style>
        .header { padding: 20px; background-color: #fafafa; }
        .cases { margin: 0 auto; max-width: 1100px; padding: 40px 20px; }
        .test-case { padding: 20px; }
        .test-case:nth-child(:even) { background-color: #fafafa; }
        .row { margin-top: 20px; display: flex; justify-content: space-between; }
        .row > * { flex: 0 0 calc(50% - 10px); padding: 10px; overflow: auto; box-sizing: border-box; }
        .output { margin-right: 20px; }
        .html { margin: 0; border-radius: 4px; background-color: #e9e9e9; padding: 10px; }
        iframe { border: none; width: 100%; }
      </style>
    </head>
    <body>
      <div class="header">
        Body class:
        <button onclick="setBodyClass('')">Clear</button>
        <button onclick="setBodyClass('dark')">.dark</button>
      </div>
      <div class="cases">
        ${casesHTML}
      </div>
      <script>
        function resizeIFrameToFitContent(iFrame) {
          iFrame.width  = iFrame.contentWindow.document.documentElement.scrollWidth;
          iFrame.height = iFrame.contentWindow.document.documentElement.scrollHeight;
        }
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            Array.from(document.querySelectorAll('iframe')).forEach(el => {
              resizeIFrameToFitContent(el);
            });
          }, 100);
        });
        function setBodyClass(bodyClass) {
          Array.from(document.querySelectorAll('iframe')).forEach(el => {
            el.contentWindow.document.body.className = bodyClass;
          });
        }
      </script>
    </body>
    </html>
  `;
}

module.exports = { renderTestDiff, renderNewCase, renderDocument };
