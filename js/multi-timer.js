// Enhanced multi-timer implementation for recipe-viewer.html

// Global variables for timers
window.activeTimers = window.activeTimers || [];
let nextTimerId = 1;
let currentStepId = null;

// Function to scan step text for multiple timer references with enhanced naming
function scanForTimers(stepText, stepTitle) {
    const timerRegex = /\((\d+)[-\s]?(\d+)?\s*minutes?\)/gi;
    const timerInstances = [];
    let match;
    
    // Find all timer instances in the text
    while ((match = timerRegex.exec(stepText)) !== null) {
        let minutes = parseInt(match[1]);
        if (match[2]) {
            // If there's a range (e.g. "2-4 minutes"), use the average
            minutes = (parseInt(match[1]) + parseInt(match[2])) / 2;
        }
        
        // Get comprehensive timer description
        const timerDesc = generateTimerName(stepText, match.index, stepTitle);
        
        timerInstances.push({
            minutes: minutes,
            seconds: Math.round(minutes * 60),
            fullMatch: match[0],
            context: timerDesc
        });
    }
    
    return timerInstances;
}

// Function to intelligently generate a timer name based on context
function generateTimerName(stepText, matchIndex, stepTitle) {
    // Extract surrounding text for context
    const beforeText = stepText.substring(Math.max(0, matchIndex - 100), matchIndex).trim();
    const afterText = stepText.substring(matchIndex).trim();
    
    // Enhanced list of cooking verbs to search for, prioritizing common ones
    const cookingVerbs = [
        // Primary cooking verbs (most common)
        'simmer', 'cook', 'bake', 'roast', 'boil', 'fry', 'grill', 'wait', 'rest',
        // Secondary cooking verbs
        'add', 'brown', 'caramelize', 'cool', 'chill', 'freeze', 'heat', 'marinate', 
        'melt', 'mix', 'preheat', 'reduce', 'refrigerate', 'sauté', 'steam', 'stir', 
        'warm', 'whip', 'whisk'
    ];
    
    // Common food items and ingredients
    const foodItems = [
        // Protein
        'chicken', 'beef', 'pork', 'steak', 'fish', 'shrimp', 'salmon', 'tuna', 'tofu', 
        'meat', 'sausage', 'bacon', 'ham', 'turkey', 'lamb', 'chops',
        // Vegetables
        'onion', 'garlic', 'broccoli', 'carrot', 'potato', 'potatoes', 'tomato', 
        'bell pepper', 'asparagus', 'cauliflower', 'celery', 'spinach', 'kale', 
        'lettuce', 'cabbage', 'mushroom', 'zucchini', 'eggplant', 'squash', 'peas',
        // Grains and starches
        'rice', 'pasta', 'noodles', 'dough', 'bread', 'pizza',
        // Other common foods
        'sauce', 'soup', 'mixture', 'batter', 'beans', 'eggs', 'cheese', 'butter', 
        'oil', 'water', 'milk', 'cream', 'flour', 'sugar'
    ];
    
    // Time-related action words
    const timeActions = ['wait', 'rest', 'let', 'allow', 'set', 'stand'];
    
    // APPROACH 1: Look for clear verb-then-object pattern near the timer reference
    // This matches patterns like "Simmer chicken until..." or "Cook pork chops for..."
    const immediateContext = stepText.substring(Math.max(0, matchIndex - 60), matchIndex).trim();
    
    // Regex for cooking verb followed by food item close to the timer
    const verbObjectNearTimerPattern = /(?:^|[.;!?]\s*)(?:to\s+)?([a-z]+)(?:\s+[\w\s]*?)?(?:\s+)((?:the\s+)?[a-z]+(?:\s+[a-z]+)?)(?=(?:[\s,]+(?:until|for|about|when))|\s*$)/i;
    
    const nearMatch = immediateContext.match(verbObjectNearTimerPattern);
    if (nearMatch) {
        const verb = nearMatch[1].trim().toLowerCase();
        const object = nearMatch[2].trim().toLowerCase().replace(/^the\s+/, '');
        
        // Verify the verb is a cooking verb and the object is a food item
        if ((cookingVerbs.includes(verb.toLowerCase()) || timeActions.includes(verb.toLowerCase())) &&
            (foodItems.includes(object) || object.split(' ').some(word => foodItems.includes(word)))) {
            // Format: "Verb object" - clean and consistent
            return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${object}`;
        }
    }
    
    // APPROACH 2: Look for specific time-related actions like "Wait" or "Rest"
    // This catches cases like "Wait 5 minutes before proceeding"
    const timeActionPattern = /(?:^|[.;!?]\s*)(wait|rest|let|allow|stand|set)(?:\s+[^.;!?]*?)(?=\s*\d+\s*(?:min|minute|sec|second|hour))/i;
    const timeMatch = beforeText.match(timeActionPattern);
    
    if (timeMatch) {
        const timeVerb = timeMatch[1].toLowerCase();
        // For wait/rest/stand, make a simple "Wait timer" style name
        return `${timeVerb.charAt(0).toUpperCase() + timeVerb.slice(1)} timer`;
    }
    
    // APPROACH 3: Look for cooking verb + food item in the full context
    // This pattern looks for sentences like: "Add the chicken and cook for X minutes"
    const verbObjectPattern = /(?:^|[.;!?]\s*)(?:to\s+)?(simmer|cook|bake|roast|boil|fry|grill|heat|sauté|brown|warm|steam)[^.;!?]+((?:chicken|beef|pork|fish|steak|chops|broccoli|potato|potatoes|onion|garlic|sauce|mixture|dough|pasta|rice)[^.;!?]*?)(?:\s+(?:for|until|about|when)\b)/i;
    
    const match = beforeText.match(verbObjectPattern);
    if (match) {
        // Create a clear "Verb food" format with capitalization
        const verb = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        
        // Extract and clean the object, focusing on the food item
        let object = match[2].trim();
        // Remove articles and excess descriptors
        object = object.replace(/^(?:the|a|an)\s+/, '').trim();
        
        // Limit object length for conciseness
        if (object.length > 25) {
            // Try to find a primary food item in the object text
            for (const item of foodItems) {
                if (object.includes(item)) {
                    object = item;
                    break;
                }
            }
        }
        
        return `${verb} ${object}`;
    }
    
    // APPROACH 4: Extract individual verb and food item from surrounding text
    // Useful when the verb and object aren't neatly arranged in a single phrase
    let extractedVerb = null;
    let extractedObject = null;
    
    // Find a cooking verb in the text, prioritizing those closer to the timer
    for (const verb of cookingVerbs) {
        // Check if verb appears in last 50 chars (more recent context)
        const recentContext = beforeText.substring(Math.max(0, beforeText.length - 50));
        const verbRegexRecent = new RegExp(`\\b${verb}\\b`, 'i');
        
        if (verbRegexRecent.test(recentContext)) {
            extractedVerb = verb;
            break;
        }
        
        // If not in recent context, check full beforeText
        const verbRegex = new RegExp(`\\b${verb}\\b`, 'i');
        if (verbRegex.test(beforeText)) {
            extractedVerb = verb;
            break;
        }
    }
    
    // Find most relevant food item, prioritizing those closer to the timer
    const wordsBeforeTimer = beforeText.split(/\s+/).slice(-10); // Last 10 words before timer
    for (const word of wordsBeforeTimer) {
        const cleanWord = word.replace(/[^a-z]/gi, '').toLowerCase();
        if (foodItems.includes(cleanWord)) {
            extractedObject = cleanWord;
            break;
        }
    }
    
    // If no object found in recent words, scan the whole context
    if (!extractedObject) {
        for (const item of foodItems) {
            const itemRegex = new RegExp(`\\b${item}\\b`, 'i');
            if (itemRegex.test(beforeText)) {
                extractedObject = item;
                break;
            }
        }
    }
    
    // If we found both a verb and an object, use them
    if (extractedVerb && extractedObject) {
        return `${extractedVerb.charAt(0).toUpperCase() + extractedVerb.slice(1)} ${extractedObject}`;
    }
    
    // APPROACH 5: Use just the verb with "timer" if no food item was found
    if (extractedVerb) {
        return `${extractedVerb.charAt(0).toUpperCase() + extractedVerb.slice(1)} timer`;
    }
    
    // APPROACH 6: Check for "wait" or "rest" followed by time
    const waitPattern = /(?:wait|rest|let\s+(?:it|this))(?:\s+[^.;!?]*?)?(?=\s*\d+\s*(?:min|minute|sec|second|hour))/i;
    if (waitPattern.test(beforeText)) {
        return "Wait timer";
    }
    
    // APPROACH 7: Last resort - use step title, but more cleanly
    if (stepTitle && stepTitle.trim() !== '') {
        // Extract just the step number if possible
        const stepNumberMatch = stepTitle.match(/step\s+(\d+)/i);
        if (stepNumberMatch) {
            return `Step ${stepNumberMatch[1]} timer`;
        }
        
        // If we have a verb at least, make it "Verb timer"
        if (extractedVerb) {
            return `${extractedVerb.charAt(0).toUpperCase() + extractedVerb.slice(1)} timer`;
        }
        
        // Clean the step title for use in timer name
        if (stepTitle.length > 20) {
            return `${stepTitle.substring(0, 12)}... timer`;
        }
        return `${stepTitle} timer`;
    }
    
    // FALLBACK: Create a simple timer label from nearby context
    let contextStart = Math.max(0, matchIndex - 20); // Shorter context for conciseness
    let context = stepText.substring(contextStart, matchIndex).trim();
    
    // Clean up the context
    if (contextStart > 0 && context.indexOf(' ') !== -1) {
        context = context.substring(context.indexOf(' ')).trim();
    }
    
    // Create a simple label if context is too short
    if (context.length < 5) {
        return "Timer";
    }
    
    // Format and limit length for readability
    if (context.length > 30) {
        context = context.substring(Math.max(0, context.length - 30)).trim();
        if (context.indexOf(' ') !== -1) {
            context = context.substring(context.indexOf(' ')).trim();
        }
    }
    
    // Capitalize and return
    return context.charAt(0).toUpperCase() + context.slice(1);
}
// Function to create and add a new timer to the UI with customization
function createTimer(timerData) {
    // Find the multi-timer container (may not exist until document is fully loaded)
    const multiTimerContainer = document.getElementById('multi-timer-container');
    if (!multiTimerContainer) {
        console.error("Multi-timer container not found");
        return null;
    }
    
    // Check if a timer with this step ID and similar context already exists
    const existingTimer = findExistingTimer(timerData);
    if (existingTimer) {
        console.log("Timer already exists for this step and context:", existingTimer.id);
        return existingTimer.id; // Return existing timer ID instead of creating a new one
    }
    
    const timerId = `timer-${nextTimerId++}`;
    const seconds = timerData.seconds;
    
    // Create timer HTML with editable name and step indicator
    const timerElement = document.createElement('div');
    timerElement.className = 'timer-item' + 
                        (timerData.stepId && timerData.stepId !== currentStepId ? 
                        ' timer-previous-step' : '');
    timerElement.id = timerId;
    
    // Format the initial time display
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    // Extract the step number from the ID
    let stepNumber = "";
    if (timerData.stepId) {
        const stepMatch = timerData.stepId.match(/(?:prep|cooking)-step-(\d+)/i);
        if (stepMatch) {
            stepNumber = stepMatch[1];
        }
    }

    // Create the step indicator text based on whether it's current step
    const isCurrentStep = (timerData.stepId === currentStepId);
    const stepIndicatorHTML = stepNumber ? 
        (isCurrentStep ? 
            `<span class="timer-step-indicator current">Step ${stepNumber} <span class="current-dot">•</span></span>` : 
            `<span class="timer-step-indicator">Step ${stepNumber}</span>`) : 
        '';
    
    // Create HTML structure with editable name and step indicator
    timerElement.innerHTML = `
        <div class="timer-name-container">
            <span class="timer-context" title="Click to edit">${timerData.context}</span>
            <input type="text" class="timer-edit-name" style="display: none;" value="${timerData.context}">
            <button class="timer-edit-btn" title="Edit timer name">✎</button>
            ${stepIndicatorHTML}
        </div>
        <div class="timer-controls">
            <div class="timer-buttons">
                <button class="timer-button primary-button start-btn">Start</button>
                <button class="timer-button primary-button pause-btn" style="display: none;">Pause</button>
                <button class="timer-button secondary-button reset-btn" style="display: none;">Reset</button>
                <button class="timer-button stop-btn" style="display: none;">Stop</button>
            </div>
            <div class="timer-display">${timeDisplay}</div>
            <button class="timer-button remove-btn" title="Remove timer">✕</button>
        </div>
    `;
    
    // Add the timer to the container
    multiTimerContainer.appendChild(timerElement);
    
    // Add event listeners to the timer buttons
    const startBtn = timerElement.querySelector('.start-btn');
    const pauseBtn = timerElement.querySelector('.pause-btn');
    const resetBtn = timerElement.querySelector('.reset-btn');
    const stopBtn = timerElement.querySelector('.stop-btn');
    const removeBtn = timerElement.querySelector('.remove-btn');
    
    startBtn.addEventListener('click', () => startMultiTimer(timerId));
    pauseBtn.addEventListener('click', () => pauseMultiTimer(timerId));
    resetBtn.addEventListener('click', () => resetMultiTimer(timerId));
    stopBtn.addEventListener('click', () => stopMultiTimer(timerId));
    removeBtn.addEventListener('click', () => removeMultiTimer(timerId));
    
    // Add events for name editing
    const timerContext = timerElement.querySelector('.timer-context');
    const timerEditInput = timerElement.querySelector('.timer-edit-name');
    const editBtn = timerElement.querySelector('.timer-edit-btn');
    
    // Enable editing when clicking on name or edit button
    timerContext.addEventListener('click', () => {
        toggleTimerNameEdit(timerId, true);
    });
    
    editBtn.addEventListener('click', () => {
        toggleTimerNameEdit(timerId, true);
    });
    
    // Save the name when pressing Enter or blurring
    timerEditInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveTimerName(timerId);
        } else if (e.key === 'Escape') {
            cancelTimerNameEdit(timerId);
        }
    });
    
    timerEditInput.addEventListener('blur', () => {
        saveTimerName(timerId);
    });
    
    // Add timer to active timers
    window.activeTimers.push({
        id: timerId,
        seconds: seconds,
        originalSeconds: seconds,
        interval: null,
        running: false,
        context: timerData.context,
        name: timerData.context, // For compatibility with older code
        customName: false, // Track if name has been customized
        stepId: timerData.stepId || 'custom-timer', // Store the step ID
        isCurrentStep: !timerData.stepId ? true : (timerData.stepId === currentStepId) // Mark if from current step
    });
    
    return timerId;
}

// Function to toggle timer name editing mode
function toggleTimerNameEdit(timerId, enableEdit) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const timerContext = timerElement.querySelector('.timer-context');
    const timerEditInput = timerElement.querySelector('.timer-edit-name');
    
    if (enableEdit) {
        // Enable editing
        timerContext.style.display = 'none';
        timerEditInput.style.display = 'inline-block';
        timerEditInput.focus();
        timerEditInput.select();
    } else {
        // Disable editing
        timerContext.style.display = 'inline-block';
        timerEditInput.style.display = 'none';
    }
}

// Function to save timer name after editing
function saveTimerName(timerId) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const timerContext = timerElement.querySelector('.timer-context');
    const timerEditInput = timerElement.querySelector('.timer-edit-name');
    const newName = timerEditInput.value.trim();
    
    if (newName) {
        // Update DOM and timer object
        timerContext.textContent = newName;
        
        // Find and update the timer in activeTimers
        const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
        if (timerIndex !== -1) {
            window.activeTimers[timerIndex].context = newName;
            window.activeTimers[timerIndex].name = newName; // For compatibility
            window.activeTimers[timerIndex].customName = true; // Mark as customized
        }
    }
    
    // Hide edit input
    toggleTimerNameEdit(timerId, false);
}

// Function to cancel timer name editing
function cancelTimerNameEdit(timerId) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const timerContext = timerElement.querySelector('.timer-context');
    const timerEditInput = timerElement.querySelector('.timer-edit-name');
    
    // Reset input to current value
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex !== -1) {
        timerEditInput.value = window.activeTimers[timerIndex].context;
    }
    
    // Hide edit input
    toggleTimerNameEdit(timerId, false);
}

// Function to start a specific timer
function startTimer(timerId) {
    return startMultiTimer(timerId);
}

function startMultiTimer(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    if (timer.running) return; // Already running
    
    // Update UI
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const startBtn = timerElement.querySelector('.start-btn');
    const pauseBtn = timerElement.querySelector('.pause-btn');
    const resetBtn = timerElement.querySelector('.reset-btn');
    const stopBtn = timerElement.querySelector('.stop-btn');
    
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    resetBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
    
    // Start the timer interval
    timer.running = true;
    timer.interval = setInterval(() => {
        if (timer.seconds > 0) {
            timer.seconds--;
            updateMultiTimerDisplay(timerId);
        } else {
            // Timer complete
            clearInterval(timer.interval);
            timer.running = false;
            
            // Update UI
            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            resetBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            
            // Play a sound or show an alert when timer is done
            playTimerCompleteSound();
            
            // Highlight the timer to indicate completion
            timerElement.classList.add('timer-completed');
            
            // Add a "Timer Complete" message
            const timerDisplay = timerElement.querySelector('.timer-display');
            timerDisplay.innerHTML = 'COMPLETE!';
            
            // Optional: Show alert for the specific timer
            const alertMessage = `Timer complete: ${timer.context}`;
            showTimerAlert(alertMessage);
        }
    }, 1000);
}

// Function to pause a specific timer
function pauseTimer(timerId) {
    return pauseMultiTimer(timerId);
}

function pauseMultiTimer(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    if (!timer.running) return; // Not running
    
    // Clear the interval
    clearInterval(timer.interval);
    timer.running = false;
    
    // Update UI
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const startBtn = timerElement.querySelector('.start-btn');
    const pauseBtn = timerElement.querySelector('.pause-btn');
    
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    // Keep reset and stop buttons visible when paused
}

// Function to stop a specific timer (stop and reset)
function stopMultiTimer(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    
    // Clear interval if running
    if (timer.running) {
        clearInterval(timer.interval);
        timer.running = false;
    }
    
    // Reset timer seconds
    timer.seconds = timer.originalSeconds;
    
    // Update UI
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    timerElement.classList.remove('timer-completed');
    
    const startBtn = timerElement.querySelector('.start-btn');
    const pauseBtn = timerElement.querySelector('.pause-btn');
    const resetBtn = timerElement.querySelector('.reset-btn');
    const stopBtn = timerElement.querySelector('.stop-btn');
    
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    
    updateMultiTimerDisplay(timerId);
}

// Function to reset a specific timer
function resetTimer(timerId) {
    return resetMultiTimer(timerId);
}

function resetMultiTimer(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    
    // Reset timer seconds without stopping if it's running
    timer.seconds = timer.originalSeconds;
    
    // Update UI
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    timerElement.classList.remove('timer-completed');
    
    // Only update display, don't change button states
    updateMultiTimerDisplay(timerId);
}

// Function to remove a specific timer
function removeTimer(timerId) {
    return removeMultiTimer(timerId);
}

function removeMultiTimer(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    
    // Clear interval if running
    if (timer.running) {
        clearInterval(timer.interval);
    }
    
    // Remove from activeTimers array
    window.activeTimers.splice(timerIndex, 1);
    
    // Remove from DOM
    const timerElement = document.getElementById(timerId);
    if (timerElement) {
        timerElement.remove();
    }
    
    // Hide container if no timers left
    if (window.activeTimers.length === 0) {
        const multiTimerContainer = document.getElementById('multi-timer-container');
        if (multiTimerContainer) {
            multiTimerContainer.style.display = 'none';
        }
    }
}

// Function to update the display of a specific timer
function updateMultiTimerDisplay(timerId) {
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    const minutes = Math.floor(timer.seconds / 60);
    const seconds = timer.seconds % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const timerDisplay = timerElement.querySelector('.timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = timeDisplay;
    }
}

// Function to play a sound when timer completes
function playTimerCompleteSound() {
    try {
        // Create an audio element
        const audio = new Audio();
        
        // Try to use a simple beep sound
        audio.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'; // Base64 encoded simple beep
        
        // Fallback to simple beep if needed
        audio.onerror = function() {
            console.log('Using fallback audio alert');
            const fallbackAudio = new Audio('about:blank');
            fallbackAudio.play().catch(e => console.log('Could not play fallback sound:', e));
        };
        
        // Play the sound
        audio.play().catch(e => {
            console.log('Could not play sound automatically:', e);
            // This may happen due to browser autoplay policies
        });
    } catch (e) {
        console.log('Audio playback error:', e);
    }
}

// Function to show a non-blocking timer completion alert
function multiTimerShowAlert(message) {
    console.log("Timer alert:", message);
    
    // Create a toast notification element if it doesn't exist
    let toast = document.querySelector('.timer-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'timer-toast';
        document.body.appendChild(toast);
    } else {
        // Clear any existing timeout to prevent early removal
        if (toast._removeTimeout) {
            clearTimeout(toast._removeTimeout);
        }
    }
    
    // Set the message
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // Add a dismiss button
    const dismissBtn = document.createElement('span');
    dismissBtn.innerHTML = '&times;';
    dismissBtn.style.marginLeft = '10px';
    dismissBtn.style.cursor = 'pointer';
    dismissBtn.style.fontWeight = 'bold';
    dismissBtn.style.fontSize = '16px';
    
    dismissBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
    
    // Replace any existing dismiss button
    const existingBtn = toast.querySelector('span');
    if (existingBtn) {
        toast.removeChild(existingBtn);
    }
    toast.appendChild(dismissBtn);
    
    // Also speak the message if speech synthesis is available (important for voice commands)
    if ('speechSynthesis' in window && typeof window.isSpeaking !== 'undefined' && !window.isSpeaking) {
        const speech = new SpeechSynthesisUtterance(message);
        speech.volume = 0.7; // Slightly quieter than regular speech
        speech.rate = 1.1;   // Slightly faster
        window.speechSynthesis.speak(speech);
    }
    
    // Remove it after 5 seconds
    toast._removeTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 5000);
}

// Function to find timer by approximate name match
function findTimerByNameApprox(searchName) {
    if (!searchName || !window.activeTimers || window.activeTimers.length === 0) {
        return null;
    }
    
    searchName = searchName.toLowerCase().trim();
    console.log("Searching for timer with name:", searchName);
    
    // First try exact match
    for (const timer of window.activeTimers) {
        if (timer.context && timer.context.toLowerCase() === searchName) {
            console.log("Found exact match:", timer.context);
            return timer;
        }
    }
    
    // Then try stemming and removing common words
    const stemmedSearch = removeCommonWords(searchName);
    for (const timer of window.activeTimers) {
        if (!timer.context) continue;
        const stemmedTimer = removeCommonWords(timer.context.toLowerCase());
        if (stemmedTimer === stemmedSearch) {
            console.log("Found stemmed match:", timer.context);
            return timer;
        }
    }
    
    // Then try to find a timer where searchName is contained in the timer name
    for (const timer of window.activeTimers) {
        if (timer.context && timer.context.toLowerCase().includes(searchName)) {
            console.log("Found contains match:", timer.context);
            return timer;
        }
    }
    
    // Try to find a timer where timer name is contained in the search term
    for (const timer of window.activeTimers) {
        if (!timer.context) continue;
        const timerName = timer.context.toLowerCase();
        // If the timer name is at least 5 chars and is contained in the search
        if (timerName.length >= 5 && searchName.includes(timerName)) {
            console.log("Found reverse contains match:", timer.context);
            return timer;
        }
    }
    
    // Match by key word relevance
    const searchWords = searchName.split(/\s+/).filter(word => word.length > 2);
    const timerScores = [];
    
    for (const timer of window.activeTimers) {
        if (!timer.context) continue;
        const timerName = timer.context.toLowerCase();
        const timerWords = timerName.split(/\s+/);
        
        let score = 0;
        let matchedWords = 0;
        
        for (const searchWord of searchWords) {
            // Exact word match scores higher
            if (timerWords.includes(searchWord)) {
                score += 10;
                matchedWords++;
            } 
            // Partial word match scores lower
            else if (timerWords.some(word => word.includes(searchWord) || searchWord.includes(word))) {
                score += 5;
                matchedWords++;
            }
        }
        
        // Bonus if all search words matched
        if (matchedWords === searchWords.length && searchWords.length > 0) {
            score += 15;
        }
        
        // Penalty for length difference to prefer closer matches
        const lengthDifference = Math.abs(timerName.length - searchName.length);
        score -= lengthDifference * 0.1;
        
        if (score > 0) {
            timerScores.push({ timer, score });
        }
    }
    
    // Sort by score and return the best match if any
    if (timerScores.length > 0) {
        timerScores.sort((a, b) => b.score - a.score);
        console.log("Found best fuzzy match:", timerScores[0].timer.context, "with score", timerScores[0].score);
        return timerScores[0].timer;
    }
    
    // Finally try to find a timer where any word in searchName matches a word in timer name
    for (const timer of window.activeTimers) {
        if (!timer.context) continue;
        const timerWords = timer.context.toLowerCase().split(/\s+/);
        for (const searchWord of searchWords) {
            if (searchWord.length > 2 && timerWords.includes(searchWord)) {
                console.log("Found word match:", timer.context);
                return timer;
            }
        }
    }
    
    console.log("No timer found matching:", searchName);
    return null; // No match found
}

// Helper function to remove common words for better matching
function removeCommonWords(text) {
    const commonWords = ['the', 'and', 'for', 'with', 'a', 'of', 'to', 'in', 'on', 'timer'];
    return text.split(/\s+/)
        .filter(word => !commonWords.includes(word) && word.length > 1)
        .join(' ');
}

// Function to start all timers
function startAllTimers() {
    let startedCount = 0;
    window.activeTimers.forEach(timer => {
        if (!timer.running) {
            startMultiTimer(timer.id);
            startedCount++;
        }
    });
    
    if (startedCount > 0) {
        showTimerAlert(`Started ${startedCount} timer${startedCount > 1 ? 's' : ''}`);
    } else {
        showTimerAlert("No inactive timers to start");
    }
}

// Function to pause all timers
function pauseAllTimers() {
    let pausedCount = 0;
    window.activeTimers.forEach(timer => {
        if (timer.running) {
            pauseMultiTimer(timer.id);
            pausedCount++;
        }
    });
    
    if (pausedCount > 0) {
        showTimerAlert(`Paused ${pausedCount} timer${pausedCount > 1 ? 's' : ''}`);
    } else {
        showTimerAlert("No active timers to pause");
    }
}

// Function to reset all timers
function resetAllTimers() {
    let resetCount = 0;
    window.activeTimers.forEach(timer => {
        resetMultiTimer(timer.id);
        resetCount++;
    });
    
    if (resetCount > 0) {
        showTimerAlert(`Reset ${resetCount} timer${resetCount > 1 ? 's' : ''}`);
    } else {
        showTimerAlert("No timers to reset");
    }
}

// Function to clear all timers
function clearAllTimers() {
    const timerCount = window.activeTimers.length;
    const timerIds = [...window.activeTimers].map(t => t.id);
    
    timerIds.forEach(id => removeMultiTimer(id));
    
    if (timerCount > 0) {
        showTimerAlert(`Cleared all timers (${timerCount})`);
    }
}

// Function to create a custom timer from voice command
function createCustomTimer(name, minutes) {
    const timerData = {
        context: name.charAt(0).toUpperCase() + name.slice(1),
        seconds: minutes * 60,
        minutes: minutes,
        fullMatch: `(${minutes} minutes)`
    };
    
    const timerId = createTimer(timerData);
    showTimerAlert(`Created new timer: ${name} (${minutes} minutes)`);
    
    // Show the multi-timer container if it was hidden
    const multiTimerContainer = document.getElementById('multi-timer-container');
    if (multiTimerContainer) {
        multiTimerContainer.style.display = 'block';
    }
    
    return timerId;
}

// Function to create timers from the current step
function createTimersFromCurrentStep(clearExisting = false) {
    console.log("Creating timers from current step, clearExisting:", clearExisting);
    
    // Clear all existing timers if specified
    if (clearExisting && typeof window.clearAllTimers === 'function') {
        window.clearAllTimers();
    }
    
    // Try to access the variables in different ways
    let currentSteps = window.currentSteps;
    let currentStepIndex = window.currentStepIndex;
    
    // If not available directly, try to access via the recipe object
    if (!currentSteps && window.recipe) {
        currentSteps = window.recipe.preparationSteps; // Default to prep steps
        currentStepIndex = 0; // Default to first step
    }
    
    // If still not available, try to get from DOM
    if (!currentSteps) {
        // Check if we're in prep or cooking phase
        const prepPhase = document.getElementById('prep-phase');
        const cookingPhase = document.getElementById('cooking-phase');
        
        const isInCookingPhase = cookingPhase && cookingPhase.classList.contains('active');
        
        // Try to get step text directly from the DOM
        const mainStepEl = document.getElementById('main-step');
        const bulletListEl = document.getElementById('bullet-list');
        const stepTitle = document.getElementById('step-number')?.textContent || '';
        
        if (mainStepEl) {
            const stepText = mainStepEl.textContent;
            const bullets = Array.from(bulletListEl?.querySelectorAll('li') || [])
                .map(li => li.textContent);
            
            // Update current step ID based on step title
            currentStepId = `dom-step-${stepTitle.replace(/\s+/g, '-').toLowerCase()}`;
            
            // Analyze this text for timers
            const timerInstances = scanForTimers(stepText + ' ' + bullets.join(' '), stepTitle);
            
            console.log("Found timer instances from DOM:", timerInstances.length);
            
            // Create a timer for each instance
            timerInstances.forEach(timerData => {
                // Add step ID to the timer data
                timerData.stepId = currentStepId;
                createTimer(timerData);
            });
            
            // Show container if timers were found
            if (timerInstances.length > 0) {
                const multiTimerContainer = document.getElementById('multi-timer-container');
                if (multiTimerContainer) {
                    multiTimerContainer.style.display = 'block';
                }
            }
            
            return; // Exit early since we handled it
        }
        
        console.log("Could not determine current step content");
        return;
    }
    
    // Normal flow if currentSteps is available
    const currentStep = currentSteps[currentStepIndex];
    if (!currentStep) {
        console.log("Current step is undefined");
        return;
    }

    // Update current step ID
    currentStepId = currentStep.id;
    
    // Combine main step and bullets for complete text analysis
    const bulletText = (currentStep.bullets || []).join(' ');
    const stepText = currentStep.mainStep + ' ' + bulletText;
    
    console.log("Scanning step text:", stepText);
    
    // Scan for timer references
    const timerInstances = scanForTimers(stepText, currentStep.title);
    console.log("Found timer instances:", timerInstances.length, timerInstances);
    
    // Create a timer for each instance
    if (timerInstances.length > 0) {
        timerInstances.forEach(timerData => {
            // Add step ID to the timer data
            timerData.stepId = currentStep.id;
            createTimer(timerData);
        });
        
        // Update the multi-timer container visibility
        const multiTimerContainer = document.getElementById('multi-timer-container');
        if (multiTimerContainer) {
            multiTimerContainer.style.display = 'block';
        }
    }
}

// Add a function to check for existing similar timers to avoid duplicates
function findExistingTimer(timerData) {
    // If no step ID provided, we can't check for duplicates effectively
    if (!timerData.stepId) {
        return null;
    }
    
    // First, try to find an exact match
    const exactMatch = window.activeTimers.find(timer => 
        timer.stepId === timerData.stepId && 
        timer.context === timerData.context
    );
    
    if (exactMatch) {
        return exactMatch;
    }
    
    // If no exact match, check for similar contexts (more fuzzy matching)
    const similarMatch = window.activeTimers.find(timer => {
        if (timer.stepId !== timerData.stepId) return false;
        
        // Normalize both strings for comparison
        const normalize = str => str.toLowerCase().replace(/\s+/g, ' ').trim();
        const timerContext = normalize(timer.context);
        const newContext = normalize(timerData.context);
        
        // Check if one contains the other or if they're very similar
        return timerContext.includes(newContext) || 
               newContext.includes(timerContext);
    });
    
    return similarMatch || null;
}

// Function to update all timer step indicators when navigating between steps
function updateAllTimerStepIndicators() {
    // Skip if no timers exist
    if (!window.activeTimers || window.activeTimers.length === 0) return;
    
    console.log("Updating timer step indicators, current step ID:", currentStepId);
    
    // Update each timer's isCurrentStep property based on currentStepId
    window.activeTimers.forEach(timer => {
        const wasCurrentStep = timer.isCurrentStep;
        timer.isCurrentStep = (timer.stepId === currentStepId);
        
        // If the current step status changed, update the UI
        if (wasCurrentStep !== timer.isCurrentStep) {
            updateTimerStepIndicatorUI(timer.id);
        }
    });
}

// Function to update the UI of a specific timer's step indicator
function updateTimerStepIndicatorUI(timerId) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;
    
    const timerIndex = window.activeTimers.findIndex(timer => timer.id === timerId);
    if (timerIndex === -1) return;
    
    const timer = window.activeTimers[timerIndex];
    const stepIndicator = timerElement.querySelector('.timer-step-indicator');
    
    if (stepIndicator && timer.stepId) {
        // Extract the step number from the ID
        let stepNumber = "";
        const stepMatch = timer.stepId.match(/(?:prep|cooking)-step-(\d+)/i);
        if (stepMatch) {
            stepNumber = stepMatch[1];
        }
        
        // Update the indicator text and class
        if (timer.isCurrentStep) {
            stepIndicator.innerHTML = `Step ${stepNumber} <span class="current-dot">•</span>`;
            stepIndicator.classList.add('current');
        } else {
            stepIndicator.textContent = `Step ${stepNumber}`;
            stepIndicator.classList.remove('current');
        }
    }
}


// Make functions available globally
document.addEventListener('DOMContentLoaded', function() {
    // Expose public API
    window.createTimersFromCurrentStep = createTimersFromCurrentStep;
    window.createTimer = createTimer;
    window.startTimer = startTimer;
    window.pauseTimer = pauseTimer;
    window.resetTimer = resetTimer;
    window.removeTimer = removeTimer;
    window.startAllTimers = startAllTimers;
    window.pauseAllTimers = pauseAllTimers;
    window.resetAllTimers = resetAllTimers;
    window.clearAllTimers = clearAllTimers;
    window.findTimerByNameApprox = findTimerByNameApprox;
    window.multiTimerShowAlert = multiTimerShowAlert;
    window.createCustomTimer = createCustomTimer;
    window.updateAllTimerStepIndicators = updateAllTimerStepIndicators;
    
    console.log("Multi-timer.js initialized and functions exposed");
});

// Fix for phase toggle buttons
document.addEventListener('DOMContentLoaded', function() {
    // Give time for everything to initialize
    setTimeout(function() {
        const prepPhase = document.getElementById('prep-phase');
        const cookingPhase = document.getElementById('cooking-phase');
        
        if (prepPhase && !prepPhase._hasClickHandler) {
            prepPhase.addEventListener('click', function() {
                console.log("Prep phase clicked");
                
                if (!window.recipe) {
                    console.log("Recipe not available");
                    return;
                }
                
                // Set the current phase, steps and index
                window.currentPhase = 'prep';
                window.currentStepIndex = 0;
                window.currentSteps = window.recipe.preparationSteps;
                
                // Update UI
                prepPhase.classList.add('active');
                cookingPhase.classList.remove('active');
                
                // Update display
                if (typeof window.updateStepDisplay === 'function') {
                    window.updateStepDisplay();
                }
            });
            prepPhase._hasClickHandler = true;
        }
        
        if (cookingPhase && !cookingPhase._hasClickHandler) {
            cookingPhase.addEventListener('click', function() {
                console.log("Cooking phase clicked");
                
                if (!window.recipe) {
                    console.log("Recipe not available");
                    return;
                }
                
                // Set the current phase, steps and index
                window.currentPhase = 'cooking';
                window.currentStepIndex = 0;
                window.currentSteps = window.recipe.cookingSteps;
                
                // Update UI
                prepPhase.classList.remove('active');
                cookingPhase.classList.add('active');
                
                // Update display
                if (typeof window.updateStepDisplay === 'function') {
                    window.updateStepDisplay();
                }
            });
            cookingPhase._hasClickHandler = true;
        }
    }, 1000);
});