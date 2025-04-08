// Scripts for recipe-viewer.html with enhanced speech functionality

// Global variables
let recipe = null;
let currentPhase = 'prep'; // 'prep' or 'cooking'
let currentStepIndex = 0;
let currentSteps = [];
let totalSteps = 0;
let timerInterval;
let timerSeconds = 0;
let timerRunning = false;
let speechRecognition = null;
let isVoiceActive = false;

// Enhanced speech variables
let isSpeaking = false;
let isPaused = false;
let speechQueue = [];
let currentSpeechIndex = 0;
let preferredVoice = null;
let pendingUtterance = null;

// DOM elements container - we'll populate this once in the getElements function
let elements = {};

// Get DOM elements - use references from compatibility helper if available
function getElements() {
    // If we've already populated elements, return it
    if (Object.keys(elements).length > 0) {
        return elements;
    }
    
    // If window.recipeElements exists (set by helper script), use that
    if (window.recipeElements) {
        elements = window.recipeElements;
        return elements;
    }
    
    // Fallback to direct references if helper not available
    elements = {
        recipeIntro: document.getElementById('recipe-intro'),
        recipeSteps: document.getElementById('recipe-steps'),
        startRecipeBtn: document.getElementById('start-recipe'),
        prevStepBtn: document.getElementById('prev-step'),
        nextStepBtn: document.getElementById('next-step'),
        finishRecipeBtn: document.getElementById('finish-recipe'),
        readStepBtn: document.getElementById('read-step'),
        voiceCommandBtn: document.getElementById('voice-command-button'),
        stepProgress: document.getElementById('step-progress'),
        stepNumberEl: document.getElementById('step-number'),
        mainStepEl: document.getElementById('main-step'),
        bulletListEl: document.getElementById('bullet-list'),
        prepPhase: document.getElementById('prep-phase'),
        cookingPhase: document.getElementById('cooking-phase'),
        voiceStatus: document.getElementById('voice-status'),
        timerContainer: document.getElementById('timer-container'),
        startTimerBtn: document.getElementById('start-timer'),
        pauseTimerBtn: document.getElementById('pause-timer'),
        resetTimerBtn: document.getElementById('reset-timer'),
        timerDisplay: document.getElementById('timer-display'),
        shoppingListBtn: document.getElementById('shopping-list'),
        shoppingListModal: document.getElementById('shopping-list-modal'),
        closeModalBtn: document.querySelector('.close-button'),
        printListBtn: document.getElementById('print-list')
    };
    
    return elements;
}

// Load recipe when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements immediately
    elements = getElements();
    
    // Initialize the preferred voice when voices are loaded
    window.speechSynthesis.onvoiceschanged = function() {
        const voices = window.speechSynthesis.getVoices();
        preferredVoice = voices.find(voice => voice.name === 'Google US English');
        
        // If not found, try to find any US English voice
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => voice.lang === 'en-US');
        }
        
        console.log("Default voice set to:", preferredVoice ? preferredVoice.name : "Browser default");
    };
    
    // Get recipe ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    if (recipeId) {
        loadRecipe(recipeId);
    } else {
        // If no recipe ID is provided, redirect to the recipe list
        window.location.href = 'index.html';
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Ensure speech synthesis is properly handled when page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add phase toggle functionality if not already set up
    if (elements.prepPhase && !elements.prepPhase._hasClickHandler) {
        elements.prepPhase.addEventListener('click', function() {
            console.log("Prep phase clicked");
            // Switch to preparation phase, first step
            currentPhase = 'prep';
            currentStepIndex = 0;
            currentSteps = recipe.preparationSteps;
            
            // Update phase indicators
            elements.prepPhase.classList.add('active');
            elements.cookingPhase.classList.remove('active');
            
            // Stop any ongoing speech when changing steps
            stopSpeaking();
            
            updateStepDisplay();
        });
        elements.prepPhase._hasClickHandler = true;
    }

    if (elements.cookingPhase && !elements.cookingPhase._hasClickHandler) {
        elements.cookingPhase.addEventListener('click', function() {
            console.log("Cooking phase clicked");
            // Switch to cooking phase, first step
            currentPhase = 'cooking';
            currentStepIndex = 0;
            currentSteps = recipe.cookingSteps;
            
            // Update phase indicators
            elements.prepPhase.classList.remove('active');
            elements.cookingPhase.classList.add('active');
            
            // Stop any ongoing speech when changing steps
            stopSpeaking();
            
            updateStepDisplay();
        });
        elements.cookingPhase._hasClickHandler = true;
    }
});

