// Global variables
let ingredients = [];
let recipeMetadata = {
    yields: '',
    totalTime: '',
    prepTime: '',
    activeTime: '',
    handsOffTime: ''
};

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Auto-generate ID from title
    document.getElementById('recipe-title').addEventListener('input', function() {
        const title = this.value;
        document.getElementById('recipe-id').value = generateId(title);
    });
    
    // Parse metadata button
    document.getElementById('parse-metadata').addEventListener('click', parseMetadata);
    
    // Parse ingredients button
    document.getElementById('parse-ingredients').addEventListener('click', parseIngredients);
    
    // Clear all ingredients button
    document.getElementById('clear-ingredients').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all ingredients?')) {
            ingredients = [];
            updateIngredientsTable();
        }
    });
    
    // Convert to JSON button
    document.getElementById('convert').addEventListener('click', convertToJSON);
    
    // Copy recipe JSON button
    document.getElementById('copy-recipe').addEventListener('click', function() {
        copyToClipboard(document.getElementById('output-recipe').textContent);
    });
    
    // Copy index JSON button
    document.getElementById('copy-index').addEventListener('click', function() {
        copyToClipboard(document.getElementById('output-index').textContent);
    });
}

// Parse metadata from the single textarea
function parseMetadata() {
    const metadataText = document.getElementById('recipe-metadata').value.trim();
    if (!metadataText) {
        alert('Please enter recipe metadata');
        return;
    }
    
    // Reset metadata object
    recipeMetadata = {
        yields: '',
        totalTime: '',
        prepTime: '',
        activeTime: '',
        handsOffTime: ''
    };
    
    // Split by delimiter '//' and trim each part
    const parts = metadataText.split('//').map(part => part.trim());
    
    // Process each part
    parts.forEach(part => {
        // Check for different metadata types
        if (part.toLowerCase().startsWith('yields:')) {
            recipeMetadata.yields = part.substring(7).trim();
        } 
        else if (part.toLowerCase().startsWith('total time:')) {
            recipeMetadata.totalTime = part.substring(11).trim();
        }
        else if (part.toLowerCase().startsWith('prep time:')) {
            recipeMetadata.prepTime = part.substring(10).trim();
        }
        else if (part.toLowerCase().startsWith('active cooking time:') || 
                 part.toLowerCase().startsWith('active time:')) {
            const startIndex = part.toLowerCase().indexOf(':') + 1;
            recipeMetadata.activeTime = part.substring(startIndex).trim();
        }
        else if (part.toLowerCase().startsWith('hands-off cooking time:') || 
                 part.toLowerCase().startsWith('hands-off time:')) {
            const startIndex = part.toLowerCase().indexOf(':') + 1;
            recipeMetadata.handsOffTime = part.substring(startIndex).trim();
        }
    });
    
    // Display preview of parsed metadata
    const previewBox = document.getElementById('metadata-preview');
    previewBox.innerHTML = `
        <h4>Parsed Metadata</h4>
        <p><strong>Yields:</strong> ${recipeMetadata.yields || 'Not specified'}</p>
        <p><strong>Total Time:</strong> ${recipeMetadata.totalTime || 'Not specified'}</p>
        <p><strong>Prep Time:</strong> ${recipeMetadata.prepTime || 'Not specified'}</p>
        <p><strong>Active Time:</strong> ${recipeMetadata.activeTime || 'Not specified'}</p>
        <p><strong>Hands-off Time:</strong> ${recipeMetadata.handsOffTime || 'Not specified'}</p>
    `;
    previewBox.classList.add('active');
}

