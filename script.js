const boxes = document.querySelectorAll('.gift-box');
const giftContainer = document.getElementById('gift-container'); 
const confettiCanvas = document.getElementById('confetti');
const ctx = confettiCanvas.getContext('2d');

// --- MODAL ELEMENTS (Updated for new two-stage flow) ---
const secondaryModalOverlay = document.getElementById('secondary-modal-overlay');
const secondaryGiftBox = document.getElementById('secondary-gift-box');

// ⭐️ NEW: Get reveal overlay
const revealOverlay = document.getElementById('reveal-overlay');

// Stage 1 Elements (Open More / Goodbye)
const promptStage = document.getElementById('prompt-stage');
const promptMessage = document.getElementById('prompt-message');
const openMoreBtn = document.getElementById('open-more-btn');
const goodbyeBtn = document.getElementById('goodbye-btn');

// Stage 2 Elements (Goodbye/Camera Sequence)
const cameraStage = document.getElementById('camera-stage');
const finalCameraPrompt = document.getElementById('final-camera-prompt');
const waitPrompt = document.getElementById('wait-prompt');
const cameraFrameContainer = document.getElementById('camera-frame-container');
const finalSnoopyImg = document.getElementById('final-snoopy-img');
const finalGoodbye = document.getElementById('final-goodbye');
const finalThankYouScreen = document.getElementById('final-thankyou-screen');
// --------------------------

// --- SOUND SYNTHESIZERS ---
// Define general-use and specialized synths for the custom effects
const sounds = {
    // 1. Synth for simple tones and glides (Box 6, general use)
    synth: new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 }
    }).toDestination(),
    
    // 2. PolySynth for chords (Box 2, general modal prompt)
    polySynth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.5, sustain: 0.1, release: 0.5 }
    }).toDestination(),

    // 3. NoiseSynth for camera flash
    noiseSynth: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.1 }
    }).toDestination(),

    // 4. PluckSynth for sharp/percussive sounds (Box 5)
    pluckSynth: new Tone.PluckSynth().toDestination(),

    // 5. MembraneSynth for percussive/low sounds (Box 4)
    membraneSynth: new Tone.MembraneSynth({
        envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.1 }
    }).toDestination(),
    
    // 6. AMSynth for brassy/horn sounds (Box 3) and complex tones (Box 1)
    amSynth: new Tone.AMSynth({
        harmonicity: 3,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).toDestination()
};

// Set volumes globally
sounds.synth.volume.value = -10;
sounds.polySynth.volume.value = -15;
sounds.noiseSynth.volume.value = -10;
sounds.pluckSynth.volume.value = -8;
sounds.membraneSynth.volume.value = -5;
sounds.amSynth.volume.value = -5;
// -----------------------------

// --- UNIQUE SOUND CONFIGURATIONS PER BOX ID ---
const GiftSounds = {
    // Box 1 (Professor Snoop): Lecturer thinking/humming (Low, sustained complex tone)
    box1: () => {
        sounds.amSynth.triggerAttackRelease("A2", "1.5", Tone.now(), 0.7);
    },
    // Box 2 (Snoopy With Lillies): Romantic sound (Gentle, sustained major 7th chord)
    box2: () => {
        sounds.polySynth.triggerAttackRelease(["C5", "E5", "G5", "B5"], "2n");
    },
    // Box 3 (King Snoopy The Third): King's horn fanfare (Brassy ascending notes)
    box3: () => {
        sounds.amSynth.triggerAttackRelease("C4", "8n", Tone.now());
        sounds.amSynth.triggerAttackRelease("G4", "8n", Tone.now() + 0.15);
        sounds.amSynth.triggerAttackRelease("C5", "4n", Tone.now() + 0.3);
    },
    // Box 4 (Mr Fresh - Cat): Suspicious sound ("hmmmmm") (Low, percussive thud)
    box4: () => {
        sounds.membraneSynth.triggerAttackRelease("C2", "8n", Tone.now());
    },
    // Box 5 (Agent Snoopy): Private detective/agent sound (Quick, high, two-note spy motif)
    box5: () => {
        sounds.pluckSynth.triggerAttackRelease("F#5", "16n");
        sounds.pluckSynth.triggerAttackRelease("G5", "16n", Tone.now() + 0.1);
    },
    // Box 6 (You!): Happy "yeaaaa" sound (Quick upward pitch glide/glissando)
    box6: () => {
        sounds.synth.triggerAttack("C5");
        sounds.synth.frequency.rampTo("C6", 0.3); // Glide from C5 to C6
        sounds.synth.triggerRelease(Tone.now() + 0.3);
    },
    
    // Generic confetti sound (for fallback or general use)
    confetti: () => {
        sounds.polySynth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", Tone.now());
    }
};
// ----------------------------------------------------


confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

let confetti = [];
let animationRunning = false;
let isAnimating = false; // Global flag to prevent concurrent clicks/animation overlap
let chosenBox = null; // Stores the currently chosen box

