// voice-integration.js
// This file provides integration between voice recognition and timer functionality

// Track our installation attempts
let installAttemptCount = 0;
const MAX_INSTALL_ATTEMPTS = 10;

// Main function to integrate voice and timer systems
function initializeVoiceTimerIntegration() {
    console.log("Initializing voice timer integration");
    
    // Define the functions we need to capture from other modules
    const requiredFunctions = [
        'createCustomTimer',
        'startTimer',
        'pauseTimer', 
        'resetTimer',
        'removeTimer',
        'startAllTimers',
        'pauseAllTimers',
        'resetAllTimers',
        'clearAllTimers',
        'findTimerByNameApprox'
    ];
    
    // Try to capture required functions
    try {
        // Verify createCustomTimer is available
        if (typeof window.createCustomTimer === 'function') {
            console.log("Captured createCustomTimer function");
        }
        
        // Verify startTimer is available
        if (typeof window.startTimer === 'function') {
            console.log("Captured startTimer function");
        }
        
        // Verify pauseTimer is available
        if (typeof window.pauseTimer === 'function') {
            console.log("Captured pauseTimer function");
        }
        
        // Verify resetTimer is available
        if (typeof window.resetTimer === 'function') {
            console.log("Captured resetTimer function");
        }
        
        // Verify removeTimer is available
        if (typeof window.removeTimer === 'function') {
            console.log("Captured removeTimer function");
        }
        
        // Verify startAllTimers is available
        if (typeof window.startAllTimers === 'function') {
            console.log("Captured startAllTimers function");
        }
        
        // Verify pauseAllTimers is available
        if (typeof window.pauseAllTimers === 'function') {
            console.log("Captured pauseAllTimers function");
        }
        
        // Verify resetAllTimers is available
        if (typeof window.resetAllTimers === 'function') {
            console.log("Captured resetAllTimers function");
        }
        
        // Verify clearAllTimers is available
        if (typeof window.clearAllTimers === 'function') {
            console.log("Captured clearAllTimers function");
        }
        
        // Verify findTimerByNameApprox is available
        if (typeof window.findTimerByNameApprox === 'function') {
            console.log("Captured findTimerByNameApprox function");
        }
        
        // Now try to install our timer processor into the voice system
        attemptInstallation();
        
    } catch (error) {
        console.error("Error initializing voice-timer integration:", error);
    }
    
    console.log("Voice timer integration initialization complete");
}

// Try to install our timer processor a few times
function attemptInstallation() {
    installAttemptCount++;
    console.log(`Installation attempt ${installAttemptCount} for timer voice processor`);
    
    // Check if the speech recognizer is ready
    if (typeof window.processTimerVoiceCommand === 'function') {
        console.log("Timer voice processor installed successfully");
    } else {
        console.log("Voice command processor not found yet, will retry");
        
        if (installAttemptCount < MAX_INSTALL_ATTEMPTS) {
            // Try again in a second
            setTimeout(attemptInstallation, 1000);
        } else {
            console.warn(`Giving up after ${MAX_INSTALL_ATTEMPTS} attempts to install timer voice processor`);
        }
    }
}

// Helper function to test voice commands
function testVoiceCommand(command) {
    if (typeof window.processVoiceCommand === 'function') {
        console.log(`Testing voice command: "${command}"`);
        
        // Convert to lowercase as the processor expects
        const commandLower = command.toLowerCase();
        
        // Process the command and return the result
        const result = window.processVoiceCommand(commandLower);
        console.log(`Command processed, result: ${result}`);
        return result;
    } else {
        console.warn("Voice command processor not available for testing");
        return false;
    }
}

// Set up a window.onload handler to ensure all scripts are loaded
window.addEventListener('load', function() {
    console.log("Window loaded, initializing voice timer integration");
    
    // Start the initialization
    initializeVoiceTimerIntegration();
});

// Also initialize on DOMContentLoaded to catch early
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded in voice-integration.js");
});

// Expose helper functions globally
window.testVoiceCommand = testVoiceCommand;