// Function to handle page visibility changes
function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, pause speech if it's speaking
        if (isSpeaking && !isPaused) {
            pauseSpeech();
        }
    } else {
        // Page is visible again, could optionally auto-resume speech here
        // Uncomment the line below if you want to auto-resume when page becomes visible
        // if (isSpeaking && isPaused) resumeSpeech();
    }
}

// Function to load recipe data
async function loadRecipe(recipeId) {
    try {
        const response = await fetch(`recipes/${recipeId}.json`);
        
        if (!response.ok) {
            throw new Error('Recipe not found');
        }
        
        recipe = await response.json();
       
        // Set up the recipe data
        initializeRecipe();
        
        // Set up the ingredients list
        populateIngredientsList();
        
        // Set up the current steps
        currentSteps = recipe.preparationSteps;
        totalSteps = recipe.preparationSteps.length + recipe.cookingSteps.length;
        
    } catch (error) {
        console.error('Error loading recipe:', error);
        document.body.innerHTML = `
            <div class="container">
                <div class="error-message">
                    <h2>Oops! Recipe Not Found</h2>
                    <p>We couldn't find the recipe you're looking for.</p>
                    <p>Error: ${error.message}</p>
                    <a href="index.html" class="primary-button">Back to Recipe List</a>
                </div>
            </div>
        `;
    }
}

// Initialize recipe data in the UI
function initializeRecipe() {
    // We already have elements initialized, no need to call getElements() again
    
    // Set recipe metadata
    document.title = `${recipe.title} - Recipe Viewer`;
    document.getElementById('recipe-title').textContent = recipe.title;
    document.getElementById('recipe-image').src = recipe.metadata.imageUrl;
    document.getElementById('recipe-image').alt = recipe.title;
    document.getElementById('recipe-yields').textContent = recipe.metadata.yields;
    document.getElementById('recipe-total-time').textContent = recipe.metadata.totalTime;
    document.getElementById('recipe-prep-time').textContent = recipe.metadata.prepTime;
    document.getElementById('recipe-active-time').textContent = recipe.metadata.activeTime;
    document.getElementById('recipe-hands-off-time').textContent = recipe.metadata.handsOffTime;
}

// Populate the ingredients list
function populateIngredientsList() {
    const ingredientsList = document.getElementById('ingredients-list');
    ingredientsList.innerHTML = '';
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = `${ingredient.quantity} ${ingredient.name}`;
            ingredientsList.appendChild(li);
        });
    }
}

