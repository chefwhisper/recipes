// Consolidated voice-commands.js
// This file combines functionality from:
// - voice-commands.js
// - simple-voice-fix.js 
// - suggestions-fix.js

// Global variables for voice recognition
// Check if these variables already exist in window scope
window.speechRecognition = window.speechRecognition || null;
window.isVoiceActive = window.isVoiceActive || false;
let voiceCommandDebounceTimer = null;

// Initialize speech recognition system
function setupVoiceRecognition() {
    console.log("Setting up voice recognition");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("Speech Recognition API not supported in this browser");
        return false;
    }
    
    try {
        // Use existing speechRecognition if available
        if (!window.speechRecognition || window.speechRecognition.error) {
            window.speechRecognition = new SpeechRecognition();
            window.speechRecognition.continuous = true;
            window.speechRecognition.interimResults = false;
        }
        
        // Configure recognition settings
        window.speechRecognition.onresult = handleSpeechResult;
        window.speechRecognition.onerror = handleSpeechError;
        window.speechRecognition.onend = handleSpeechEnd;
        
        // Add additional properties for better debugging
        window.speechRecognition.error = null;
        
        console.log("Speech recognition setup successful");
        return true;
    } catch (error) {
        console.error("Error setting up speech recognition:", error);
        return false;
    }
}

// Handle speech recognition results
function handleSpeechResult(event) {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log("Voice command detected:", transcript);
    
    // Update status display
    updateVoiceStatus(`Voice command recognized: "${transcript}"`);
    
    // Process the command (with debounce to prevent multiple triggers)
    clearTimeout(voiceCommandDebounceTimer);
    voiceCommandDebounceTimer = setTimeout(() => {
        processVoiceCommand(transcript.toLowerCase());
    }, 100);
}

// Handle speech recognition errors
function handleSpeechError(event) {
    console.error("Speech recognition error:", event.error);
    updateVoiceStatus(`Error in speech recognition: ${event.error}`);
    
    // Mark the recognizer as having an error
    if (window.speechRecognition) {
        window.speechRecognition.error = event.error;
    }
    
    // Attempt to restart if it was network related or recoverable
    if (event.error === 'network' || event.error === 'aborted') {
        restartVoiceRecognition();
    }
}

// Handle speech recognition ending
function handleSpeechEnd() {
    console.log("Speech recognition ended");
    
    // Auto-restart if it was still supposed to be active
    if (window.isVoiceActive) {
        restartVoiceRecognition();
    }
}

// Restart voice recognition if it stops unexpectedly
function restartVoiceRecognition() {
    if (window.isVoiceActive) {
        try {
            setTimeout(() => {
                console.log("Attempting to restart speech recognition");
                window.speechRecognition.start();
            }, 1000);
        } catch (error) {
            console.error("Failed to restart speech recognition:", error);
            updateVoiceStatus("Voice recognition failed to restart. Please try again.");
            window.isVoiceActive = false;
            updateVoiceButtonState();
            
            // Also update command suggestions visibility since state changed
            updateCommandSuggestions();
        }
    }
}

// Main function to process all types of voice commands
function processVoiceCommand(transcript) {
    console.log("Processing voice command:", transcript);
    
    // First try timer commands (highest priority)
    if (processTimerVoiceCommand(transcript)) {
        return true;
    }
    
    // Try navigation commands
    if (processNavigationVoiceCommand(transcript)) {
        return true;
    }
    
    // Try reading commands
    if (processReadingVoiceCommand(transcript)) {
        return true;
    }
    
    // Command not recognized
    console.log("Command not recognized:", transcript);
    updateVoiceStatus(`Command not recognized: "${transcript}"`);
    return false;
}

