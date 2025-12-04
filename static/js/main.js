/**
 * Gemini Studio - Enhanced Frontend Logic
 * 支持多模式生成、搜索增强、图像编辑、思考过程可视化
 */

// ============ State ============
const state = {
    currentConversationId: null,
    conversations: [],
    uploadedFiles: [],
    isGenerating: false,
    currentMode: 'standard', // standard, search, edit
    settingsVisible: false,
    enableContext: false  // 上下文窗口开关，默认关闭以节省算力
};

// Mode configurations
const modeConfig = {
    standard: {
        icon: '🖼️',
        label: '标准生成',
        endpoint: '/api/generate',
        placeholder: '描述你想生成的画面...',
        requiresFiles: false
    },
    search: {
        icon: '🔍',
        label: '搜索增强',
        endpoint: '/api/generate-with-search',
        placeholder: '输入需要搜索并生成的内容，如"今天旧金山的天气预报图表"...',
        requiresFiles: false
    },
    edit: {
        icon: '✏️',
        label: '图像编辑',
        endpoint: '/api/edit-image',
        placeholder: '上传图片后输入编辑指令，如"将文字翻译成中文"或"改为油画风格"...',
        requiresFiles: true
    }
};

// ============ DOM Elements ============
const elements = {
    newChatBtn: document.getElementById('newChatBtn'),
    conversationsList: document.getElementById('conversationsList'),
    messagesContainer: document.getElementById('messagesContainer'),
    messagesList: document.getElementById('messagesList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    uploadedFiles: document.getElementById('uploadedFiles'),
    uploadBtn: document.getElementById('uploadBtn'),
    fileInput: document.getElementById('fileInput'),
    promptInput: document.getElementById('promptInput'),
    aspectRatio: document.getElementById('aspectRatio'),
    imageSize: document.getElementById('imageSize'),
    editType: document.getElementById('editType'),
    editTypeGroup: document.getElementById('editTypeGroup'),
    sendBtn: document.getElementById('sendBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    advancedSettings: document.getElementById('advancedSettings'),
    modeSelector: document.getElementById('modeSelector'),
    currentModeBadge: document.getElementById('currentModeBadge'),
    imageViewer: document.getElementById('imageViewer'),
    viewerImage: document.getElementById('viewerImage'),
    downloadLink: document.getElementById('downloadLink'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebar: document.getElementById('sidebar'),
    enableContext: document.getElementById('enableContext')
};

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    setupEventListeners();
    autoResizeTextarea();
    updateModeUI();
});

function setupEventListeners() {
    // New Chat
    elements.newChatBtn.addEventListener('click', createNewConversation);

    // File Upload
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileUpload);

    // Send Message
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Mode Selection
    elements.modeSelector.addEventListener('click', (e) => {
        const modeBtn = e.target.closest('.mode-btn');
        if (modeBtn) {
            const mode = modeBtn.dataset.mode;
            setMode(mode);
        }
    });

    // Settings Toggle
    elements.settingsBtn.addEventListener('click', () => {
        state.settingsVisible = !state.settingsVisible;
        elements.advancedSettings.classList.toggle('show', state.settingsVisible);
        elements.settingsBtn.classList.toggle('active', state.settingsVisible);
    });

    // Context Toggle
    if (elements.enableContext) {
        elements.enableContext.addEventListener('change', (e) => {
            state.enableContext = e.target.checked;
            if (state.enableContext) {
                showToast('已启用上下文记忆，AI将记住对话历史', 'info');
            } else {
                showToast('已关闭上下文记忆，每次对话独立', 'info');
            }
        });
    }

    // Mobile Menu
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            elements.sidebar.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !elements.mobileMenuBtn.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });

    // Drag & Drop
    const dropZone = elements.messagesContainer;
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', handleDrop);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeImageViewer();
        }
        // Ctrl/Cmd + Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            sendMessage();
        }
    });
}

function autoResizeTextarea() {
    const textarea = elements.promptInput;
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    });
}

