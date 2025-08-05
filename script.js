class TwitchChatReader {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.speechQueue = [];
        this.isSpeaking = false;
        this.isPaused = false;
        this.mutedUsers = new Set();
        this.profanityWords = [
            'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
            'bastard', 'whore', 'slut', 'retard', 'fag', 'nigger', 'cunt'
        ];
        this.customFilters = new Set();
        this.elevenLabsApiKey = '';
        this.audioContext = null;
        this.currentAudio = null;
        
        this.initializeElements();
        this.initializeAudio();
        this.bindEvents();
        this.loadSettings();
    }

    initializeElements() {
        this.elements = {
            username: document.getElementById('username'),
            connectBtn: document.getElementById('connect-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            connectionStatus: document.getElementById('connection-status'),
            currentSpeaking: document.getElementById('current-speaking'),
            chatMessages: document.getElementById('chat-messages'),
            speechQueue: document.getElementById('speech-queue'),
            queueCount: document.getElementById('queue-count'),
            
            // Settings
            filterProfanity: document.getElementById('filter-profanity'),
            readEvents: document.getElementById('read-events'),
            elevenLabsApiKey: document.getElementById('elevenlabs-api-key'),
            voiceSelect: document.getElementById('voice-select'),
            speechStability: document.getElementById('speech-stability'),
            speechClarity: document.getElementById('speech-clarity'),
            stabilityValue: document.getElementById('stability-value'),
            clarityValue: document.getElementById('clarity-value'),
            customFilters: document.getElementById('custom-filters'),
            
            // Muting
            mutedList: document.getElementById('muted-list'),
            muteUsername: document.getElementById('mute-username'),
            muteBtn: document.getElementById('mute-btn'),
            
            // Controls
            clearChat: document.getElementById('clear-chat'),
            clearQueue: document.getElementById('clear-queue'),
            pauseSpeech: document.getElementById('pause-speech'),
            resumeSpeech: document.getElementById('resume-speech')
        };
    }

    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Web Audio API not supported:', error);
        }
    }

    bindEvents() {
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        this.elements.speechStability.addEventListener('input', (e) => {
            this.elements.stabilityValue.textContent = e.target.value;
            this.saveSettings();
        });
        
        this.elements.speechClarity.addEventListener('input', (e) => {
            this.elements.clarityValue.textContent = e.target.value;
            this.saveSettings();
        });
        
        this.elements.elevenLabsApiKey.addEventListener('input', () => {
            this.elevenLabsApiKey = this.elements.elevenLabsApiKey.value.trim();
            this.saveSettings();
        });
        
        this.elements.customFilters.addEventListener('input', () => {
            this.updateCustomFilters();
            this.saveSettings();
        });
        
        this.elements.muteBtn.addEventListener('click', () => this.muteUser());
        this.elements.muteUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.muteUser();
        });
        
        this.elements.clearChat.addEventListener('click', () => this.clearChat());
        this.elements.clearQueue.addEventListener('click', () => this.clearQueue());
        this.elements.pauseSpeech.addEventListener('click', () => this.pauseSpeech());
        this.elements.resumeSpeech.addEventListener('click', () => this.resumeSpeech());
        
        // Test TTS button
        document.getElementById('test-tts').addEventListener('click', () => {
            this.addToSpeechQueue('This is a test of the text to speech system. Hello world!');
        });
        
        // Save settings on change
        ['filterProfanity', 'readEvents', 'voiceSelect'].forEach(id => {
            this.elements[id].addEventListener('change', () => this.saveSettings());
        });
        
        this.elements.username.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });
    }

    updateCustomFilters() {
        const filters = this.elements.customFilters.value
            .split(',')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0);
        
        this.customFilters = new Set(filters);
    }

    async connect() {
        const username = this.elements.username.value.trim();
        if (!username) {
            alert('Please enter a Twitch username');
            return;
        }

        try {
            this.elements.connectBtn.disabled = true;
            this.updateConnectionStatus('Connecting...');

            // Use WebSocket directly to connect to Twitch IRC
            this.connectWithWebSocket(username);
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.elements.connectBtn.disabled = false;
            this.updateConnectionStatus('Connection failed');
            alert('Failed to connect to Twitch chat. Please check the username and try again.');
        }
    }

    connectWithWebSocket(username) {
        const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        this.client = ws;
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            // Send authentication
            const nick = 'justinfan' + Math.floor(Math.random() * 80000 + 1000);
            ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            ws.send(`PASS oauth:ckoro`);
            ws.send(`NICK ${nick}`);
            ws.send(`JOIN #${username.toLowerCase()}`);
        };

        ws.onmessage = (event) => {
            const lines = event.data.split('\r\n');
            lines.forEach(line => {
                if (line.trim()) {
                    this.parseIRCMessage(line, username);
                }
            });
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.elements.connectBtn.disabled = false;
            this.elements.disconnectBtn.disabled = true;
            this.updateConnectionStatus('Disconnected');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.elements.connectBtn.disabled = false;
            this.updateConnectionStatus('Connection failed');
        };
    }

    parseIRCMessage(line, username) {
        console.log('IRC:', line);
        
        // Handle PING
        if (line.startsWith('PING')) {
            this.client.send('PONG :tmi.twitch.tv');
            return;
        }

        // Handle successful connection
        if (line.includes('001')) {
            this.isConnected = true;
            this.elements.connectBtn.disabled = false;
            this.elements.disconnectBtn.disabled = false;
            this.updateConnectionStatus(`Connected to ${username}'s chat`);
            return;
        }

        // Parse PRIVMSG (chat messages)
        if (line.includes('PRIVMSG')) {
            const match = line.match(/@([^;]*);[^:]*:([^!]+)![^#]*#[^:]*:(.+)/);
            if (match) {
                const tags = this.parseTags(match[1]);
                const user = match[2];
                const message = match[3];
                
                this.handleMessage({
                    'display-name': tags['display-name'] || user,
                    username: user,
                    color: tags.color || '#000000'
                }, message);
            }
        }

        // Parse events (subscriptions, follows, etc.)
        if (line.includes('USERNOTICE')) {
            const match = line.match(/@([^;]*);[^:]*:([^!]+)![^#]*#[^:]*:?(.*)/);
            if (match) {
                const tags = this.parseTags(match[1]);
                const user = match[2];
                const message = match[3] || '';
                
                if (this.elements.readEvents.checked) {
                    const msgId = tags['msg-id'];
                    const displayName = tags['display-name'] || user;
                    
                    switch (msgId) {
                        case 'sub':
                            this.handleEvent('subscription', `${displayName} just subscribed!`, tags);
                            break;
                        case 'resub':
                            const months = tags['msg-param-cumulative-months'] || '1';
                            this.handleEvent('resub', `${displayName} resubscribed for ${months} months!`, tags);
                            break;
                        case 'subgift':
                            const recipient = tags['msg-param-recipient-display-name'];
                            this.handleEvent('subgift', `${displayName} gifted a subscription to ${recipient}!`, tags);
                            break;
                        case 'raid':
                            const viewers = tags['msg-param-viewerCount'];
                            this.handleEvent('raid', `${displayName} is raiding with ${viewers} viewers!`, tags);
                            break;
                    }
                }
            }
        }
    }

    parseTags(tagString) {
        const tags = {};
        if (tagString) {
            tagString.split(';').forEach(tag => {
                const [key, value] = tag.split('=');
                tags[key] = value || '';
            });
        }
        return tags;
    }

    disconnect() {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        
        this.isConnected = false;
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
        this.updateConnectionStatus('Disconnected');
        this.clearQueue();
    }

    updateConnectionStatus(status) {
        this.elements.connectionStatus.textContent = status;
        this.elements.connectionStatus.className = 
            this.isConnected ? 'status-connected' : 'status-disconnected';
    }

    handleMessage(tags, message) {
        const username = tags['display-name'] || tags.username;
        
        // Check if user is muted
        if (this.mutedUsers.has(username.toLowerCase())) {
            return;
        }

        const filteredMessage = this.filterMessage(message);
        const shouldSpeak = filteredMessage !== null;
        
        this.addMessageToDisplay(username, message, 'chat', !shouldSpeak);
        
        if (shouldSpeak) {
            this.addToSpeechQueue(`${username} says: ${filteredMessage}`);
        }
    }

    handleEvent(type, message, tags) {
        this.addMessageToDisplay('System', message, 'event');
        this.addToSpeechQueue(message);
    }

    filterMessage(message) {
        if (!this.elements.filterProfanity.checked && this.customFilters.size === 0) {
            return message;
        }

        const words = message.toLowerCase().split(/\s+/);
        const allFilters = new Set([
            ...(this.elements.filterProfanity.checked ? this.profanityWords : []),
            ...this.customFilters
        ]);

        const hasFilteredWords = words.some(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            return allFilters.has(cleanWord);
        });

        return hasFilteredWords ? null : message;
    }

    addMessageToDisplay(username, message, type = 'chat', filtered = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} ${filtered ? 'filtered' : ''}`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = `${username} • ${new Date().toLocaleTimeString()}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = filtered ? '[Message filtered]' : message;
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        
        // Keep only last 50 messages
        while (this.elements.chatMessages.children.length > 50) {
            this.elements.chatMessages.removeChild(this.elements.chatMessages.firstChild);
        }
    }

    addToSpeechQueue(text) {
        this.speechQueue.push(text);
        this.updateQueueDisplay();
        
        if (!this.isSpeaking && !this.isPaused) {
            this.processQueue();
        }
    }

    updateQueueDisplay() {
        this.elements.queueCount.textContent = this.speechQueue.length;
        this.elements.speechQueue.innerHTML = '';
        
        this.speechQueue.forEach((text, index) => {
            const queueItem = document.createElement('div');
            queueItem.className = `queue-item ${index === 0 && this.isSpeaking ? 'speaking' : ''}`;
            queueItem.textContent = text;
            this.elements.speechQueue.appendChild(queueItem);
        });
        
        this.elements.speechQueue.scrollTop = 0;
    }

    async processQueue() {
        if (this.speechQueue.length === 0 || this.isPaused) {
            this.isSpeaking = false;
            this.elements.currentSpeaking.textContent = '';
            return;
        }

        const text = this.speechQueue.shift();
        this.isSpeaking = true;
        this.elements.currentSpeaking.textContent = `Speaking: ${text.substring(0, 50)}...`;
        this.updateQueueDisplay();
        
        try {
            await this.speakWithElevenLabs(text);
        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            // Fallback to browser TTS if ElevenLabs fails
            await this.speakWithBrowserTTS(text);
        }
        
        this.isSpeaking = false;
        this.updateQueueDisplay();
        setTimeout(() => this.processQueue(), 100);
    }

    async speakWithElevenLabs(text) {
        if (!this.elevenLabsApiKey) {
            throw new Error('ElevenLabs API key not provided');
        }

        const voiceId = this.elements.voiceSelect.value;
        const stability = parseFloat(this.elements.speechStability.value);
        const clarity = parseFloat(this.elements.speechClarity.value);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.elevenLabsApiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: stability,
                    similarity_boost: clarity,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
        }

        const audioBlob = await response.blob();
        return this.playAudioBlob(audioBlob);
    }

    async speakWithBrowserTTS(text) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Browser TTS not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.volume = 0.8;
            
            utterance.onend = () => resolve();
            utterance.onerror = (event) => reject(new Error('Browser TTS error: ' + event.error));
            
            speechSynthesis.speak(utterance);
        });
    }

    async playAudioBlob(audioBlob) {
        return new Promise((resolve, reject) => {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            this.currentAudio = audio;
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                resolve();
            };
            
            audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                reject(new Error('Audio playback error: ' + error.message));
            };
            
            audio.play().catch(reject);
        });
    }

    muteUser() {
        const username = this.elements.muteUsername.value.trim();
        if (!username) return;
        
        this.mutedUsers.add(username.toLowerCase());
        this.elements.muteUsername.value = '';
        this.updateMutedDisplay();
        this.saveSettings();
    }

    unmuteUser(username) {
        this.mutedUsers.delete(username.toLowerCase());
        this.updateMutedDisplay();
        this.saveSettings();
    }

    updateMutedDisplay() {
        this.elements.mutedList.innerHTML = '';
        
        this.mutedUsers.forEach(username => {
            const mutedDiv = document.createElement('div');
            mutedDiv.className = 'muted-user';
            mutedDiv.innerHTML = `
                ${username}
                <span class="remove" onclick="chatReader.unmuteUser('${username}')">×</span>
            `;
            this.elements.mutedList.appendChild(mutedDiv);
        });
    }

    clearChat() {
        this.elements.chatMessages.innerHTML = '';
    }

    clearQueue() {
        // Stop current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Cancel browser TTS if active
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        this.speechQueue = [];
        this.isSpeaking = false;
        this.elements.currentSpeaking.textContent = '';
        this.updateQueueDisplay();
    }

    pauseSpeech() {
        this.isPaused = true;
        
        // Pause current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        
        // Pause browser TTS if active
        if ('speechSynthesis' in window) {
            speechSynthesis.pause();
        }
    }

    resumeSpeech() {
        this.isPaused = false;
        
        // Resume current audio
        if (this.currentAudio) {
            this.currentAudio.play();
        }
        
        // Resume browser TTS if active
        if ('speechSynthesis' in window) {
            speechSynthesis.resume();
        }
        
        if (!this.isSpeaking) {
            this.processQueue();
        }
    }

    saveSettings() {
        const settings = {
            filterProfanity: this.elements.filterProfanity.checked,
            readEvents: this.elements.readEvents.checked,
            elevenLabsApiKey: this.elevenLabsApiKey,
            voiceId: this.elements.voiceSelect.value,
            speechStability: this.elements.speechStability.value,
            speechClarity: this.elements.speechClarity.value,
            customFilters: this.elements.customFilters.value,
            mutedUsers: Array.from(this.mutedUsers)
        };
        
        localStorage.setItem('twitchChatReaderSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('twitchChatReaderSettings');
        if (!saved) return;
        
        try {
            const settings = JSON.parse(saved);
            
            this.elements.filterProfanity.checked = settings.filterProfanity ?? true;
            this.elements.readEvents.checked = settings.readEvents ?? true;
            this.elevenLabsApiKey = settings.elevenLabsApiKey ?? '';
            this.elements.elevenLabsApiKey.value = this.elevenLabsApiKey;
            this.elements.speechStability.value = settings.speechStability ?? 0.5;
            this.elements.speechClarity.value = settings.speechClarity ?? 0.75;
            this.elements.customFilters.value = settings.customFilters ?? '';
            
            this.elements.stabilityValue.textContent = this.elements.speechStability.value;
            this.elements.clarityValue.textContent = this.elements.speechClarity.value;
            
            if (settings.voiceId) {
                this.elements.voiceSelect.value = settings.voiceId;
            }
            
            if (settings.mutedUsers) {
                this.mutedUsers = new Set(settings.mutedUsers);
                this.updateMutedDisplay();
            }
            
            this.updateCustomFilters();
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
}

// Initialize the application
let chatReader;
document.addEventListener('DOMContentLoaded', () => {
    chatReader = new TwitchChatReader();
});

// Handle page visibility changes to pause/resume speech
document.addEventListener('visibilitychange', () => {
    if (chatReader) {
        if (document.hidden) {
            chatReader.pauseSpeech();
        } else {
            chatReader.resumeSpeech();
        }
    }
});