// Process navigation commands (next/prev step, finish)
function processNavigationVoiceCommand(transcript) {
    if (transcript.includes("next") || transcript.includes("forward")) {
        if (typeof window.goToNextStep === 'function') {
            window.goToNextStep();
            return true;
        }
    } 
    else if (transcript.includes("previous") || transcript.includes("back")) {
        if (typeof window.goToPrevStep === 'function') {
            window.goToPrevStep();
            return true;
        }
    } 
    else if (transcript.includes("finish") || transcript.includes("done")) {
        if (typeof window.finishRecipe === 'function') {
            window.finishRecipe();
            return true;
        }
    }
    // Switch to preparation phase
    else if (transcript.includes("go to prep") || 
             transcript.includes("switch to prep") || 
             transcript.includes("preparation phase")) {
        if (document.getElementById('prep-phase')) {
            document.getElementById('prep-phase').click();
            return true;
        }
    }
    // Switch to cooking phase
    else if (transcript.includes("go to cooking") || 
             transcript.includes("switch to cooking") || 
             transcript.includes("cooking phase")) {
        if (document.getElementById('cooking-phase')) {
            document.getElementById('cooking-phase').click();
            return true;
        }
    }
    
    return false;
}

// Process reading-related commands (read aloud, pause, resume)
function processReadingVoiceCommand(transcript) {
    // Handle various read commands
    if (transcript.includes("read") || 
        transcript.includes("read step") || 
        transcript.includes("read out") || 
        transcript.includes("read aloud")) {
        
        return handleReadCommand();
    }
    // Handle pause reading - make these more explicit
    else if ((transcript.includes("pause reading") || 
            transcript.includes("stop reading") || 
            transcript.includes("be quiet") || 
            transcript === "pause reading" || 
            transcript === "stop reading") && 
            !transcript.includes("timer")) {
        
        if (typeof window.pauseSpeech === 'function' && window.isSpeaking && !window.isPaused) {
            window.pauseSpeech();
            return true;
        }
    }
    // Handle resume reading - make these more explicit
    else if ((transcript.includes("resume reading") || 
            transcript.includes("continue reading") || 
            transcript.includes("keep reading") ||
            transcript === "resume reading" ||
            transcript === "continue reading")) {
        
        if (typeof window.resumeSpeech === 'function' && window.isSpeaking && window.isPaused) {
            window.resumeSpeech();
            return true;
        }
    }
    // Handle stop reading completely
    else if ((transcript.includes("stop reading") || transcript === "stop reading") && 
            !transcript.includes("timer")) {
        if (typeof window.stopSpeaking === 'function') {
            window.stopSpeaking();
            return true;
        }
    }

    return false;
}