// ============ Mode Management ============
function setMode(mode) {
    if (!modeConfig[mode]) return;
    
    state.currentMode = mode;
    updateModeUI();
}

function updateModeUI() {
    const config = modeConfig[state.currentMode];
    
    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
    });
    
    // Update placeholder
    elements.promptInput.placeholder = config.placeholder;
    
    // Update badge
    elements.currentModeBadge.textContent = `${config.icon} ${config.label}`;
    
    // Show/hide edit type selector
    elements.editTypeGroup.style.display = state.currentMode === 'edit' ? 'block' : 'none';
    
    // Visual feedback for edit mode requiring files
    if (state.currentMode === 'edit' && state.uploadedFiles.length === 0) {
        elements.uploadBtn.classList.add('pulse');
    } else {
        elements.uploadBtn.classList.remove('pulse');
    }
}

// ============ Conversation Management ============
async function loadConversations() {
    try {
        const response = await fetch('/api/conversations');
        state.conversations = await response.json();
        renderConversationsList();

        if (state.conversations.length > 0) {
            loadConversation(state.conversations[0].id);
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

function renderConversationsList() {
    elements.conversationsList.innerHTML = state.conversations.map(conv => `
        <div class="conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}" 
             onclick="loadConversation('${conv.id}')">
            <span class="conversation-title" ondblclick="event.stopPropagation(); startEditConversation('${conv.id}')">${escapeHtml(conv.title || '新创作')}</span>
            <div class="conversation-actions">
                <button class="conversation-action-btn" onclick="event.stopPropagation(); startEditConversation('${conv.id}')" title="重命名">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="conversation-action-btn delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="删除">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// 开始编辑会话名称
function startEditConversation(convId) {
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;
    
    const item = document.querySelector(`.conversation-item[onclick*="${convId}"]`);
    if (!item) return;
    
    const titleSpan = item.querySelector('.conversation-title');
    const currentTitle = conv.title || '新创作';
    
    // 替换为输入框
    titleSpan.innerHTML = `
        <input type="text" class="conversation-title-input" 
               value="${escapeHtml(currentTitle)}" 
               onclick="event.stopPropagation()"
               onkeydown="handleEditKeydown(event, '${convId}')"
               onblur="saveConversationTitle('${convId}', this.value)">
    `;
    
    const input = titleSpan.querySelector('input');
    input.focus();
    input.select();
}

// 处理编辑时的键盘事件
function handleEditKeydown(event, convId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        renderConversationsList(); // 取消编辑，重新渲染
    }
}

// 保存会话标题
async function saveConversationTitle(convId, newTitle) {
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;
    
    newTitle = newTitle.trim() || '新创作';
    
    if (newTitle === conv.title) {
        renderConversationsList();
        return;
    }
    
    try {
        await fetch(`/api/conversations/${convId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        });
        
        conv.title = newTitle;
        renderConversationsList();
        showToast('名称已更新', 'success');
    } catch (error) {
        console.error('Failed to update conversation title:', error);
        showToast('更新失败', 'error');
        renderConversationsList();
    }
}

async function createNewConversation() {
    try {
        const response = await fetch('/api/conversations', { method: 'POST' });
        const newConv = await response.json();
        state.conversations.unshift(newConv);
        loadConversation(newConv.id);
        renderConversationsList();

        if (window.innerWidth <= 768) {
            elements.sidebar.classList.remove('open');
        }
    } catch (error) {
        console.error('Failed to create conversation:', error);
    }
}

async function loadConversation(convId) {
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;

    state.currentConversationId = convId;
    renderConversationsList();
    renderMessages(conv.messages || []);

    state.uploadedFiles = [];
    renderUploadedFiles();

    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('open');
    }
}

async function deleteConversation(convId) {
    if (!confirm('确定要删除这个创作吗？')) return;

    try {
        await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
        state.conversations = state.conversations.filter(c => c.id !== convId);

        if (state.currentConversationId === convId) {
            state.currentConversationId = null;
            if (state.conversations.length > 0) {
                loadConversation(state.conversations[0].id);
            } else {
                renderMessages([]);
                elements.welcomeScreen.style.display = 'flex';
            }
        }
        renderConversationsList();
    } catch (error) {
        console.error('Failed to delete conversation:', error);
    }
}

async function updateConversation(messages, title = null) {
    if (!state.currentConversationId) return;

    const data = { messages };
    if (title) data.title = title;

    try {
        await fetch(`/api/conversations/${state.currentConversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const conv = state.conversations.find(c => c.id === state.currentConversationId);
        if (conv) {
            conv.messages = messages;
            if (title) conv.title = title;
            renderConversationsList();
        }
    } catch (error) {
        console.error('Failed to update conversation:', error);
    }
}

// ============ Message Rendering ============
function renderMessages(messages) {
    if (messages.length === 0) {
        elements.welcomeScreen.style.display = 'flex';
        elements.messagesList.innerHTML = '';
    } else {
        elements.welcomeScreen.style.display = 'none';
        elements.messagesList.innerHTML = messages.map((msg, i) => renderMessage(msg, i)).join('');
        scrollToBottom();
    }
}

function renderMessage(msg, index) {
    if (msg.role === 'user') {
        let content = `<div class="message-bubble">${escapeHtml(msg.text || '')}</div>`;
        if (msg.files && msg.files.length > 0) {
            content += `<div class="uploaded-files-preview" style="margin-top: 10px;">
                ${msg.files.map(f =>
                f.mime_type.startsWith('image/')
                    ? `<div class="file-preview-item"><img src="${f.path}" alt="Image" onclick="viewImage('${f.path}')"></div>`
                    : `<span class="file-badge">📄 ${escapeHtml(f.original_name)}</span>`
            ).join('')}
            </div>`;
        }
        if (msg.mode) {
            const modeInfo = modeConfig[msg.mode];
            content += `<div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">${modeInfo?.icon || ''} ${modeInfo?.label || msg.mode}</div>`;
        }
        
        // 用户消息操作按钮（放在气泡左侧）
        const userActions = `
            <div class="user-message-actions">
                <button class="user-action-btn" onclick="retryMessage(${index})" title="重试">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
                <button class="user-action-btn" onclick="deleteUserMessage(${index})" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        return `
            <div class="message user">
                ${userActions}
                <div class="message-content" style="text-align: right;">${content}</div>
                <div class="message-avatar">👤</div>
            </div>
        `;
    } else {
        let content = '';

        // Response Text
        if (msg.text) {
            content += `<div class="response-text">${escapeHtml(msg.text)}</div>`;
        }

        // Thinking Process with Timeline
        if (msg.thinking || (msg.thinking_images && msg.thinking_images.length > 0)) {
            content += renderThinkingProcess(msg.thinking, msg.thinking_images);
        }

        // Grounding Sources
        if (msg.grounding && (msg.grounding.sources?.length > 0 || msg.grounding.search_queries?.length > 0)) {
            content += renderGroundingSources(msg.grounding);
        }

        // Image
        if (msg.image) {
            content += `
                <div class="image-wrapper">
                    <img class="generated-image" src="${msg.image}" alt="Generated Image" onclick="viewImage('${msg.image}')">
                    <div class="image-actions">
                        <a href="${msg.image}" download class="image-action-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            下载
                        </a>
                        <button class="image-action-btn" onclick="copyImageToClipboard('${msg.image}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制
                        </button>
                        <button class="image-action-btn" onclick="editGeneratedImage('${msg.image}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            编辑
                        </button>
                    </div>
                </div>
            `;
        }

        // Error
        if (msg.error) {
            content += `<div class="message-bubble" style="color: var(--accent-error); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-md); padding: 14px 18px;">
                <strong>⚠️ 错误</strong><br>${escapeHtml(msg.error)}
            </div>`;
        }

        const deleteBtn = `<button class="conversation-delete" onclick="deleteMessage(${index})" style="position: absolute; top: 4px; left: -28px; opacity: 0;" title="删除消息">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>`;

        return `
            <div class="message assistant" style="position: relative;" onmouseenter="this.querySelector('.conversation-delete').style.opacity=1" onmouseleave="this.querySelector('.conversation-delete').style.opacity=0">
                <div class="message-avatar">✨</div>
                <div class="message-content">${content}</div>
                ${deleteBtn}
            </div>
        `;
    }
}

function renderThinkingProcess(thinking, thinkingImages = []) {
    const hasContent = thinking || (thinkingImages && thinkingImages.length > 0);
    if (!hasContent) return '';

    let imagesHtml = '';
    if (thinkingImages && thinkingImages.length > 0) {
        imagesHtml = `
            <div class="thinking-images">
                ${thinkingImages.map(img => `
                    <div class="thinking-image-item" onclick="viewImage('${img.path}')">
                        <img src="${img.path}" alt="Thinking image">
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="thinking-process">
            <div class="thinking-header" onclick="toggleThinking(this)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>思考过程</span>
                <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="thinking-content">${escapeHtml(thinking || '(思考过程中生成了图片)')}${imagesHtml}</div>
        </div>
    `;
}

function renderGroundingSources(grounding) {
    if (!grounding) return '';

    let queriesHtml = '';
    if (grounding.search_queries && grounding.search_queries.length > 0) {
        queriesHtml = `
            <div class="grounding-queries">
                ${grounding.search_queries.map(q => `<span class="grounding-query-tag">${escapeHtml(q)}</span>`).join('')}
            </div>
        `;
    }

    let sourcesHtml = '';
    if (grounding.sources && grounding.sources.length > 0) {
        sourcesHtml = `
            <div class="grounding-sources-list">
                ${grounding.sources.map(src => `
                    <a href="${escapeHtml(src.uri)}" target="_blank" rel="noopener" class="grounding-source-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <span>${escapeHtml(src.title)}</span>
                    </a>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="grounding-section">
            <div class="grounding-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>搜索来源</span>
            </div>
            ${queriesHtml}
            ${sourcesHtml}
        </div>
    `;
}

function toggleThinking(header) {
    const content = header.nextElementSibling;
    content.classList.toggle('hidden');
    const chevron = header.querySelector('.chevron');
    if (chevron) {
        chevron.style.transform = content.classList.contains('hidden') ? 'rotate(-90deg)' : 'rotate(0)';
    }
}

async function deleteMessage(index) {
    if (!state.currentConversationId) return;
    if (!confirm('确定要删除这条消息吗？')) return;

    try {
        const response = await fetch(
            `/api/conversations/${state.currentConversationId}/messages/${index}`,
            { method: 'DELETE' }
        );
        const result = await response.json();

        if (result.success) {
            const conv = state.conversations.find(c => c.id === state.currentConversationId);
            if (conv) {
                conv.messages = result.messages;
                renderMessages(conv.messages || []);
                renderConversationsList();
            }
        } else {
            alert('删除失败: ' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('Failed to delete message:', error);
    }
}

// 删除用户消息（同时删除其后续的助理回复）
async function deleteUserMessage(index) {
    if (!state.currentConversationId) return;
    
    const conv = state.conversations.find(c => c.id === state.currentConversationId);
    if (!conv) return;
    
    const msg = conv.messages[index];
    if (!msg || msg.role !== 'user') return;
    
    // 确认删除
    const hasReply = conv.messages[index + 1]?.role === 'assistant';
    const confirmText = hasReply 
        ? '确定要删除这条消息及其AI回复吗？' 
        : '确定要删除这条消息吗？';
    
    if (!confirm(confirmText)) return;
    
    try {
        // 如果有后续的助理回复，先删除它
        if (hasReply) {
            await fetch(
                `/api/conversations/${state.currentConversationId}/messages/${index + 1}`,
                { method: 'DELETE' }
            );
        }
        
        // 再删除用户消息
        const response = await fetch(
            `/api/conversations/${state.currentConversationId}/messages/${index}`,
            { method: 'DELETE' }
        );
        const result = await response.json();

        if (result.success) {
            // 重新加载对话
            const freshResponse = await fetch(`/api/conversations/${state.currentConversationId}`);
            const freshConv = await freshResponse.json();
            
            conv.messages = freshConv.messages || [];
            renderMessages(conv.messages);
            renderConversationsList();
            showToast('消息已删除', 'success');
        }
    } catch (error) {
        console.error('Failed to delete user message:', error);
        showToast('删除失败', 'error');
    }
}

// 重试用户消息（重新发送这条消息）
async function retryMessage(index) {
    if (!state.currentConversationId || state.isGenerating) return;
    
    const conv = state.conversations.find(c => c.id === state.currentConversationId);
    if (!conv) return;
    
    const msg = conv.messages[index];
    if (!msg || msg.role !== 'user') return;
    
    // 获取消息内容
    const prompt = msg.text || '';
    const files = msg.files || [];
    const mode = msg.mode || 'standard';
    
    // 如果有后续的助理回复，先删除它
    if (conv.messages[index + 1]?.role === 'assistant') {
        try {
            await fetch(
                `/api/conversations/${state.currentConversationId}/messages/${index + 1}`,
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error('Failed to delete old reply:', e);
        }
    }
    
    // 删除原用户消息
    try {
        await fetch(
            `/api/conversations/${state.currentConversationId}/messages/${index}`,
            { method: 'DELETE' }
        );
    } catch (e) {
        console.error('Failed to delete original message:', e);
    }
    
    // 设置模式
    setMode(mode);
    
    // 设置上传的文件
    state.uploadedFiles = files.map(f => ({
        filename: f.filename,
        original_name: f.original_name,
        mime_type: f.mime_type,
        path: f.path
    }));
    renderUploadedFiles();
    
    // 设置提示词并发送
    elements.promptInput.value = prompt;
    
    // 重新加载对话以获取最新状态
    const freshResponse = await fetch(`/api/conversations/${state.currentConversationId}`);
    const freshConv = await freshResponse.json();
    conv.messages = freshConv.messages || [];
    renderMessages(conv.messages);
    
    // 发送消息
    sendMessage();
}

function addMessage(msg) {
    elements.welcomeScreen.style.display = 'none';
    elements.messagesList.insertAdjacentHTML('beforeend', renderMessage(msg, -1));
    scrollToBottom();
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// ============ File Upload ============
async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
        await uploadFile(file);
    }
    e.target.value = '';
    updateModeUI();
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            await uploadFile(file);
        }
    }
    updateModeUI();
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.error) {
            alert('上传失败: ' + result.error);
            return;
        }

        state.uploadedFiles.push(result);
        renderUploadedFiles();
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

function renderUploadedFiles() {
    elements.uploadedFiles.innerHTML = state.uploadedFiles.map((f, i) => `
        <div class="file-preview-item">
            ${f.mime_type.startsWith('image/')
            ? `<img src="${f.path}" alt="${escapeHtml(f.original_name)}">`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px;background:var(--glass-bg);">📄</div>`}
            <button class="file-remove-btn" onclick="removeUploadedFile(${i})">✕</button>
        </div>
    `).join('');
}

function removeUploadedFile(index) {
    state.uploadedFiles.splice(index, 1);
    renderUploadedFiles();
    updateModeUI();
}

// ============ Send & Stream ============
async function sendMessage() {
    const prompt = elements.promptInput.value.trim();
    const files = [...state.uploadedFiles];
    const aspectRatio = elements.aspectRatio.value;
    const imageSize = elements.imageSize.value;
    const editType = elements.editType.value;
    const mode = state.currentMode;
    const config = modeConfig[mode];

    // Validation
    if (!prompt && files.length === 0) {
        showToast('请输入提示词或上传文件', 'warning');
        return;
    }

    if (mode === 'edit' && files.length === 0) {
        showToast('图像编辑模式需要先上传图片', 'warning');
        setMode('standard');
        return;
    }

    if (mode === 'search' && !prompt) {
        showToast('搜索增强模式需要输入提示词', 'warning');
        return;
    }

    if (state.isGenerating) return;

    if (!state.currentConversationId) {
        await createNewConversation();
    }

    // User Message
    const userMessage = {
        role: 'user',
        text: prompt,
        mode: mode,
        files: files.map(f => ({
            filename: f.filename,
            original_name: f.original_name,
            mime_type: f.mime_type,
            path: f.path
        }))
    };
    addMessage(userMessage);

    // Clear Input
    elements.promptInput.value = '';
    elements.promptInput.style.height = 'auto';
    state.uploadedFiles = [];
    renderUploadedFiles();
    updateModeUI();

    // Start Generation
    state.isGenerating = true;
    elements.sendBtn.disabled = true;

    // Loading placeholder
    const loadingId = 'loading-' + Date.now();
    elements.messagesList.insertAdjacentHTML('beforeend', `
        <div class="message assistant" id="${loadingId}">
            <div class="message-avatar">✨</div>
            <div class="message-content">
                <div class="status-text">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span id="${loadingId}-text">正在连接...</span>
                </div>
                <div class="thinking-process" id="${loadingId}-thinking-container" style="display:none;margin-top:16px;">
                    <div class="thinking-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <span>思考过程</span>
                    </div>
                    <div class="thinking-content" id="${loadingId}-thinking"></div>
                </div>
            </div>
        </div>
    `);
    scrollToBottom();

    const assistantMessage = { 
        role: 'assistant', 
        thinking: '', 
        thinking_images: [],
        image: null, 
        text: '',
        grounding: null,
        error: null 
    };

    try {
        // Build request body based on mode
        const requestBody = {
            prompt,
            aspect_ratio: aspectRatio,
            image_size: imageSize,
            include_text: true
        };

        if (mode === 'standard' || mode === 'edit') {
            requestBody.files = files.map(f => ({ filename: f.filename, mime_type: f.mime_type }));
        }

        if (mode === 'edit') {
            requestBody.edit_type = editType;
        }

        // 如果启用了上下文记忆，添加历史消息
        if (state.enableContext) {
            const conv = state.conversations.find(c => c.id === state.currentConversationId);
            if (conv && conv.messages && conv.messages.length > 0) {
                // 只发送最近的几轮对话，避免 token 过多
                const recentMessages = conv.messages.slice(-6);  // 最多 3 轮对话 (6条消息)
                requestBody.history = recentMessages.map(m => ({
                    role: m.role,
                    text: m.text || '',
                    image: m.image || null
                }));
            }
        }

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleStreamData(data, loadingId, assistantMessage);
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }

        // Finalize
        document.getElementById(loadingId)?.remove();
        addMessage(assistantMessage);

        // Update Title
        const conv = state.conversations.find(c => c.id === state.currentConversationId);
        const messages = [...(conv?.messages || []), userMessage, assistantMessage];
        const title = prompt ? prompt.substring(0, 24) + (prompt.length > 24 ? '...' : '') : '图片生成';
        updateConversation(messages, conv?.title === '新对话' ? title : null);

    } catch (error) {
        console.error('Generation failed:', error);
        document.getElementById(loadingId)?.remove();
        assistantMessage.error = error.message;
        addMessage(assistantMessage);
    }

    state.isGenerating = false;
    elements.sendBtn.disabled = false;
}

function handleStreamData(data, loadingId, assistantMessage) {
    const loadingText = document.getElementById(`${loadingId}-text`);
    const thinkingContainer = document.getElementById(`${loadingId}-thinking-container`);
    const thinkingContent = document.getElementById(`${loadingId}-thinking`);

    switch (data.type) {
        case 'start':
            if (loadingText) loadingText.textContent = data.message;
            break;

        case 'thinking':
            if (thinkingContainer && thinkingContent) {
                thinkingContainer.style.display = 'block';
                thinkingContent.textContent += data.text;
                assistantMessage.thinking += data.text;
                thinkingContent.scrollTop = thinkingContent.scrollHeight;
            }
            if (loadingText) loadingText.textContent = '正在推理...';
            scrollToBottom();
            break;

        case 'thinking_image':
            assistantMessage.thinking_images.push({
                filename: data.filename,
                path: data.path
            });
            if (thinkingContainer && thinkingContent) {
                thinkingContainer.style.display = 'block';
                // Add image preview to thinking content
                const imgHtml = `<div class="thinking-images"><div class="thinking-image-item" onclick="viewImage('${data.path}')"><img src="${data.path}" alt="Thinking"></div></div>`;
                thinkingContent.insertAdjacentHTML('beforeend', imgHtml);
            }
            break;

        case 'text':
            assistantMessage.text += data.text;
            if (loadingText) loadingText.textContent = '生成文本...';
            break;

        case 'grounding':
            assistantMessage.grounding = data.data;
            if (loadingText) loadingText.textContent = '获取搜索来源...';
            break;

        case 'image':
            assistantMessage.image = data.path;
            if (loadingText) loadingText.textContent = '图片生成完成!';
            break;

        case 'done':
            // Merge any final data
            if (data.full_text && !assistantMessage.text) {
                assistantMessage.text = data.full_text;
            }
            if (data.thinking && !assistantMessage.thinking) {
                assistantMessage.thinking = data.thinking;
            }
            if (data.thinking_images && data.thinking_images.length > 0) {
                assistantMessage.thinking_images = data.thinking_images;
            }
            if (data.grounding) {
                assistantMessage.grounding = data.grounding;
            }
            break;

        case 'error':
            assistantMessage.error = data.message;
            break;
    }
}

// ============ Image Viewer ============
function viewImage(src) {
    elements.viewerImage.src = src;
    elements.downloadLink.href = src;
    elements.imageViewer.classList.add('active');
}

function closeImageViewer() {
    elements.imageViewer.classList.remove('active');
}

// Copy image to clipboard
async function copyImageToClipboard(src) {
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        showToast('图片已复制到剪贴板', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('复制失败，请尝试下载', 'error');
    }
}

// Edit a generated image
function editGeneratedImage(src) {
    // Switch to edit mode and add the image as reference
    setMode('edit');
    
    // Fetch the image and add to uploaded files
    fetch(src)
        .then(res => res.blob())
        .then(blob => {
            const filename = src.split('/').pop();
            state.uploadedFiles.push({
                filename: filename,
                original_name: filename,
                mime_type: 'image/png',
                path: src
            });
            renderUploadedFiles();
            updateModeUI();
            elements.promptInput.focus();
            showToast('图片已添加，请输入编辑指令', 'success');
        })
        .catch(err => {
            console.error('Failed to load image:', err);
            showToast('加载图片失败', 'error');
        });
}

// ============ Toast Notifications ============
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escapeHtml(message)}</span>`;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--glass-bg);
        backdrop-filter: blur(var(--blur-md));
        border: 1px solid var(--glass-border);
        padding: 12px 20px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: var(--text-primary);
        z-index: 1000;
        animation: toastIn 0.3s ease-out;
        box-shadow: 0 8px 32px var(--glass-shadow);
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
        .toast-success .toast-icon { color: var(--accent-success); }
        .toast-error .toast-icon { color: var(--accent-error); }
        .toast-warning .toast-icon { color: var(--accent-warning); }
        .toast-info .toast-icon { color: var(--text-accent); }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ Utils ============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.loadConversation = loadConversation;
window.deleteConversation = deleteConversation;
window.deleteMessage = deleteMessage;
window.deleteUserMessage = deleteUserMessage;
window.retryMessage = retryMessage;
window.toggleThinking = toggleThinking;
window.startEditConversation = startEditConversation;
window.handleEditKeydown = handleEditKeydown;
window.saveConversationTitle = saveConversationTitle;
window.viewImage = viewImage;
window.closeImageViewer = closeImageViewer;
window.removeUploadedFile = removeUploadedFile;
window.copyImageToClipboard = copyImageToClipboard;
window.editGeneratedImage = editGeneratedImage;
