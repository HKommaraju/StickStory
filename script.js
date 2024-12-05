let animationsData = {}; 
let collectedRequirementsCounter = 0;
let collectedRequirements = [];
let requirements;
let inPlay = true; 
let game; 


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
        this.sounds = {}; 
    }

    preload() {
        this.load.spritesheet('milo_idle', 'assets/images/idle.png', { 
            frameWidth: 137,
            frameHeight: 350
        });

        const accessoryMappings = animationsData.mappings;
        requirements = animationsData.requirements;

        
        for (const key in accessoryMappings) {
            const data = accessoryMappings[key];
            this.load.spritesheet(data.spritesheet_name, data.spritesheet_source, {
                frameWidth: data.framewidth,
                frameHeight: data.frameheight,
            });
        }

        
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

        
        const soundMappings = animationsData.sounds;
        for (const key in soundMappings) {
            const soundData = soundMappings[key];
            this.sounds[soundData.soundname] = this.sound.add(soundData.soundname);
        }

        
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key.toUpperCase();
            if (inPlay) {
                if (animationsData.mappings[key]) {
                    this.playAccessoryAnimation(key);
                } else if (animationsData.sounds[key]) {
                    this.playSound(key);  
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
        

        if (requirements.includes(accessoryData.animation_name)) {
            collectedRequirementsCounter++;
            collectedRequirements.push(accessoryData.animation_name);
        }

        
        const accessory = this.add.sprite(window.innerWidth / 2, 300, accessoryData.spritesheet_name).setDepth(accessoryData.depth || 0).setVisible(false);

        
        if (!this.anims.exists(accessoryData.animation_name)) {
            this.anims.create({
                key: accessoryData.animation_name,
                frames: this.anims.generateFrameNumbers(accessoryData.spritesheet_name, { 
                    start: 0, 
                    end: accessoryData.frames
                }),
                frameRate: accessoryData.framerate,
                repeat: -1,  
            });
        }

        
        accessory.setVisible(true);
        accessory.play(accessoryData.animation_name);

        this.activeAnimations.push(accessory);

        
        if (inPlay) {
            this.time.delayedCall(accessoryData.duration, () => {
                if (inPlay) {  
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
            
            document.querySelector('.won').style.display = 'block';
            document.querySelector('.tryagain').style.display = 'none';
            inPlay = false; 
            this.keepRequiredAnimationsPlaying(); 
        } else {
            
            document.querySelector('.won').style.display = 'none';
            document.querySelector('.tryagain').style.display = 'block';
        }
    }

    keepRequiredAnimationsPlaying() {
        
        requirements.forEach((requirement) => {
            const animationName = animationsData.mappings[requirement]?.animation_name;
            if (animationName) {
                const activeSprite = this.activeAnimations.find(
                    (sprite) => sprite.anims.currentAnim.key === animationName
                );
                if (activeSprite) {
                    activeSprite.stop(); 
                    activeSprite.play(animationName); 
                }
            }
        });
    }

    onResize() {
        
        if (this.milo) {
            this.milo.setPosition(window.innerWidth / 2, 300);
        }

        
        this.activeAnimations.forEach((sprite) => {
            sprite.setPosition(window.innerWidth / 2, 300);
        });

        
        this.scale.resize(window.innerWidth, 600);
    }

    update() {
        
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

    game = new Phaser.Game(config);  
});


document.addEventListener("DOMContentLoaded", () => {
    const hintIcon = document.getElementById("hint-icon"); //The actual hints button
    const hintMessage = document.getElementById("hints");
    const restartButton = document.getElementById("restart");

    hintIcon.addEventListener("click", () => {
        if (hintMessage.style.display === "none" || hintMessage.style.display === "") {
            hintMessage.style.display = "block"; 
        } else {
            hintMessage.style.display = "none"; 
        }
    });

    restartButton.addEventListener('click', () => {

        console.log("start");
        inPlay = true; 
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