// Process timer commands
function processTimerVoiceCommand(transcript) {
    console.log("Processing timer voice command:", transcript);
    
    // Commands for managing all timers
    if (transcript.includes('start all timer') || transcript.includes('start all timers')) {
        if (typeof window.startAllTimers === 'function') {
            window.startAllTimers();
            return true;
        }
    } 
    else if (transcript.includes('pause all timer') || transcript.includes('pause all timers') || 
             transcript.includes('stop all timer') || transcript.includes('stop all timers')) {
        if (typeof window.pauseAllTimers === 'function') {
            window.pauseAllTimers();
            return true;
        }
    } 
    else if (transcript.includes('reset all timer') || transcript.includes('reset all timers')) {
        if (typeof window.resetAllTimers === 'function') {
            window.resetAllTimers();
            return true;
        }
    } 
    else if (transcript.includes('clear all timer') || transcript.includes('clear all timers') ||
             transcript.includes('remove all timer') || transcript.includes('remove all timers')) {
        if (typeof window.clearAllTimers === 'function') {
            window.clearAllTimers();
            return true;
        }
    }
    
    // List all timers
    if (transcript.includes('list timer') || transcript.includes('list all timer') ||
        transcript.includes('what timer') || transcript.includes('show timer') ||
        transcript.includes('show me the timer')) {
        if (window.activeTimers && window.activeTimers.length > 0) {
            const timerNames = window.activeTimers.map(t => t.context || t.name).join(', ');
            showTimerAlert(`Available timers: ${timerNames}`);
            return true;
        } else {
            showTimerAlert("No active timers found");
            return true;
        }
    }

    // Commands for specific timers by name
    const startMatch = transcript.match(/start(?:\s+the)?\s+(.+?)(?:\s+timer)?$/i);
    const pauseMatch = transcript.match(/(?:pause|stop)(?:\s+the)?\s+(.+?)(?:\s+timer)?$/i);
    const resetMatch = transcript.match(/reset(?:\s+the)?\s+(.+?)(?:\s+timer)?$/i);
    const closeMatch = transcript.match(/(?:close|remove)(?:\s+the)?\s+(.+?)(?:\s+timer)?$/i);
    
    // Just "close timer" or "remove timer" without a specific name
    const closeCurrentMatch = transcript.match(/^(?:close|remove)(?:\s+this|\s+the)?\s+timer$/i);
    
    // Start a specific timer
    if (startMatch && typeof window.findTimerByNameApprox === 'function' && typeof window.startTimer === 'function') {
        const timerName = startMatch[1].trim();
        const foundTimer = window.findTimerByNameApprox(timerName);
        if (foundTimer) {
            window.startTimer(foundTimer.id);
            showTimerAlert(`Started timer: ${foundTimer.context || foundTimer.name}`);
            highlightTimer(foundTimer.id);
            return true;
        } else {
            showTimerAlert(`No timer found matching: ${timerName}`);
            return true;
        }
    } 
    // Pause a specific timer
    else if (pauseMatch && typeof window.findTimerByNameApprox === 'function' && typeof window.pauseTimer === 'function') {
        const timerName = pauseMatch[1].trim();
        const foundTimer = window.findTimerByNameApprox(timerName);
        if (foundTimer) {
            window.pauseTimer(foundTimer.id);
            showTimerAlert(`Paused timer: ${foundTimer.context || foundTimer.name}`);
            highlightTimer(foundTimer.id);
            return true;
        } else {
            showTimerAlert(`No timer found matching: ${timerName}`);
            return true;
        }
    } 
    // Reset a specific timer
    else if (resetMatch && typeof window.findTimerByNameApprox === 'function' && typeof window.resetTimer === 'function') {
        const timerName = resetMatch[1].trim();
        const foundTimer = window.findTimerByNameApprox(timerName);
        if (foundTimer) {
            window.resetTimer(foundTimer.id);
            showTimerAlert(`Reset timer: ${foundTimer.context || foundTimer.name}`);
            highlightTimer(foundTimer.id);
            return true;
        } else {
            showTimerAlert(`No timer found matching: ${timerName}`);
            return true;
        }
    }
    // Close a specific timer
    else if (closeMatch && typeof window.findTimerByNameApprox === 'function' && typeof window.removeTimer === 'function') {
        const timerName = closeMatch[1].trim();
        const foundTimer = window.findTimerByNameApprox(timerName);
        if (foundTimer) {
            window.removeTimer(foundTimer.id);
            showTimerAlert(`Removed timer: ${foundTimer.context || foundTimer.name}`);
            return true;
        } else {
            showTimerAlert(`No timer found matching: ${timerName}`);
            return true;
        }
    }
    // Close current timer (if only one exists)
    else if (closeCurrentMatch && window.activeTimers && typeof window.removeTimer === 'function') {
        if (window.activeTimers.length === 1) {
            const timerName = window.activeTimers[0].context || window.activeTimers[0].name;
            window.removeTimer(window.activeTimers[0].id);
            showTimerAlert(`Removed timer: ${timerName}`);
            return true;
        } else if (window.activeTimers.length > 1) {
            showTimerAlert("Multiple timers present. Please specify which timer to close.");
            return true;
        } else {
            showTimerAlert("No timers to remove");
            return true;
        }
    }
    
    // Simple timer commands without specific timer
    if ((transcript.includes("start timer") || transcript === "start timer" || transcript === "timer start") && !startMatch) {
        // Just "start timer" - start the first non-running timer
        if (window.activeTimers && window.activeTimers.length > 0 && typeof window.startTimer === 'function') {
            const nonRunningTimer = window.activeTimers.find(t => !t.running);
            if (nonRunningTimer) {
                window.startTimer(nonRunningTimer.id);
                showTimerAlert(`Started timer: ${nonRunningTimer.context || nonRunningTimer.name}`);
                highlightTimer(nonRunningTimer.id);
                return true;
            } else if (window.activeTimers.length > 0) {
                showTimerAlert("All timers are already running");
                return true;
            }
        }
    }
    else if ((transcript.includes("pause timer") || transcript.includes("stop timer") || 
            transcript === "pause timer" || transcript === "stop timer" || transcript === "timer pause" || 
            transcript === "timer stop") && !pauseMatch) {
        // Just "pause timer" or "stop timer" - pause the first running timer
        if (window.activeTimers && window.activeTimers.length > 0 && typeof window.pauseTimer === 'function') {
            const runningTimer = window.activeTimers.find(t => t.running);
            if (runningTimer) {
                window.pauseTimer(runningTimer.id);
                showTimerAlert(`Paused timer: ${runningTimer.context || runningTimer.name}`);
                highlightTimer(runningTimer.id);
                return true;
            } else if (window.activeTimers.length > 0) {
                showTimerAlert("No timers are currently running");
                return true;
            }
        }
    }
    
    // Create a new timer command
    const createTimerMatch = transcript.match(/(?:add|create|make)(?:\s+a)?\s+(?:new\s+)?(?:timer|time)(?:\s+for)?\s+(\d+)(?:\s+minutes?)/i);
    const createNamedTimerMatch = transcript.match(/(?:add|create|make)(?:\s+a)?\s+(?:new\s+)?(.+?)(?:\s+timer)(?:\s+for)?\s+(\d+)(?:\s+minutes?)/i);
    
    if (createTimerMatch && typeof window.createCustomTimer === 'function') {
        const minutes = parseInt(createTimerMatch[1]);
        window.createCustomTimer("Custom timer", minutes);
        showTimerAlert(`Created new timer for ${minutes} minutes`);
        return true;
    } else if (createNamedTimerMatch && typeof window.createCustomTimer === 'function') {
        const timerName = createNamedTimerMatch[1].trim();
        const minutes = parseInt(createNamedTimerMatch[2]);
        window.createCustomTimer(timerName, minutes);
        showTimerAlert(`Created new ${timerName} timer for ${minutes} minutes`);
        return true;
    }
    
    return false; // Command not recognized or processed
}