// Set up all event listeners
function setupEventListeners() {
    // We already have elements initialized, no need to call getElements() again
    
    // Safety check - if essential elements aren't available, log error and exit
    if (!elements.startRecipeBtn || !elements.recipeIntro || !elements.recipeSteps) {
        console.error("Critical UI elements not found. Check HTML structure.");
        return;
    }
    
    // Start recipe button
    elements.startRecipeBtn.addEventListener('click', startRecipe);
    
    // Navigation buttons
    if (elements.prevStepBtn) {
        elements.prevStepBtn.addEventListener('click', goToPrevStep);
    }
    
    if (elements.nextStepBtn) {
        elements.nextStepBtn.addEventListener('click', goToNextStep);
    }
    
    if (elements.finishRecipeBtn) {
        elements.finishRecipeBtn.addEventListener('click', finishRecipe);
    }
    
    // Read step button
    if (elements.readStepBtn) {
        elements.readStepBtn.addEventListener('click', toggleReadCurrentStep);
    }
    
    // Voice command button
    if (elements.voiceCommandBtn) {
        elements.voiceCommandBtn.addEventListener('click', toggleVoiceCommands);
    }
    
    // Timer buttons
    if (elements.startTimerBtn) {
        elements.startTimerBtn.addEventListener('click', startTimer);
    }
    
    if (elements.pauseTimerBtn) {
        elements.pauseTimerBtn.addEventListener('click', pauseTimer);
    }
    
    if (elements.resetTimerBtn) {
        elements.resetTimerBtn.addEventListener('click', resetTimer);
    }
    
    // Shopping list modal
    if (elements.shoppingListBtn) {
        elements.shoppingListBtn.addEventListener('click', openShoppingListModal);
    }
    
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', closeShoppingListModal);
    }
    
    if (elements.printListBtn) {
        elements.printListBtn.addEventListener('click', printShoppingList);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === elements.shoppingListModal) {
            closeShoppingListModal();
        }
    });
    
    // Update read step button text based on speech state
    updateReadButtonState();
    
    // Expose functions globally for other scripts
    window.goToNextStep = goToNextStep;
    window.goToPrevStep = goToPrevStep;
    window.finishRecipe = finishRecipe;
    window.toggleVoiceCommands = toggleVoiceCommands;
    window.startRecipe = startRecipe;
    window.toggleReadCurrentStep = toggleReadCurrentStep;
    window.readCurrentStep = readCurrentStep;
    window.pauseSpeech = pauseSpeech;
    window.resumeSpeech = resumeSpeech;
    window.stopSpeaking = stopSpeaking;
}

// Start recipe function
function startRecipe() {
    // We already have elements initialized, no need to call getElements() again
    
    // Hide the ingredients section explicitly
    const ingredientsSection = document.querySelector('.ingredients-section');
    if (ingredientsSection) {
        ingredientsSection.style.display = 'none';
    }
    
    elements.recipeIntro.style.display = 'none';
    elements.recipeSteps.style.display = 'block';
    updateStepDisplay();
}

// Update the current step display
function updateStepDisplay() {
    // We already have elements initialized, no need to call getElements() again
    const currentStep = currentSteps[currentStepIndex];
    
    // Update step number and title
    elements.stepNumberEl.textContent = currentStep.title;
    
    // Update main step instruction
    elements.mainStepEl.textContent = currentStep.mainStep;
    
    // Update bullet points
    elements.bulletListEl.innerHTML = '';
    if (currentStep.bullets && currentStep.bullets.length > 0) {
        currentStep.bullets.forEach(bullet => {
            const li = document.createElement('li');
            li.textContent = bullet;
            elements.bulletListEl.appendChild(li);
        });
        elements.bulletListEl.style.display = 'block';
    } else {
        elements.bulletListEl.style.display = 'none';
    }
    
    // Add this code to update currentStepId
    // Update global currentStepId for timer indicators
    if (currentStep && currentStep.id) {
        window.currentStepId = currentStep.id;
    }

    // Use multi-timer system instead of single timer
    if (typeof window.createTimersFromCurrentStep === 'function') {
        // Create timers from the current step (without clearing existing ones)
        console.log("Creating timers from current step (keeping existing timers)");
        window.createTimersFromCurrentStep(false);
        
        // Always hide the single timer
        elements.timerContainer.style.display = 'none';
        stopTimer();
    } else {
        // Fallback to original behavior if multi-timer isn't available
        const timerRegex = /\((\d+)[-\s]?(\d+)?\s*minutes?\)/i;
        const combinedText = currentStep.mainStep + ' ' + (currentStep.bullets || []).join(' ');
        const timerMatch = combinedText.match(timerRegex);

        if (timerMatch) {
            let minutes = parseInt(timerMatch[1]);
            if (timerMatch[2]) {
                // If there's a range (e.g. "2-4 minutes"), use the average
                minutes = (parseInt(timerMatch[1]) + parseInt(timerMatch[2])) / 2;
            }
            
            timerSeconds = Math.round(minutes * 60);
            updateTimerDisplay();
            elements.timerContainer.style.display = 'flex';
        } else {
            elements.timerContainer.style.display = 'none';
            stopTimer();
        }
    }
    
    // Update progress bar
    let stepsCompleted = 0;
    if (currentPhase === 'prep') {
        stepsCompleted = currentStepIndex;
    } else {
        stepsCompleted = recipe.preparationSteps.length + currentStepIndex;
    }
    
    const progress = (stepsCompleted / totalSteps) * 100;
    elements.stepProgress.style.width = `${progress}%`;
    
    // Update navigation buttons
    const isFirstPrepStep = currentPhase === 'prep' && currentStepIndex === 0;
    const isLastCookingStep = currentPhase === 'cooking' && currentStepIndex === recipe.cookingSteps.length - 1;
    
    elements.prevStepBtn.disabled = isFirstPrepStep;
    
    if (isLastCookingStep) {
        elements.nextStepBtn.style.display = 'none';
        elements.finishRecipeBtn.style.display = 'inline-block';
    } else {
        elements.nextStepBtn.style.display = 'inline-block';
        elements.finishRecipeBtn.style.display = 'none';
    }
    
    // Update read button state
    updateReadButtonState();
}