function createConfetti() {
    // Retro Palette: Pink, Blue, Yellow, White
    const retroPalette = ['#ff69b4', '#a3d9ff', '#ffeb3b', '#ffffff'];
    confetti = [];
    for (let i = 0; i < 150; i++) {
        const randomColor = retroPalette[Math.floor(Math.random() * retroPalette.length)];
        confetti.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight - window.innerHeight,
            r: Math.random() * 6 + 4,
            d: Math.random() * 30,
            color: randomColor,
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltAngleIncrement: Math.random() * 0.07 + 0.05
        });
    }
}

function drawConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confetti.forEach((c, i) => {
        ctx.beginPath();
        ctx.lineWidth = c.r / 2;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r / 4, c.y);
        ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r / 4);
        ctx.stroke();

        c.tiltAngle += c.tiltAngleIncrement;
        c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
        c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;

        if (c.y > window.innerHeight) {
            c.y = -10;
            c.x = Math.random() * window.innerWidth;
        }
    });
    if (animationRunning) {
        requestAnimationFrame(drawConfetti);
    }
}

// Handle primary box click
boxes.forEach(box => {
    box.addEventListener('click', () => {
        // Prevent double-click or clicking already flipped boxes
        if (isAnimating || box.classList.contains('flipped')) return;
        isAnimating = true;

        // --- Start Audio Context and play box opening sound ---
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        // Play the "slide up" sound
        sounds.synth.triggerAttackRelease("C4", "16n", Tone.now());
        sounds.synth.triggerAttackRelease("G4", "16n", Tone.now() + 0.05);
        // ---------------------------------------------

        chosenBox = box; // Store the chosen box

        // 1. Keep all boxes visible, just set pointer events to none
        boxes.forEach(b => {
            b.style.pointerEvents = 'none';
        });

        // ⭐️ ACTIVATE OVERLAY
        revealOverlay.classList.add('active');
        
        // 2. Flip the chosen box (starts the enlarge via CSS and slides the front face up)
        box.classList.add('flipped');

        // 3. Start Confetti and attach click listener
        setTimeout(() => {
            // GIF RELOAD (Ensures GIF restarts)
            const snoopyImg = box.querySelector('.surprise-img');
            if (snoopyImg) {
                const originalSrc = snoopyImg.src;
                snoopyImg.src = ''; 
                snoopyImg.src = originalSrc;
            }

            animationRunning = true;
            createConfetti();
            drawConfetti();

            // --- NEW: Play the UNIQUE GIFT SOUND ---
            const giftSound = GiftSounds[box.id];
            if (giftSound) {
                giftSound(); // Play the unique sound for this box
            } else {
                GiftSounds.confetti(); // Fallback generic confetti sound
            }
            // ------------------------------------------

            // ⭐️ FIX: Attach listener to the document to catch a click anywhere on the screen
            document.addEventListener('click', endReveal, { once: true });
            
        }, 50); 
    });
});


// --- SHRINK FUNCTION ---

// --- SHRINK FUNCTION ---
function shrinkContent() {
    if (!chosenBox) return;

    // Play a falling pitch for the shrink effect
    sounds.synth.triggerAttackRelease("G4", "16n", Tone.now());
    sounds.synth.triggerAttackRelease("C4", "16n", Tone.now() + 0.05);

    // 1. Get the enlarged content element
    const surpriseContent = chosenBox.querySelector('.surprise-content');
    
    // 2. Remove the scale/translate classes to trigger the CSS transition back to original size
    surpriseContent.classList.remove('translate-down', 'translate-up');
    
    // 3. Wait for the shrink transition (1000ms is defined in CSS)
    setTimeout(() => {
        // 4. Unflip the box (This also slides the front face back down)
        chosenBox.classList.remove('flipped');
        
        // 5. Re-enable pointer events for all boxes (the game is ready for the next click)
        boxes.forEach(b => {
            b.style.pointerEvents = 'auto';
        });

        revealOverlay.classList.remove('active');
        // ⭐️ NEW: Remove the fading-out class to reset for next use
        confettiCanvas.classList.remove('fading-out'); 
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); // Clear for the *next* reveal
        // ------------------------------------------

        // 6. Show the post-reveal prompt
        showPostRevealPrompt();
        isAnimating = false; // Reset animating flag
        
    }, 500); // Wait for the transition duration in style.css
}

// --- NEW: Function to stop confetti and start shrink on user click ---
function endReveal(event) {
    // Prevents closing if the click originated from one of the main gift boxes
    // (This is a safety check, though pointer-events: none should handle it)
    if (event.target.closest('.gift-box')) return;
    
    // If you add buttons/links inside the surprise content later, uncomment this line:
    // if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') return;

    // 1. Stop Confetti Animation
    animationRunning = false;
    confettiCanvas.classList.add('fading-out');
    
    // 2. Shrink content back down
    shrinkContent();
}