// Highlight a timer in the UI briefly to show it was affected by a voice command
function highlightTimer(timerId) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    // Add a highlight class
    timerElement.classList.add('timer-highlight');
    
    // Remove it after 1.5 seconds
    setTimeout(() => {
        timerElement.classList.remove('timer-highlight');
    }, 1500);
}

// Handle read command via voice
function handleReadCommand() {
    console.log("Handling read command");
    const readButton = document.getElementById('read-step');
    if (readButton) {
        readButton.click();
        return true;
    } else if (typeof window.readCurrentStep === 'function') {
        window.readCurrentStep();
        return true;
    }
    return false;
}

// Toggle Voice Recognition
function toggleVoiceCommands() {
    console.log("Toggle voice commands called");
    // Initialize speech recognition if not already done
    if (!window.speechRecognition && !setupVoiceRecognition()) {
        showVoiceAlert("Voice commands are not supported in this browser");
        return; // Setup failed
    }
    
    try {
        if (window.isVoiceActive) {
            // Deactivate voice commands
            console.log("Stopping speech recognition");
            window.speechRecognition.stop();
            window.isVoiceActive = false;
        } else {
            // Activate voice commands
            console.log("Starting speech recognition");
            
            // Restart the recognition instance if it's in a bad state
            if (window.speechRecognition.error) {
                console.log("Recreating speech recognition due to previous error");
                setupVoiceRecognition();
            }
            
            // Some browsers need a small delay before starting
            setTimeout(() => {
                try {
                    window.speechRecognition.start();
                    console.log("Speech recognition started successfully");
                    window.isVoiceActive = true;
                    updateVoiceButtonState();
                } catch (startError) {
                    console.error("Error on delayed start:", startError);
                    handleStartFailure();
                }
            }, 100);
            
            // Set initial state assuming it will succeed
            window.isVoiceActive = true;
        }
        
        // Update UI
        updateVoiceButtonState();
        // Add this line to ensure suggestions are updated
        updateCommandSuggestions();
    } catch (error) {
        console.error("Speech recognition toggle error:", error);
        handleStartFailure();
    }
    
    // Helper function for handling start failures
    function handleStartFailure() {
        window.isVoiceActive = false;
        updateVoiceStatus("Voice recognition failed to start. Please try again or use a different browser.");
        updateVoiceButtonState();
        updateCommandSuggestions();
        
        // Try with AbortController approach for Chrome
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                console.log("Attempting alternate recognition approach...");
                window.speechRecognition = new SpeechRecognition();
                window.speechRecognition.continuous = true;
                window.speechRecognition.interimResults = false;
                window.speechRecognition.onresult = handleSpeechResult;
                window.speechRecognition.onerror = handleSpeechError;
                window.speechRecognition.onend = handleSpeechEnd;
                
                setTimeout(() => {
                    try {
                        window.speechRecognition.start();
                        console.log("Alternative approach succeeded");
                        window.isVoiceActive = true;
                        updateVoiceButtonState();
                        updateVoiceStatus("Voice commands activated");
                        updateCommandSuggestions();
                    } catch (e) {
                        console.error("Alternative approach failed:", e);
                    }
                }, 300);
            }
        } catch (alternateError) {
            console.error("Alternative approach error:", alternateError);
        }
    }
}