// Navigation functions
function goToNextStep() {
    if (currentPhase === 'prep' && currentStepIndex === recipe.preparationSteps.length - 1) {
        // Switch from prep to cooking phase
        currentPhase = 'cooking';
        currentStepIndex = 0;
        currentSteps = recipe.cookingSteps;
        
        // Update phase indicators
        elements.prepPhase.classList.remove('active');
        elements.cookingPhase.classList.add('active');
    } else if (currentStepIndex < currentSteps.length - 1) {
        // Go to next step in current phase
        currentStepIndex++;
    }
    
    // Stop any ongoing speech when changing steps
    stopSpeaking();
    
    updateStepDisplay();

    // Add this line to update timer indicators
    if (typeof window.updateAllTimerStepIndicators === 'function') {
        window.updateAllTimerStepIndicators();
    }
}

function goToPrevStep() {
    if (currentPhase === 'cooking' && currentStepIndex === 0) {
        // Switch from cooking to prep phase
        currentPhase = 'prep';
        currentStepIndex = recipe.preparationSteps.length - 1;
        currentSteps = recipe.preparationSteps;
        
        // Update phase indicators
        elements.cookingPhase.classList.remove('active');
        elements.prepPhase.classList.add('active');
    } else if (currentStepIndex > 0) {
        // Go to previous step in current phase
        currentStepIndex--;
    }
    
    // Stop any ongoing speech when changing steps
    stopSpeaking();
    
    updateStepDisplay();

    // Add this line to update timer indicators
    if (typeof window.updateAllTimerStepIndicators === 'function') {
        window.updateAllTimerStepIndicators();
    }
}

function finishRecipe() {
    elements.recipeSteps.style.display = 'none';
    elements.recipeIntro.style.display = 'block';
    
    // Reset to beginning
    currentPhase = 'prep';
    currentStepIndex = 0;
    currentSteps = recipe.preparationSteps;
    
    // Reset phase indicators
    elements.cookingPhase.classList.remove('active');
    elements.prepPhase.classList.add('active');
    
    stopTimer();
    stopSpeaking();
    
    // Stop voice recognition if active
    if (isVoiceActive) {
        speechRecognition.stop();
        elements.voiceCommandBtn.textContent = "Enable Voice Commands";
        elements.voiceStatus.textContent = "Voice commands are disabled";
        isVoiceActive = false;
    }
    
    // Show a completion message
    alert('Congratulations! You\'ve completed the recipe. Enjoy your meal!');
}

// Timer functions
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!timerRunning) {
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                stopTimer();
                // Play a sound or show an alert when timer is done
                alert('Timer complete!');
            }
        }, 1000);
        
        timerRunning = true;
        elements.startTimerBtn.style.display = 'none';
        elements.pauseTimerBtn.style.display = 'inline-block';
        elements.resetTimerBtn.style.display = 'inline-block';
    }
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    elements.startTimerBtn.style.display = 'inline-block';
    elements.pauseTimerBtn.style.display = 'none';
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    elements.startTimerBtn.style.display = 'inline-block';
    elements.pauseTimerBtn.style.display = 'none';
    elements.resetTimerBtn.style.display = 'none';
}

