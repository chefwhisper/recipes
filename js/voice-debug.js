// voice-debug.js
// Provides debugging tools for voice commands
// This file is optional and can be removed in production

// Create debug UI
function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'voice-debug-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '20px';
    panel.style.left = '20px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.zIndex = '9999';
    panel.style.fontSize = '14px';
    panel.style.fontFamily = 'monospace';
    panel.style.maxWidth = '300px';
    panel.style.maxHeight = '300px';
    panel.style.overflow = 'auto';
    panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    panel.style.display = 'none'; // Hidden by default
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '10px';
    
    const title = document.createElement('div');
    title.textContent = 'Voice Command Debug';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.backgroundColor = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0 5px';
    closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    const logArea = document.createElement('div');
    logArea.id = 'voice-debug-log';
    panel.appendChild(logArea);
    
    const inputArea = document.createElement('div');
    inputArea.style.marginTop = '10px';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Test voice command...';
    input.style.width = '70%';
    input.style.padding = '5px';
    input.style.border = 'none';
    input.style.borderRadius = '3px';
    
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.marginLeft = '5px';
    sendBtn.style.padding = '5px 10px';
    sendBtn.style.backgroundColor = '#9d4700';
    sendBtn.style.color = 'white';
    sendBtn.style.border = 'none';
    sendBtn.style.borderRadius = '3px';
    sendBtn.style.cursor = 'pointer';
    
    sendBtn.addEventListener('click', () => {
        const command = input.value.trim();
        if (command) {
            testVoiceCommand(command);
            input.value = '';
        }
    });
    
    input.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            sendBtn.click();
        }
    });
    
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);
    
    document.body.appendChild(panel);
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'voice-debug-toggle';
    toggleBtn.textContent = 'Debug Voice';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.left = '20px';
    toggleBtn.style.backgroundColor = '#9d4700';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '5px';
    toggleBtn.style.padding = '5px 10px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.zIndex = '9998';
    toggleBtn.style.fontSize = '12px';
    
    toggleBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    
    document.body.appendChild(toggleBtn);
}

// Log message to debug panel
function logDebug(message, type = 'info') {
    console.log(`Voice Debug (${type}):`, message);
    
    const logArea = document.getElementById('voice-debug-log');
    if (!logArea) return;
    
    const entry = document.createElement('div');
    entry.style.marginBottom = '5px';
    entry.style.borderLeft = '3px solid ' + getColorForType(type);
    entry.style.paddingLeft = '5px';
    
    const timestamp = new Date().toLocaleTimeString();
    const logText = `[${timestamp}] ${message}`;
    entry.textContent = logText;
    
    logArea.appendChild(entry);
    
    // Auto-scroll to bottom
    logArea.scrollTop = logArea.scrollHeight;
    
    // Limit number of log entries
    while (logArea.children.length > 50) {
        logArea.removeChild(logArea.firstChild);
    }
}

// Get color based on log type
function getColorForType(type) {
    switch (type) {
        case 'error': return '#ff5555';
        case 'success': return '#55ff55';
        case 'warning': return '#ffff55';
        default: return '#55aaff';
    }
}

// Test a voice command manually
function testVoiceCommand(command) {
    logDebug(`Testing command: "${command}"`, 'info');
    
    try {
        // First try to process with our enhanced timer voice processor
        if (typeof window.processTimerVoiceCommand === 'function') {
            const handled = window.processTimerVoiceCommand(command);
            if (handled) {
                logDebug(`Command handled by timer processor: "${command}"`, 'success');
                return;
            }
        }
        
        // If not handled by timer processor, try the main processor
        if (typeof window.processVoiceCommand === 'function') {
            const handled = window.processVoiceCommand(command);
            if (handled) {
                logDebug(`Command handled by main processor: "${command}"`, 'success');
                return;
            }
        }
        
        logDebug(`Command not recognized: "${command}"`, 'warning');
    } catch (error) {
        logDebug(`Error processing command: ${error.message}`, 'error');
    }
}

// Monitor voice state changes
function monitorVoiceState() {
    // Check voice state periodically
    setInterval(() => {
        const voiceBtn = document.getElementById('voice-command-button');
        const voiceStatus = document.getElementById('voice-status');
        
        if (voiceBtn) {
            const isEnabled = voiceBtn.textContent.includes('Disable');
            const statusText = voiceStatus ? voiceStatus.textContent : 'Unknown';
            
            const stateIndicator = document.createElement('div');
            stateIndicator.style.position = 'fixed';
            stateIndicator.style.top = '10px';
            stateIndicator.style.right = '10px';
            stateIndicator.style.width = '15px';
            stateIndicator.style.height = '15px';
            stateIndicator.style.borderRadius = '50%';
            stateIndicator.style.backgroundColor = isEnabled ? '#55ff55' : '#ff5555';
            stateIndicator.style.zIndex = '9999';
            stateIndicator.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
            stateIndicator.title = `Voice commands: ${isEnabled ? 'Enabled' : 'Disabled'}\n${statusText}`;
            
            // Remove existing indicator if present
            const existingIndicator = document.getElementById('voice-state-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            stateIndicator.id = 'voice-state-indicator';
            document.body.appendChild(stateIndicator);
        }
    }, 1000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to initialize
    setTimeout(() => {
        createDebugPanel();
        monitorVoiceState();
        logDebug('Voice debug tools initialized', 'success');
        
        // Log helpful test commands
        logDebug('Test commands you can try:', 'info');
        logDebug('- "start timer"', 'info');
        logDebug('- "pause timer"', 'info');
        logDebug('- "create a timer for 3 minutes"', 'info');
        logDebug('- "create a pasta timer for 5 minutes"', 'info');
    }, 2500);
});