// Update voice command button state based on current voice state
function updateVoiceButtonState() {
    const voiceCommandBtn = document.getElementById('voice-command-button');
    if (!voiceCommandBtn) return;
    
    if (window.isVoiceActive) {
        voiceCommandBtn.textContent = "Disable Voice Commands";
    } else {
        voiceCommandBtn.textContent = "Enable Voice Commands";
    }
}

// Update voice status message
function updateVoiceStatus(message) {
    const voiceStatus = document.getElementById('voice-status');
    if (voiceStatus) {
        voiceStatus.textContent = message;
    }
}

// Main function to update command suggestions
function updateCommandSuggestions() {
    console.log("Updating command suggestions, voice active:", window.isVoiceActive);
    const commandSuggestions = document.getElementById('command-suggestions');
    if (!commandSuggestions) {
        console.warn("Command suggestions element not found");
        return;
    }
    
    // Show or hide based on voice state
    if (window.isVoiceActive) {
        commandSuggestions.style.display = 'block';
        // Update the content of suggestions if needed
        updateSuggestionContent();
    } else {
        commandSuggestions.style.display = 'none';
    }
}

// Helper function to update the suggestion content
function updateSuggestionContent() {
    const currentSuggestions = document.getElementById('current-suggestions');
    if (!currentSuggestions) return;
    
    // Simple list of common commands
    const suggestions = ['Next Step', 'Previous Step', 'Read Step', 'Start Timer', 'Pause Timer'];
    
    // Update the HTML
    currentSuggestions.innerHTML = suggestions
        .map(suggestion => `<span class="command">${suggestion}</span>`)
        .join(' · ');
}

// Set up command panel UI
function setupCommandPanelUI() {
    console.log("Setting up command panel UI");
    const showAllCommandsBtn = document.getElementById('show-all-commands');
    const commandsPanel = document.getElementById('commands-panel');
    const closeCommandsBtn = document.getElementById('close-commands');
    
    if (showAllCommandsBtn) {
        console.log("Found 'show all commands' button, adding click handler");
        showAllCommandsBtn.addEventListener('click', function() {
            console.log("Show all commands button clicked");
            if (commandsPanel) {
                commandsPanel.classList.add('active');
            } else {
                console.warn("Commands panel element not found");
            }
        });
    }
    
    if (closeCommandsBtn) {
        closeCommandsBtn.addEventListener('click', function() {
            if (commandsPanel) {
                commandsPanel.classList.remove('active');
            }
        });
    }
}