function resetTimer() {
    stopTimer();
    
    // Extract timer value from current step again
    const timerRegex = /\((\d+)[-\s]?(\d+)?\s*minutes?\)/i;
    const combinedText = currentSteps[currentStepIndex].mainStep + ' ' + (currentSteps[currentStepIndex].bullets || []).join(' ');
    const timerMatch = combinedText.match(timerRegex);
    
    if (timerMatch) {
        let minutes = parseInt(timerMatch[1]);
        if (timerMatch[2]) {
            minutes = (parseInt(timerMatch[1]) + parseInt(timerMatch[2])) / 2;
        }
        
        timerSeconds = Math.round(minutes * 60);
    } else {
        timerSeconds = 0;
    }
    
    updateTimerDisplay();
}

// Update the Read button text based on speech state
function updateReadButtonState() {
    if (!elements.readStepBtn) return;
    
    if (!isSpeaking) {
        elements.readStepBtn.textContent = "Read Aloud";
    } else if (isPaused) {
        elements.readStepBtn.textContent = "Resume Reading";
    } else {
        elements.readStepBtn.textContent = "Pause Reading";
    }
}

// Toggle reading state
function toggleReadCurrentStep() {
    if (!isSpeaking) {
        // Start reading if not speaking
        readCurrentStep();
    } else if (isPaused) {
        // Resume if paused
        resumeSpeech();
    } else {
        // Pause if speaking
        pauseSpeech();
    }
    
    updateReadButtonState();
}

// Function to stop all speech
function stopSpeaking() {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        isPaused = false;
        pendingUtterance = null;
        updateReadButtonState();
    }
}

// Function to pause speech
function pauseSpeech() {
    if (isSpeaking && !isPaused) {
        // Check browser compatibility
        if ('pause' in window.speechSynthesis) {
            try {
                window.speechSynthesis.pause();
                isPaused = true;
                console.log('Speech paused using native API');
            } catch (e) {
                // If pause fails, use our custom pause implementation
                fallbackPauseSpeech();
            }
        } else {
            // Browser doesn't support pause, use our custom implementation
            fallbackPauseSpeech();
        }
        
        updateReadButtonState();
    }
}

// Custom pause implementation for browsers that don't support native pause
function fallbackPauseSpeech() {
    window.speechSynthesis.cancel();
    isPaused = true;
    console.log('Speech paused using fallback method');
}

// Function to resume speech
function resumeSpeech() {
    if (isSpeaking && isPaused) {
        // First attempt to use native resume if available
        if ('resume' in window.speechSynthesis) {
            try {
                window.speechSynthesis.resume();
                isPaused = false;
                console.log('Speech resumed using native API');
            } catch (e) {
                // If resume fails, use our custom resume implementation
                fallbackResumeSpeech();
            }
        } else {
            // Browser doesn't support resume, use our custom implementation
            fallbackResumeSpeech();
        }
        
        updateReadButtonState();
    }
}

// Custom resume implementation for browsers that don't support native resume
function fallbackResumeSpeech() {
    // Continue from where we left off
    isPaused = false;
    speakCurrentQueue();
    console.log('Speech resumed using fallback method');
}

