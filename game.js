let game;
let gameOptions = {
    timeLimit: 30,
    gravity: 1,
    crateHeight: 700,
    crateRange: [-250, 250],
    crateSpeed: 1200
}
window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: "thegame",
            width: 640,
            height: 960
        },
        physics: {
            default: "matter",
            matter: {
                gravity: {
                    y: gameOptions.gravity
                }
            }
        },
        scene: playGame
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
}
class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    /* Precarga todo */
    preload(){
        this.load.image("ground", "assets/sprites/ground.png");
        this.load.image("sky", "assets/sprites/simpsky.png");
        this.load.image("crate", "assets/sprites/caja2.png");
        this.load.bitmapFont("font", "assets/fonts/font.png", "assets/fonts/font.fnt");
    }
    /* Crea nuevo ciclo del juego */
    create(){
        this.matter.world.update30Hz();
        this.canDrop = true;
        this.timer = 0;
        this.timerEvent = null;
        this.addSky();
        this.addGround();
        this.addMovingCrate();
        this.timeText = this.add.bitmapText(10, 10, "font", gameOptions.timeLimit.toString(), 72);
        this.crateGroup = this.add.group();
        this.matter.world.on("collisionstart", this.checkCollision, this);
        this.setCameras();
        this.input.on("pointerdown", this.dropCrate, this);
    }
    /* Añade el fondo de juego */
    addSky(){
        this.sky = this.add.sprite(0, 0, "sky");
        this.sky.displayWidth = game.config.width;
        this.sky.setOrigin(0, 0);
    }
    /* Añade el piso del juego */
    addGround(){
        this.ground = this.matter.add.sprite(game.config.width / 2, game.config.height, "ground");
        this.ground.setBody({
            type: "rectangle",
                width: this.ground.displayWidth,
                height: this.ground.displayHeight * 2
        });
        this.ground.setOrigin(0.5, 1);
        this.ground.setStatic(true);
    }
    /* Mueve la caja de lado a lado */
    addMovingCrate(){
        this.movingCrate = this.add.sprite(game.config.width / 2 - gameOptions.crateRange[0], this.ground.getBounds().top - gameOptions.crateHeight, "crate");
        this.tweens.add({
            targets: this.movingCrate,
            x: game.config.width / 2 - gameOptions.crateRange[1],
            duration: gameOptions.crateSpeed,
            yoyo: true,
            repeat: -1
        })
    }
    checkCollision(e, b1, b2){
        if(b1.isCrate && !b1.hit){
            b1.hit = true;
            this.nextCrate();
        }
        if(b2.isCrate && !b2.hit){
            b2.hit = true;
            this.nextCrate();
        }
    }
    setCameras(){
        this.actionCamera = this.cameras.add(0, 0, game.config.width, game.config.height);
        this.actionCamera.ignore([this.sky, this.timeText]);
        this.cameras.main.ignore([this.ground, this.movingCrate]);
    }
    /* Deja caer la caja con el click izquierdo */
    dropCrate(){
        if(this.canDrop && this.timer < gameOptions.timeLimit){
            this.addTimer();
            this.canDrop = false;
            this.movingCrate.visible = false;
            this.addFallingCrate();
        }
    }
    update(){
        this.crateGroup.getChildren().forEach(function(crate){
            if(crate.y > game.config.height + crate.displayHeight){
                if(!crate.body.hit){
                    this.nextCrate();
                }
                crate.destroy();
            }
        }, this);
    }
    /* Añade un cronometro */
    addTimer(){
        if(this.timerEvent == null){
            this.timerEvent = this.time.addEvent({
                delay: 1000,
                callback: this.tick,
                callbackScope: this,
                loop: true
            });
        }
    }
    /* Crea una nueva caja si cae al vacio */
    addFallingCrate(){
        let fallingCrate = this.matter.add.sprite(this.movingCrate.x, this.movingCrate.y, "crate");
        fallingCrate.body.isCrate = true;
        fallingCrate.body.hit = false;
        this.crateGroup.add(fallingCrate);
        this.cameras.main.ignore(fallingCrate);
    }
    /* Crea una caja */
    nextCrate(){
        this.zoomCamera();
        this.canDrop = true;
        this.movingCrate.visible = true;
    }
    /* Al caer una caja la camara retrocede */
    zoomCamera(){
        let maxHeight = 0;
        this.crateGroup.getChildren().forEach(function(crate){
            if(crate.body.hit){
                maxHeight = Math.max(maxHeight, Math.round((this.ground.getBounds().top - crate.getBounds().top) / crate.displayWidth));
            }
        }, this);
        this.movingCrate.y = this.ground.getBounds().top - maxHeight * this.movingCrate.displayWidth - gameOptions.crateHeight;
        let zoomFactor = gameOptions.crateHeight / (this.ground.getBounds().top - this.movingCrate.y);
        this.actionCamera.zoomTo(zoomFactor, 500);
        let newHeight = game.config.height / zoomFactor;
        this.actionCamera.pan(game.config.width / 2, game.config.height / 2 - (newHeight - game.config.height) / 2, 500)
    }
    tick(){
        this.timer++;
        this.timeText.text = (gameOptions.timeLimit - this.timer).toString()
        if(this.timer >= gameOptions.timeLimit){
            this.timerEvent.remove();
            this.movingCrate.destroy();
            this.time.addEvent({
                delay: 2000,
                callback: function(){
                    this.removeEvent = this.time.addEvent({
                        delay: 500,
                        callback: this.removeCrate,
                        callbackScope: this,
                        loop: true
                    })
                },
                callbackScope: this
            });
        }
    }
    /* Remueve todas las cajas al terminar el tiempo */
    removeCrate(){
        if(this.crateGroup.getChildren().length > 0){
            this.crateGroup.getFirstAlive().destroy();
            var texto = "D-oh!!";
            var style = {font:"60px Arial", fill:"#000000", align:"center"};
            this.add.text(0, 0, texto, style);
        }
        else{
            this.removeEvent.remove();
            this.scene.start("PlayGame");
        }
    }
}