// Update contextual suggestions based on current state
function updateContextualSuggestions() {
    const currentSuggestions = document.getElementById('current-suggestions');
    if (!currentSuggestions) {
        console.warn("Current suggestions element not found");
        return;
    }
    
    let suggestions = [];
    
    // Basic navigation suggestions always shown
    suggestions.push('Next Step', 'Previous Step');
    
    // Add reading suggestions if text is available
    if (document.getElementById('main-step')) {
        if (window.isSpeaking) {
            suggestions.push(window.isPaused ? 'Resume Reading' : 'Pause Reading');
            suggestions.push('Stop Reading');
        } else {
            suggestions.push('Read Step');
        }
    }
    
    // Add timer suggestions if timers exist
    if (window.activeTimers && window.activeTimers.length > 0) {
        // Get count of running vs non-running timers
        const runningTimers = window.activeTimers.filter(t => t.running).length;
        const stoppedTimers = window.activeTimers.length - runningTimers;
        
        if (runningTimers > 0) {
            suggestions.push('Pause Timer');
            suggestions.push('Reset Timer');
        }
        if (stoppedTimers > 0) {
            suggestions.push('Start Timer');
        }
    } else {
        suggestions.push('Create Timer');
    }
    
    // Phase switching suggestions
    if (document.getElementById('prep-phase') && document.getElementById('cooking-phase')) {
        suggestions.push('Switch to Prep', 'Switch to Cooking');
    }
    
    // Build the HTML for suggestions
    currentSuggestions.innerHTML = suggestions
        .slice(0, 5) // Limit to prevent overflow
        .map(suggestion => `<span class="command">${suggestion}</span>`)
        .join(' · ');
}

// Set up command panel UI
function setupCommandPanelUI() {
    const showAllCommandsBtn = document.getElementById('show-all-commands');
    const commandsPanel = document.getElementById('commands-panel');
    const closeCommandsBtn = document.getElementById('close-commands');
    
    if (showAllCommandsBtn) {
        showAllCommandsBtn.addEventListener('click', function() {
            if (commandsPanel) {
                commandsPanel.classList.add('active');
            }
        });
    }
    
    if (closeCommandsBtn) {
        closeCommandsBtn.addEventListener('click', function() {
            if (commandsPanel) {
                commandsPanel.classList.remove('active');
            }
        });
    }
}

// Check if browser supports speech recognition properly
function checkBrowserCompatibility() {
    // Check if SpeechRecognition is available
    const hasSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Detect browser
    const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
    const isEdge = navigator.userAgent.indexOf("Edg") > -1;
    const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    const isSafari = navigator.userAgent.indexOf("Safari") > -1 && !isChrome;
    
    // Check if this is a browser known to work with speech recognition
    const isSupportedBrowser = isChrome || isEdge;
    
    console.log("Browser compatibility check:", {
        hasSpeechRecognition,
        isChrome,
        isEdge,
        isFirefox,
        isSafari,
        isSupportedBrowser
    });
    
    if (!hasSpeechRecognition) {
        updateVoiceStatus("Speech recognition is not supported in this browser.");
        return false;
    }
    
    if (!isSupportedBrowser) {
        updateVoiceStatus("Warning: Speech recognition works best in Chrome or Edge.");
    }
    
    return hasSpeechRecognition;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Voice commands system initializing");
    
    // Check browser compatibility
    checkBrowserCompatibility();
    
    // Set up voice command button 
    const voiceCommandBtn = document.getElementById('voice-command-button');
    if (voiceCommandBtn) {
        console.log("Found voice command button, setting up event listener");
        voiceCommandBtn.addEventListener('click', toggleVoiceCommands);
    }
    
    // Set up command panel UI
    setupCommandPanelUI();
    
    // Make functions available globally
    window.toggleVoiceCommands = toggleVoiceCommands;
    window.processVoiceCommand = processVoiceCommand;
    window.processTimerVoiceCommand = processTimerVoiceCommand;
    window.updateVoiceStatus = updateVoiceStatus;
    window.handleReadCommand = handleReadCommand;
    
    console.log("Voice commands system initialized");
});