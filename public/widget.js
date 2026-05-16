(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  const mode = script.getAttribute('data-mode') || 'float';
  const targetId = script.getAttribute('data-target-id');
  const appUrl = script.src.split('/widget.js')[0];

  if (!chatbotId) {
    console.error('JCaesar Widget: Missing data-chatbot-id');
    return;
  }

  // Fetch Config
  fetch(`${appUrl}/api/widget/${chatbotId}`)
    .then(res => res.json())
    .then(config => {
      if (config.error) {
        console.error('JCaesar Widget:', config.error);
        return;
      }
      initWidget(config);
    })
    .catch(err => console.error('JCaesar Widget: Failed to load config', err));

  function initWidget(config) {
    const style = document.createElement('style');
    style.textContent = `
      .jcaesar-widget-container {
        font-family: ${config.fontFamily || 'Inter, sans-serif'};
        z-index: 999999;
      }
      
      .jcaesar-widget-float {
        position: fixed;
        bottom: 20px;
        right: 20px;
      }
      
      .jcaesar-widget-bubble {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${config.primaryColor || '#000000'};
        box-shadow: ${config.widgetShadow || '0 10px 40px rgba(0,0,0,0.15)'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .jcaesar-widget-bubble:hover { transform: scale(1.1) rotate(5deg); }
      .jcaesar-widget-bubble svg { width: 30px; height: 30px; fill: white; }

      .jcaesar-iframe-container {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 400px;
        height: 600px;
        max-height: calc(100vh - 120px);
        max-width: calc(100vw - 40px);
        overflow: hidden;
        display: none;
        background: white;
        border: 1px solid rgba(0,0,0,0.05);
        transition: all 0.3s ease;
        border-radius: ${config.borderRadius || '24px'};
        box-shadow: ${config.widgetShadow || '0 10px 50px rgba(0,0,0,0.15)'};
      }

      .jcaesar-iframe-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
      }
      .jcaesar-iframe-popup {
        width: 800px;
        height: 600px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
        background: white;
        border-radius: ${config.borderRadius || '32px'};
        box-shadow: ${config.widgetShadow || '0 20px 80px rgba(0,0,0,0.3)'};
      }

      .jcaesar-widget-inline {
        width: 100%;
        height: 600px;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.05);
        background: white;
        border-radius: ${config.borderRadius || '20px'};
      }

      .jcaesar-open { display: flex !important; animation: jcaesar-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      
      @keyframes jcaesar-slide-up {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);

    const createIframe = () => {
      const iframe = document.createElement('iframe');
      iframe.src = `${appUrl}/widget/${chatbotId}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      return iframe;
    };

    if (mode === 'float') {
      const container = document.createElement('div');
      container.className = 'jcaesar-widget-container jcaesar-widget-float';
      
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'jcaesar-iframe-container';
      iframeContainer.appendChild(createIframe());
      
      const bubble = document.createElement('div');
      bubble.className = 'jcaesar-widget-bubble';
      bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338C8.47 21.513 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.474 0-2.85-.4-4.021-1.1L5 19.7l.8-2.979C5.1 15.55 4.7 14.174 4.7 12.7c0-4.025 3.275-7.3 7.3-7.3s7.3 3.275 7.3 7.3-3.275 7.3-7.3 7.3z"/></svg>';
      
      bubble.onclick = () => iframeContainer.classList.toggle('jcaesar-open');
      
      container.appendChild(iframeContainer);
      container.appendChild(bubble);
      document.body.appendChild(container);
    } 
    else if (mode === 'popup') {
      const overlay = document.createElement('div');
      overlay.className = 'jcaesar-iframe-popup-overlay';
      
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'jcaesar-iframe-popup';
      iframeContainer.appendChild(createIframe());
      
      overlay.appendChild(iframeContainer);
      document.body.appendChild(overlay);

      window.openJCaesarPopup = () => overlay.classList.add('jcaesar-open');
      overlay.onclick = (e) => { if(e.target === overlay) overlay.classList.remove('jcaesar-open'); };
    }
    else if (mode === 'inline') {
      const target = targetId ? document.getElementById(targetId) : script.parentElement;
      if (target) {
        const inlineContainer = document.createElement('div');
        inlineContainer.className = 'jcaesar-widget-inline';
        inlineContainer.appendChild(createIframe());
        target.appendChild(inlineContainer);
      }
    }
  }
})();
