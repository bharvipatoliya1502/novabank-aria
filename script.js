// ============================================
// NovaBank ARIA — Frontend Script
// ============================================

(function () {
  'use strict';

  // --- DOM Elements ---
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const charCounter = document.getElementById('charCounter');
  const departmentSelect = document.getElementById('departmentSelect');
  const headerDeptBadge = document.getElementById('headerDeptBadge');
  const typingIndicator = document.getElementById('typingIndicator');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const welcomeSection = document.getElementById('welcomeSection');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  // --- State ---
  const MAX_CHARS = 500;
  let conversationHistory = []; // { role: 'user'|'assistant', content: string }
  let isWaiting = false;

  // --- Headset SVG Icon (for ARIA avatar) ---
  const HEADSET_SVG_SM = '<img src="https://img.icons8.com/color/96/headset--v1.png" width="30" height="30" alt="ARIA" style="display:block;">';
  const HEADSET_SVG_LG = '<img src="https://img.icons8.com/color/96/headset--v1.png" width="30" height="30" alt="ARIA" style="display:block;">';

  // --- Quick Reply Definitions ---
  const quickReplies = {
    'General Support': [
      'What are your branch timings?',
      'How to contact customer care?',
      'Where is the nearest branch?',
      'What services does NovaBank offer?'
    ],
    'Account & Balance': [
      'How do I check my account balance?',
      'How to open a new savings account?',
      'I need my account statement',
      'How to update my KYC details?'
    ],
    'Card Services': [
      'I want to block my debit card',
      'How to apply for a credit card?',
      'What is my credit card limit?',
      'Report a lost card'
    ],
    'Loan & EMI': [
      'What are your home loan rates?',
      'How to check my EMI status?',
      'I want to apply for a personal loan',
      'How to foreclose my loan?'
    ],
    'Transaction Disputes': [
      'I have an unauthorized transaction',
      'My payment failed but money was debited',
      'I want to raise a dispute',
      'Refund is not yet received'
    ],
    'Internet Banking': [
      'I forgot my net banking password',
      'How to register for mobile banking?',
      'How to set up UPI?',
      'My internet banking is locked'
    ]
  };

  // --- Initialize ---
  // --- Session Timer ---
  let sessionSeconds = 0;
  const sessionTimerEl = document.getElementById('sessionTimer');

  function startSessionTimer() {
    setInterval(function () {
      sessionSeconds++;
      var mins = Math.floor(sessionSeconds / 60);
      var secs = sessionSeconds % 60;
      if (sessionTimerEl) {
        sessionTimerEl.textContent =
          (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      }
    }, 1000);
  }

  function init() {
    setupEventListeners();
    showQuickReplies(departmentSelect.value);
    startSessionTimer();
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Send message
    sendBtn.addEventListener('click', handleSend);

    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Character counter & auto-resize
    chatInput.addEventListener('input', function () {
      updateCharCounter();
      autoResize();
      sendBtn.disabled = chatInput.value.trim().length === 0 || isWaiting;
    });

    // Department change
    departmentSelect.addEventListener('change', function () {
      headerDeptBadge.textContent = this.value;
      showQuickReplies(this.value);
    });

    // Clear chat
    clearChatBtn.addEventListener('click', clearChat);

    // Mobile menu
    mobileMenuBtn.addEventListener('click', function () {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // --- Character Counter ---
  function updateCharCounter() {
    const len = chatInput.value.length;
    charCounter.textContent = len + ' / ' + MAX_CHARS;
    charCounter.classList.remove('warning', 'limit');
    if (len >= MAX_CHARS) {
      charCounter.classList.add('limit');
    } else if (len >= MAX_CHARS * 0.85) {
      charCounter.classList.add('warning');
    }
  }

  // --- Auto Resize Textarea ---
  function autoResize() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }

  // --- Send Message ---
  function handleSend() {
    const text = chatInput.value.trim();
    if (!text || isWaiting) return;

    // Hide welcome
    if (welcomeSection) {
      welcomeSection.style.display = 'none';
    }

    // Remove existing quick replies
    removeQuickReplies();

    // Add user message to UI
    appendMessage('user', text);

    // Add to history
    conversationHistory.push({ role: 'user', content: text });

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateCharCounter();
    sendBtn.disabled = true;

    // Show typing indicator
    showTyping(true);
    isWaiting = true;

    // Send to backend
    sendToBackend(text);
  }

  // --- Backend Communication ---
  async function sendToBackend(message) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: conversationHistory.slice(0, -1), // Send all history except current message (it's included by server)
          department: departmentSelect.value
        })
      });

      const data = await response.json();

      showTyping(false);
      isWaiting = false;

      if (data.error) {
        appendMessage('assistant', 'I apologize, but I encountered an issue: ' + data.error + '\nPlease try again. Is there anything else I can assist you with today?');
      } else {
        appendMessage('assistant', data.reply);
        conversationHistory.push({ role: 'assistant', content: data.reply });
      }

      // Show quick replies after assistant response
      showQuickReplies(departmentSelect.value);

    } catch (error) {
      showTyping(false);
      isWaiting = false;
      appendMessage('assistant', 'I apologize, but I\'m unable to connect to the server right now. Please check your connection and try again. Is there anything else I can assist you with today?');
    }
  }

  // --- Render Message ---
  function appendMessage(role, content) {
    var div = document.createElement('div');
    div.className = 'message ' + role;

    var avatarContent = role === 'assistant' ? HEADSET_SVG_SM : 'U';
    var timeStr = formatTime(new Date());

    div.innerHTML =
      '<div class="msg-avatar">' + avatarContent + '</div>' +
      '<div class="msg-content">' +
        '<div class="msg-bubble">' + escapeHTML(content) + '</div>' +
        '<span class="msg-time">' + timeStr + '</span>' +
      '</div>';

    chatMessages.appendChild(div);
    scrollToBottom();
  }

  // --- Quick Replies ---
  function showQuickReplies(department) {
    removeQuickReplies();

    var replies = quickReplies[department];
    if (!replies) return;

    var container = document.createElement('div');
    container.className = 'quick-replies';
    container.id = 'quickRepliesContainer';

    replies.forEach(function (text) {
      var btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = text;
      btn.addEventListener('click', function () {
        chatInput.value = text;
        updateCharCounter();
        sendBtn.disabled = false;
        handleSend();
      });
      container.appendChild(btn);
    });

    chatMessages.appendChild(container);
    scrollToBottom();
  }

  function removeQuickReplies() {
    var existing = document.getElementById('quickRepliesContainer');
    if (existing) existing.remove();
  }

  // --- Typing Indicator ---
  function showTyping(visible) {
    if (visible) {
      typingIndicator.classList.add('active');
      scrollToBottom();
    } else {
      typingIndicator.classList.remove('active');
    }
  }

  // --- Clear Chat ---
  function clearChat() {
    conversationHistory = [];
    chatMessages.innerHTML = '';

    // Re-add welcome section
    var welcome = document.createElement('div');
    welcome.className = 'welcome-section';
    welcome.id = 'welcomeSection';
    welcome.innerHTML =
      '<div class="welcome-icon">' + HEADSET_SVG_LG + '</div>' +
      '<h1 class="welcome-title">Welcome to NovaBank</h1>' +
      '<p class="welcome-sub">Welcome to NovaBank Customer Support. I am ARIA, your dedicated virtual banking assistant. I am available around the clock to assist you with account enquiries, card services, loan support, and more. Please select a department from the sidebar or type your query to get started.</p>';
    chatMessages.appendChild(welcome);

    showQuickReplies(departmentSelect.value);
  }

  // --- Utilities ---
  function scrollToBottom() {
    requestAnimationFrame(function () {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    var minStr = minutes < 10 ? '0' + minutes : '' + minutes;
    return hours + ':' + minStr + ' ' + ampm;
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Boot ---
  init();
})();