// --- GAME FLOW FUNCTIONS ---

function showPostRevealPrompt() {
    // Reset modal size for the prompt
    secondaryGiftBox.style.height = '200px'; 
    secondaryGiftBox.style.width = '350px'; 

    // Show Stage 1: Prompt
    promptStage.style.display = 'flex';
    cameraStage.style.display = 'none';

    // Play Prompt Sound
    sounds.polySynth.triggerAttackRelease(["E5", "G5"], "16n", Tone.now());

    // Activate the modal overlay
    secondaryModalOverlay.style.display = 'flex'; 
    requestAnimationFrame(() => {
        secondaryModalOverlay.classList.add('active');
    });
}

function resetGame() {
    // Play Reset Sound
    sounds.synth.triggerAttackRelease("C4", "16n", Tone.now());

    // Hide modal and perform cleanup
    secondaryModalOverlay.classList.remove('active');
    setTimeout(() => {
        secondaryModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto'; 
        chosenBox = null;
    }, 300); 
}

function showGoodbye() {
    // Hide the prompt stage and start the camera sequence
    promptStage.style.display = 'none';
    showCameraPrompt();
}

async function showCameraPrompt() {
    // Resize modal for the camera stage
    secondaryGiftBox.style.height = '300px'; 
    secondaryGiftBox.style.width = '350px'; 
    
    // Show Stage 2: Camera
    cameraStage.style.display = 'flex';
    
    // ⭐️ START: Show Wait Prompt, Hide Say "cheese!"
    waitPrompt.style.display = 'block'; 
    finalCameraPrompt.style.display = 'none';

    finalGoodbye.style.display = 'none';
    cameraFrameContainer.style.backgroundColor = '#000';
    finalSnoopyImg.src = 'assets/lens.jpg'; 
    finalSnoopyImg.style.opacity = 1;

    // Await function for timeouts
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ⭐️ 1. WAIT (e.g., 2 seconds)
    await delay(2000); 

    // ⭐️ 2. HIDE WAIT, SHOW SAY CHEESE
    waitPrompt.style.display = 'none';
    finalCameraPrompt.style.display = 'block';
    
    // 3. SAY CHEESE! (Wait for the original 3.5 seconds)
    await delay(3500);

    // 4. FLASH! (Change background color to white to simulate flash)
    cameraFrameContainer.style.backgroundColor = '#FFF'; 
    finalSnoopyImg.style.opacity = 0; // Hide 'LENS' text during flash
    
    // Play Camera Flash Sound
    sounds.noiseSynth.triggerAttackRelease("32n", Tone.now());

    await delay(500);

    // 5. Flash ends, show the result
    cameraFrameContainer.style.backgroundColor = '#000';
    finalSnoopyImg.src = 'assets/snop.jpg'; 
    finalSnoopyImg.style.opacity = 1;
    finalCameraPrompt.style.display = 'none'; // Ensure Say Cheese is hidden
    finalGoodbye.style.display = 'block';

    // First, play a subtle sound to indicate the image is ready for interaction
    sounds.synth.triggerAttackRelease("A4", "16n", Tone.now());

    // Attach click listener to the camera container to move to the final screen
    // { once: true } ensures the listener is removed after the first click.
    cameraFrameContainer.addEventListener('click', showFinalThankYouScreen, { once: true });
}

// ⭐️ NEW FUNCTION TO HIDE THE SCREEN ⭐️
function hideFinalThankYouScreen() {
    // Start fade out transition (CSS removes opacity)
    finalThankYouScreen.classList.remove('active'); 

    // Wait for the fade out (0.5 seconds is safe)
    setTimeout(() => {
        // Now that opacity is 0, completely hide the element
        finalThankYouScreen.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable main body scrolling
    }, 500); 
}

// ⭐️ NEW FINAL FUNCTION
function showFinalThankYouScreen() {
    // 1. Remove the listener just in case it wasn't removed automatically by { once: true }
    // or if the function is called via click. (Safety measure)
    cameraFrameContainer.removeEventListener('click', showFinalThankYouScreen);
    
    // 2. Hide the secondary modal (the camera box)
    secondaryModalOverlay.classList.remove('active');
    
    // 3. Display the full-screen thank you message
    finalThankYouScreen.style.display = 'flex';
    requestAnimationFrame(() => {
        finalThankYouScreen.classList.add('active');
    });

    // 4. ADD CLICK LISTENER to hide the final screen (This is for exiting the final screen)
    finalThankYouScreen.addEventListener('click', hideFinalThankYouScreen, { once: true });
}

// --- ATTACH EVENT LISTENERS ---
window.onload = () => {
    // Ensure button listeners are attached after the page loads
    openMoreBtn.addEventListener('click', resetGame);
    goodbyeBtn.addEventListener('click', showGoodbye);
};