// Parse ingredients from textarea
function parseIngredients() {
    const ingredientsList = document.getElementById('ingredients-list').value;
    const defaultCategory = document.getElementById('default-category').value.trim() || 'Pantry';
    
    if (!ingredientsList.trim()) {
        alert('Please enter some ingredients');
        return;
    }
    
    // Split by lines and process each line
    const lines = ingredientsList.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        // Remove bullet points if present
        let cleanLine = line.trim();
        if (cleanLine.startsWith('*') || cleanLine.startsWith('-') || cleanLine.startsWith('•')) {
            cleanLine = cleanLine.substring(1).trim();
        }
        
        // Special handling for "Salt and pepper" or similar
        if (/^salt(\s+and\s+pepper)?$/i.test(cleanLine) || 
            /^pepper(\s+and\s+salt)?$/i.test(cleanLine)) {
            
            addIngredient('Salt', 'to taste', 'Spices & Herbs');
            
            // If it contains "and pepper", add pepper as separate ingredient
            if (/and\s+pepper/i.test(cleanLine)) {
                addIngredient('Pepper', 'to taste', 'Spices & Herbs');
            }
            return;
        }
        
        // Try to parse the ingredient
        parseIngredientLine(cleanLine, defaultCategory);
    });
    
    // Clear the textarea after parsing
    document.getElementById('ingredients-list').value = '';
}

// Parse a single ingredient line
function parseIngredientLine(line, defaultCategory) {
    // Variables to store extracted information
    let quantity = '';
    let name = line;
    
    // 1. Handle parenthetical quantities like "1 (15-ounce) can black beans"
    const canMatch = line.match(/(\d+)\s*\(([^)]+)\)\s*(.+)/);
    if (canMatch) {
        quantity = `${canMatch[1]} ${canMatch[2]}`;
        name = canMatch[3].trim();
    } 
    // 2. Handle "bunch of" phrases
    else if (line.match(/(\d+)\s+(bunch|bunches|handful|cup|cups|tablespoons|teaspoons)\s+of\s+(.+)/i)) {
        const match = line.match(/(\d+)\s+(bunch|bunches|handful|cup|cups|tablespoons|teaspoons)\s+of\s+(.+)/i);
        quantity = `${match[1]} ${match[2]}`;
        name = match[3].trim();
    }
    // 3. Look for quantity in parentheses
    else if (line.match(/\((.*?)\)/)) {
        const parenthesesMatch = line.match(/\((.*?)\)/);
        const parts = line.split('(');
        name = parts[0].trim();
        quantity = parenthesesMatch[1].trim();
    }
    // 4. Look for fractions and standard measurements
    else if (line.match(/^([¼½¾⅓⅔⅛⅜⅝⅞\d\s\/]+)\s+(teaspoons?|tablespoons?|cups?|pounds?|ounces?|grams?|kg|tsp\.?|tbsp\.?|oz\.?|g|lb|lbs\.?)(\s+|\s*,\s*)(.+)/i)) {
        const match = line.match(/^([¼½¾⅓⅔⅛⅜⅝⅞\d\s\/]+)\s+(teaspoons?|tablespoons?|cups?|pounds?|ounces?|grams?|kg|tsp\.?|tbsp\.?|oz\.?|g|lb|lbs\.?)(\s+|\s*,\s*)(.+)/i);
        
        quantity = `${match[1].trim()} ${formatUnit(match[2], match[1])}`;
        name = match[4].trim();
    }
    // 5. Simple numeric quantities (e.g., "2 eggs")
    else if (line.match(/^(\d+)\s+(.+)/)) {
        const match = line.match(/^(\d+)\s+(.+)/);
        quantity = match[1];
        name = match[2].trim();
    }
    
    // Special handling for "to taste" items
    if (name.toLowerCase().includes('to taste')) {
        const parts = name.toLowerCase().split('to taste');
        name = parts[0].trim();
        quantity = 'to taste';
    }
    
    // Capitalize the first letter of the ingredient name
    if (name && name.length > 0) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    // Guess the category based on ingredient name
    const category = guessCategory(name, defaultCategory);
    
    // Add the ingredient if we have a valid name
    if (name) {
        addIngredient(name, quantity || 'to taste', category);
    }
}