// Speech functions with enhanced pause/resume support
function readCurrentStep() {
    // Check if the browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        alert('Sorry, your browser does not support text-to-speech!');
        return;
    }
    
    try {
        // Cancel any ongoing speech and reset state
        stopSpeaking();
        
        // Set flag that we're speaking
        isSpeaking = true;
        isPaused = false;
        
        const currentStep = currentSteps[currentStepIndex];
        
        // Create an array to hold all speech parts with pauses
        speechQueue = [];
        
        // Add main step first
        speechQueue.push({
            text: currentStep.mainStep,
            pause: 1000 // 1 second pause after main step
        });
        
        // Add each bullet with pause
        if (currentStep.bullets && currentStep.bullets.length > 0) {
            currentStep.bullets.forEach(bullet => {
                speechQueue.push({
                    text: bullet,
                    pause: 700 // 0.7 second pause after each bullet
                });
            });
        }
        
        // Initialize preferred voice if not already set
        if (!preferredVoice) {
            const voices = window.speechSynthesis.getVoices();
            // Look for Google US English voice
            preferredVoice = voices.find(voice => voice.name === 'Google US English');
            
            // If not found, try to find any US English voice
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => voice.lang === 'en-US');
            }
            
            // If still not found, use the default voice
            if (!preferredVoice && voices.length > 0) {
                preferredVoice = voices[0];
            }
        }
        
        // Start speaking
        currentSpeechIndex = 0;
        speakCurrentQueue();
        
    } catch (error) {
        console.error('Speech synthesis error:', error);
        alert('There was an error with the text-to-speech feature. Please try again.');
        isSpeaking = false;
        isPaused = false;
        updateReadButtonState();
    }
}

// Speak the current queue starting from currentSpeechIndex
function speakCurrentQueue() {
    if (currentSpeechIndex < speechQueue.length && isSpeaking && !isPaused) {
        const item = speechQueue[currentSpeechIndex];
        const utterance = new SpeechSynthesisUtterance(item.text);
        
        // Store pending utterance for pause/resume
        pendingUtterance = utterance;
        
        // Set properties for better clarity
        utterance.rate = 0.9;  // Slightly slower
        utterance.pitch = 1;   // Normal pitch
        utterance.volume = 1;  // Full volume
        
        // Set the preferred voice if available
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // When this item finishes speaking
        utterance.onend = function() {
            // Only continue if we haven't been stopped or paused
            if (isSpeaking && !isPaused) {
                // Prepare for next item
                currentSpeechIndex++;
                
                // Pause for the specified time, then speak the next item
                setTimeout(function() {
                    if (isSpeaking && !isPaused) {
                        speakCurrentQueue();
                    }
                }, item.pause);
            }
        };
        
        // Handle errors
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
            if (isSpeaking) {
                // Move to next item on error
                currentSpeechIndex++;
                speakCurrentQueue();
            }
        };
        
        // Speak this item
        window.speechSynthesis.speak(utterance);
    } else if (currentSpeechIndex >= speechQueue.length) {
        // We've finished the queue
        isSpeaking = false;
        isPaused = false;
        pendingUtterance = null;
        updateReadButtonState();
    }
}

// Modify the voice recognition section in the existing setupVoiceRecognition function
function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        elements.voiceStatus.textContent = "Voice recognition not supported in this browser";
        elements.voiceCommandBtn.disabled = true;
        return false;
    }
    
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    
    speechRecognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        elements.voiceStatus.textContent = `Voice command recognized: "${transcript}"`;
        console.log("Voice command recognized:", transcript);
        
        // Check if it's a timer command first (highest priority)
        if (typeof window.processTimerVoiceCommand === 'function') {
            const isTimerCommand = window.processTimerVoiceCommand(transcript);
            if (isTimerCommand) {
                console.log("Processed as timer command");
                return; // Stop processing if it was handled as a timer command
            }
        }
        
        // Process standard navigation commands
        if (transcript.includes("next") || transcript.includes("forward")) {
            goToNextStep();
        } else if (transcript.includes("previous") || transcript.includes("back")) {
            goToPrevStep();
        } else if (transcript.includes("finish") || transcript.includes("done")) {
            finishRecipe();
        } 
        // Enhanced reading commands with multiple variations
        else if (
            transcript.includes("read") || 
            transcript.includes("read step") || 
            transcript.includes("read out") || 
            transcript.includes("read aloud")
        ) {
            handleReadCommand();
        }
        else if ((transcript.includes("pause reading") || 
                 transcript.includes("stop reading") || 
                 transcript === "pause reading" ||
                 transcript === "stop reading" ||
                 transcript.includes("be quiet")) && 
                !transcript.includes("timer")) {
            if (isSpeaking && !isPaused) {
                pauseSpeech();
            }
        }
        else if (transcript.includes("resume reading") || 
                 transcript.includes("continue reading") || 
                 transcript === "resume reading" ||
                 transcript === "continue reading" ||
                 transcript.includes("keep reading")) {
            if (isSpeaking && isPaused) {
                resumeSpeech();
            }
        }
        else if ((transcript.includes("stop reading") || 
                 transcript === "stop reading") && 
                !transcript.includes("timer")) {
            stopSpeaking();
        }
        else {
            // If no commands matched, update status to show we didn't understand
            elements.voiceStatus.textContent = `Command not recognized: "${transcript}"`;
        }
    };
    
    speechRecognition.onerror = (event) => {
        elements.voiceStatus.textContent = `Error occurred in recognition: ${event.error}`;
    };
    
    return true;
}

