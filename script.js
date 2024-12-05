let animationsData = {}; // Global variable to store JSON data
let collectedRequirementsCounter = 0;
let collectedRequirements = [];
let requirements;
let inPlay = true; // Variable to control the game state
let game; // Declare game globally

// Preload JSON before starting the game
async function fetchAnimationsData() {
    try {
        const response = await fetch('animations.json');
        animationsData = await response.json();
    } catch (error) {
        console.error('Error loading animations.json:', error);
    }
}

class MyGame extends Phaser.Scene {
    constructor() {
        super({ key: 'MyGame' });
        this.activeAnimations = [];
        this.sounds = {}; // Store sound objects
    }

    preload() {
        this.load.spritesheet('milo_idle', 'assets/images/idle.png', { 
            frameWidth: 137,
            frameHeight: 350
        });

        const accessoryMappings = animationsData.mappings;
        requirements = animationsData.requirements;

        // Load sprite sheets
        for (const key in accessoryMappings) {
            const data = accessoryMappings[key];
            this.load.spritesheet(data.spritesheet_name, data.spritesheet_source, {
                frameWidth: data.framewidth,
                frameHeight: data.frameheight,
            });
        }

        // Load sounds
        const soundMappings = animationsData.sounds;
        for (const key in soundMappings) {
            const soundData = soundMappings[key];
            this.load.audio(soundData.soundname, soundData.soundsource);
        }
    }

    create() {
        const milo = this.add.sprite(window.innerWidth / 2, 300, 'milo_idle');
        this.milo = milo;
        
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('milo_idle', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1,
        });

        milo.play('idle');

        // Store sound objects in the sounds dictionary
        const soundMappings = animationsData.sounds;
        for (const key in soundMappings) {
            const soundData = soundMappings[key];
            this.sounds[soundData.soundname] = this.sound.add(soundData.soundname);
        }

        // Listen for key press events
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key.toUpperCase();
            if (inPlay) {
                if (animationsData.mappings[key]) {
                    this.playAccessoryAnimation(key);
                } else if (animationsData.sounds[key]) {
                    this.playSound(key);  // Play sound if it's defined in the JSON
                } else if (key === 'ENTER') {
                    this.checkGameStatus();
                }
            }
        });

        window.addEventListener('resize', this.onResize.bind(this));
    }

    playAccessoryAnimation(key) {
        const accessoryData = animationsData.mappings[key];

        if (!accessoryData || collectedRequirements.includes(accessoryData.animation_name)) return;
        collectedRequirements.push(accessoryData.animation_name);

        if (requirements.includes(accessoryData.animation_name)) {
            collectedRequirementsCounter++;
        }

        // Add the accessory sprite
        const accessory = this.add.sprite(window.innerWidth / 2, 300, accessoryData.spritesheet_name).setDepth(accessoryData.depth || 0).setVisible(false);

        // Create the animation dynamically
        if (!this.anims.exists(accessoryData.animation_name)) {
            this.anims.create({
                key: accessoryData.animation_name,
                frames: this.anims.generateFrameNumbers(accessoryData.spritesheet_name, { 
                    start: 0, 
                    end: accessoryData.frames
                }),
                frameRate: accessoryData.framerate,
                repeat: -1,  // Animation should repeat indefinitely
            });
        }

        // Show and play the animation
        accessory.setVisible(true);
        accessory.play(accessoryData.animation_name);

        this.activeAnimations.push(accessory);

        // Use a conditional delayed call based on 'inPlay'
        if (inPlay) {
            this.time.delayedCall(accessoryData.duration, () => {
                if (inPlay) {  // Only stop the animation if the game is still in play
                    accessory.setVisible(false);
                    accessory.stop();
                }
                this.activeAnimations = this.activeAnimations.filter(anim => anim !== accessory);
                collectedRequirements = collectedRequirements.filter((item) => item !== accessoryData.animation_name);
                collectedRequirementsCounter--;
            });
        }
    }

    playSound(key) {
        const soundData = animationsData.sounds[key];
        if (soundData) {
            this.sounds[soundData.soundname].play();
        }
    }

    stopAllAnimations() {
        this.activeAnimations.forEach(sprite => {
            sprite.stop();
            sprite.setVisible(false);
        });
        this.activeAnimations = []; 
    }

    checkGameStatus() {
        
        if (collectedRequirementsCounter === requirements.length) {
            console.log("Milo is ready for school! You win!");
            document.querySelector('.won').style.display = 'block';
            document.querySelector('.tryagain').style.display = 'none';
            inPlay = false; // Set inPlay to false when the game ends
            this.keepRequiredAnimationsPlaying(); // Ensure required animations continue
        } else {
            console.log("Milo is not ready yet. Keep trying!");
            console.log(`Currently active items: ${collectedRequirements.join(", ")}`);
            document.querySelector('.won').style.display = 'none';
            document.querySelector('.tryagain').style.display = 'block';
        }
    }

    keepRequiredAnimationsPlaying() {
        // Iterate over required items and ensure their animations keep playing
        requirements.forEach((requirement) => {
            const animationName = animationsData.mappings[requirement]?.animation_name;
            if (animationName) {
                const activeSprite = this.activeAnimations.find(
                    (sprite) => sprite.anims.currentAnim.key === animationName
                );
                if (activeSprite) {
                    activeSprite.stop(); // Ensure we restart the animation
                    activeSprite.play(animationName); // Play animation indefinitely
                }
            }
        });
    }

    onResize() {
        // Update positions of all sprites when the window is resized
        if (this.milo) {
            this.milo.setPosition(window.innerWidth / 2, 300);
        }

        // Reposition any active accessory sprites
        this.activeAnimations.forEach((sprite) => {
            sprite.setPosition(window.innerWidth / 2, 300);
        });

        // Adjust game dimensions if necessary
        this.scale.resize(window.innerWidth, 600);
    }

    update() {
        // You can implement any updates here if needed
    }
}

fetchAnimationsData().then(() => {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: 600,
        parent: 'game-container',
        backgroundColor: "#ffe4c4",
        scene: MyGame,
    };

    game = new Phaser.Game(config);  // Assigning the game object globally
});

// Restart button logic
document.addEventListener("DOMContentLoaded", () => {
    const hintIcon = document.getElementById("hint-icon");
    const hintMessage = document.getElementById("hints");
    const restartButton = document.getElementById("restart");

    hintIcon.addEventListener("click", () => {
        if (hintMessage.style.display === "none" || hintMessage.style.display === "") {
            hintMessage.style.display = "block"; // Show the hint
        } else {
            hintMessage.style.display = "none"; // Hide the hint
        }
    });

    restartButton.addEventListener('click', () => {

        console.log("start");
        inPlay = true; // Set inPlay back to true to restart the game
        collectedRequirements = []; 
        collectedRequirementsCounter = 0;
        document.querySelector('.won').style.display = 'none';
        document.querySelector('.tryagain').style.display = 'none';
        document.getElementById("hints").style.display = 'none';

        const activeScene = game.scene.getScene('MyGame');
        if (activeScene) activeScene.stopAllAnimations();

        game.scene.start('MyGame');

    });
});