// Format unit based on quantity (singular vs plural)
function formatUnit(unit, quantity) {
    const lowerUnit = unit.toLowerCase();
    
    // Simple number check (ignores fractions)
    const isPlural = /^[2-9]/.test(quantity.trim());
    
    // Abbreviations don't need changing
    if (['tsp', 'tsp.', 'tbsp', 'tbsp.', 'oz', 'oz.', 'g', 'lb', 'kg'].includes(lowerUnit)) {
        return unit;
    }
    
    // Handle common units
    switch (lowerUnit) {
        case 'teaspoon':
            return isPlural ? 'teaspoons' : 'teaspoon';
        case 'teaspoons':
            return isPlural ? 'teaspoons' : 'teaspoon';
        case 'tablespoon':
            return isPlural ? 'Tablespoons' : 'Tablespoon';
        case 'tablespoons':
            return isPlural ? 'Tablespoons' : 'Tablespoon';
        case 'cup':
            return isPlural ? 'cups' : 'cup';
        case 'cups':
            return isPlural ? 'cups' : 'cup';
        case 'pound':
            return isPlural ? 'pounds' : 'pound';
        case 'pounds':
            return isPlural ? 'pounds' : 'pound';
        case 'ounce':
            return isPlural ? 'ounces' : 'ounce';
        case 'ounces':
            return isPlural ? 'ounces' : 'ounce';
        case 'lbs':
        case 'lbs.':
            return 'lbs';
        default:
            return unit;
    }
}

// Guess ingredient category based on name
function guessCategory(name, defaultCategory) {
    const lowerName = name.toLowerCase();
    
    // Enhanced category detection
    if (/\b(salt|pepper|spice|oregano|basil|thyme|rosemary|cinnamon|clove|cumin|paprika|herb|seasoning)\b/.test(lowerName)) {
        return 'Spices & Herbs';
    } else if (/\b(beef|chicken|pork|steak|lamb|turkey|sirloin|flank|veal|ground|burger|sausage)\b/.test(lowerName)) {
        return 'Meat';
    } else if (/\b(fish|salmon|tuna|shrimp|prawn|lobster|crab|clam|mussel|oyster|scallop)\b/.test(lowerName)) {
        return 'Seafood';
    } else if (/\b(vegetable|fruit|apple|onion|garlic|broccoli|lime|lemon|parsley|cilantro|tomato|potato|carrot|lettuce|spinach|cabbage|pepper)\b/.test(lowerName)) {
        return 'Produce';
    } else if (/\b(milk|cheese|butter|cream|yogurt|sour cream|ice cream|half and half)\b/.test(lowerName)) {
        return 'Dairy';
    } else if (/\b(rice|pasta|bread|noodle|grain|oat|flour|wheat|cereal|barley|couscous|quinoa)\b/.test(lowerName)) {
        return 'Grains';
    } else if (/\b(frozen|ice|peas|berries|pizza|waffle)\b/.test(lowerName)) {
        return 'Frozen Foods';
    } else if (/\b(flour|sugar|baking powder|baking soda|yeast|vanilla|almond extract|chocolate chip|cocoa|corn starch)\b/.test(lowerName)) {
        return 'Baking';
    } else if (/\b(can|canned|tomato paste|tomato sauce|beans|soup|tuna|corn|peas)\b/.test(lowerName)) {
        return 'Canned Goods';
    } else if (/\b(sauce|ketchup|mustard|mayo|mayonnaise|vinegar|oil|dressing|soy sauce|hot sauce|sriracha|marinade)\b/.test(lowerName)) {
        return 'Condiments & Sauces';
    } else if (/\b(water|coffee|tea|juice|soda|wine|beer|alcohol|milk)\b/.test(lowerName)) {
        return 'Beverages';
    }
    
    return defaultCategory;
}

// Add an ingredient to the list
function addIngredient(name, quantity, category) {
    ingredients.push({
        name: name,
        quantity: quantity,
        category: category
    });
    
    // Update the table display
    updateIngredientsTable();
}