// Toggle Voice Recognition
function toggleVoiceCommands() {
    if (!speechRecognition && !setupVoiceRecognition()) {
        return; // Setup failed
    }
    
    if (isVoiceActive) {
        // Deactivate voice commands
        speechRecognition.stop();
        elements.voiceCommandBtn.textContent = "Enable Voice Commands";
        elements.voiceStatus.textContent = "Voice commands stopped";
        isVoiceActive = false;
    } else {
        // Activate voice commands
        speechRecognition.start();
        elements.voiceCommandBtn.textContent = "Disable Voice Commands";
        elements.voiceStatus.textContent = "Listening for commands...";
        isVoiceActive = true;
    }
}

// Shopping list modal functions
function openShoppingListModal() {
    if (recipe && recipe.groceryList) {
        // Populate the shopping list
        const groceryListContainer = document.getElementById('grocery-list-container');
        groceryListContainer.innerHTML = '';
        
        // Loop through categories
        for (const category in recipe.groceryList) {
            // Create category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            groceryListContainer.appendChild(categoryHeader);
            
            // Create list for this category
            const list = document.createElement('ul');
            
            // Add each item in the category
            recipe.groceryList[category].forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                list.appendChild(listItem);
            });
            
            groceryListContainer.appendChild(list);
        }
        
        // Show the modal
        elements.shoppingListModal.style.display = 'block';
    } else {
        alert('No shopping list available for this recipe.');
    }
}

function closeShoppingListModal() {
    elements.shoppingListModal.style.display = 'none';
}

function printShoppingList() {
    const printWindow = window.open('', '_blank');
    
    // Create print content
    let printContent = `
        <html>
        <head>
            <title>Shopping List for ${recipe.title}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                h1 { color: #9d4700; text-align: center; margin-bottom: 20px; }
                h2 { color: #9d4700; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                ul { list-style-type: none; padding-left: 10px; }
                li { margin-bottom: 8px; }
                .print-date { color: #666; font-size: 0.8rem; text-align: center; margin-top: 30px; }
            </style>
        </head>
        <body>
            <h1>Shopping List for ${recipe.title}</h1>
    `;
    
    // Add each category and its items
    for (const category in recipe.groceryList) {
        printContent += `<h2>${category}</h2><ul>`;
        
        recipe.groceryList[category].forEach(item => {
            printContent += `<li>☐ ${item}</li>`;
        });
        
        printContent += `</ul>`;
    }
    
    // Add print date
    const now = new Date();
    printContent += `<div class="print-date">Generated on ${now.toLocaleDateString()}</div>`;
    
    // Close the HTML
    printContent += `</body></html>`;
    
    // Write to the new window and print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// setupVoiceCommandUI has been moved to voice-commands.js for better integration

// Helper function to handle read commands via voice
function handleReadCommand() {
    console.log("Handling read command");
    const readButton = document.getElementById('read-step');
    if (readButton) {
        readButton.click();
        return true;
    }
    return false;
}

// Make it globally available
window.handleReadCommand = handleReadCommand;