// Update the ingredients table
function updateIngredientsTable() {
    const tbody = document.getElementById('ingredients-tbody');
    tbody.innerHTML = '';
    
    ingredients.forEach((ingredient, index) => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = ingredient.name;
        
        const quantityCell = document.createElement('td');
        quantityCell.textContent = ingredient.quantity;
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = ingredient.category;
        
        const actionCell = document.createElement('td');
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'secondary-button';
        editButton.style.marginRight = '5px';
        editButton.style.padding = '5px 10px';
        
        // Attach edit event listener
        editButton.addEventListener('click', () => editIngredient(index));
        
        // Remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'secondary-button';
        removeButton.style.backgroundColor = '#f44336';
        removeButton.style.color = 'white';
        removeButton.style.padding = '5px 10px';
        
        // Attach remove event listener
        removeButton.addEventListener('click', () => {
            ingredients.splice(index, 1);
            updateIngredientsTable();
        });
        
        actionCell.appendChild(editButton);
        actionCell.appendChild(removeButton);
        
        row.appendChild(nameCell);
        row.appendChild(quantityCell);
        row.appendChild(categoryCell);
        row.appendChild(actionCell);
        
        tbody.appendChild(row);
    });
}

// Edit an ingredient
function editIngredient(index) {
    const ingredient = ingredients[index];
    
    const nameInput = prompt('Edit ingredient name:', ingredient.name);
    if (nameInput === null) return; // User cancelled
    
    const quantityInput = prompt('Edit quantity:', ingredient.quantity);
    if (quantityInput === null) return; // User cancelled
    
    // Create a custom dialog for category selection
    const categories = [
        'Pantry', 'Meat', 'Seafood', 'Produce', 'Dairy', 'Grains', 
        'Spices & Herbs', 'Frozen Foods', 'Baking', 'Canned Goods', 
        'Condiments & Sauces', 'Beverages'
    ];
    
    // Create a dialog element
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.zIndex = '1000';
    dialog.style.left = '0';
    dialog.style.top = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.backgroundColor = 'rgba(0,0,0,0.5)';
    dialog.style.display = 'flex';
    dialog.style.justifyContent = 'center';
    dialog.style.alignItems = 'center';
    
    // Create dialog content
    let categoryOptions = '';
    categories.forEach(cat => {
        const selected = cat === ingredient.category ? 'selected' : '';
        categoryOptions += `<option value="${cat}" ${selected}>${cat}</option>`;
    });
    
    dialog.innerHTML = `
        <div style="background-color: white; padding: 20px; border-radius: 5px; width: 300px;">
            <h3>Select Category</h3>
            <select id="category-select" style="width: 100%; padding: 8px; margin: 15px 0;">
                ${categoryOptions}
            </select>
            <div style="display: flex; justify-content: space-between;">
                <button id="cancel-btn" style="padding: 8px 16px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="confirm-btn" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event handlers
    document.getElementById('cancel-btn').addEventListener('click', function() {
        document.body.removeChild(dialog);
    });
    
    document.getElementById('confirm-btn').addEventListener('click', function() {
        const categorySelect = document.getElementById('category-select');
        const categoryInput = categorySelect.value;
        
        // Update the ingredient
        ingredients[index] = {
            name: nameInput.trim() || ingredient.name,
            quantity: quantityInput.trim() || ingredient.quantity,
            category: categoryInput || ingredient.category
        };
        
        // Update the display
        updateIngredientsTable();
        
        // Remove the dialog
        document.body.removeChild(dialog);
    });
}

// Parse steps from text content
function parseSteps(content, stepPrefix) {
    const steps = [];
    
    if (!content.trim()) {
        return steps;
    }
    
    // Split by double newlines to separate major step blocks
    let stepBlocks = content.split(/\n\s*\n/).filter(block => block.trim().length > 0);
    
    // If no blocks, just treat the whole content as one block
    if (stepBlocks.length === 0) {
        stepBlocks = [content];
    }
    
    // Current step being built
    let currentStep = null;
    let stepIndex = 0;
    
    // Process each block
    stepBlocks.forEach(block => {
        // Split the block into lines
        const lines = block.split('\n').filter(line => line.trim().length > 0);
        
        // Process each line
        lines.forEach(line => {
            // Check if this is a new numbered step (e.g., "1) Step" or "1. Step")
            const numberedStepMatch = line.trim().match(/^(\d+)[\.)]\s+(.+)/);
            
            if (numberedStepMatch) {
                // If we were building a previous step, finalize it
                if (currentStep) {
                    steps.push(currentStep);
                }
                
                // Start a new step
                stepIndex++;
                currentStep = {
                    id: `${stepPrefix.toLowerCase().replace(/\s+/g, '-')}-${stepIndex}`,
                    title: `${stepPrefix} ${stepIndex}`,
                    mainStep: numberedStepMatch[2].trim(),
                    bullets: []
                };
            } else if (currentStep) {
                // This is a bullet point for the current step
                currentStep.bullets.push(line.trim());
            } else {
                // If no current step but we have content, create a default step
                stepIndex++;
                currentStep = {
                    id: `${stepPrefix.toLowerCase().replace(/\s+/g, '-')}-${stepIndex}`,
                    title: `${stepPrefix} ${stepIndex}`,
                    mainStep: line.trim(),
                    bullets: []
                };
            }
        });
    });
    
    // Add the last step if there is one
    if (currentStep) {
        steps.push(currentStep);
    }
    
    return steps;
}

// Create grocery list from ingredients
function createGroceryList(ingredients) {
    const groceryList = {};
    
    ingredients.forEach(ingredient => {
        const category = ingredient.category;
        if (!groceryList[category]) {
            groceryList[category] = [];
        }
        
        groceryList[category].push(`${ingredient.quantity} ${ingredient.name}`);
    });
    
    return groceryList;
}

// Convert all data to JSON
function convertToJSON() {
    // Get recipe metadata from form
    const title = document.getElementById('recipe-title').value.trim();
    const id = document.getElementById('recipe-id').value.trim() || generateId(title);
    const difficulty = document.getElementById('recipe-difficulty').value;
    let thumbnail = document.getElementById('recipe-thumbnail').value.trim();
    
    // Validate required fields
    if (!title) {
        alert('Please enter a recipe title');
        return;
    }
    
    // If thumbnail is empty, generate it from the recipe ID
    if (!thumbnail) {
        thumbnail = `images/${id}.jpg`;
    }
    
    // Parse steps
    const prepSteps = parseSteps(document.getElementById('prep-content').value, 'Prep Step');
    const cookingSteps = parseSteps(document.getElementById('cooking-content').value, 'Cooking Step');
    
    // Create grocery list
    const groceryList = createGroceryList(ingredients);
    
    // Create recipe object
    const recipe = {
        id: id,
        title: title,
        metadata: {
            imageUrl: thumbnail,
            yields: recipeMetadata.yields,
            totalTime: recipeMetadata.totalTime,
            prepTime: recipeMetadata.prepTime,
            activeTime: recipeMetadata.activeTime,
            handsOffTime: recipeMetadata.handsOffTime
        },
        preparationSteps: prepSteps,
        cookingSteps: cookingSteps,
        ingredients: ingredients,
        groceryList: groceryList
    };
    
    // Create recipe index entry
    const recipeIndex = {
        id: id,
        title: title,
        thumbnail: thumbnail,
        time: recipeMetadata.totalTime,
        difficulty: difficulty
    };
    
    // Output both JSON formats
    document.getElementById('output-recipe').textContent = JSON.stringify(recipe, null, 2);
    document.getElementById('output-index').textContent = JSON.stringify(recipeIndex, null, 2);
}

// Generate ID from title
function generateId(title) {
    if (!title) return 'recipe-' + Date.now();
    
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.select();
    try {
        const success = document.execCommand('copy');
        if (success) {
            alert('Copied to clipboard!');
        } else {
            alert('Failed to copy. Please select and copy the text manually.');
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Failed to copy. Please select and copy the text manually.');
    }
    
    // Clean up
    document.body.removeChild(textarea);
}