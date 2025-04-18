import Phaser from "phaser";

// Finite State Machine
class FSM {
  constructor(unit, initialState) {
    this.unit = unit;
    this.state = initialState;
    this.state.enter(this);
  }

  changeState(newState) {
    this.state.exit(this);
    this.state = newState;
    this.state.enter(this);
  }

  update(input) {
    this.state.update(this, input);
  }
}

class State {
  enter(fsm) {}
  update(fsm, input) {}
  exit(fsm) {}
}

class IdleState extends State {
  enter(fsm) {
    fsm.unit.setVelocityX(0);
  }

  update(fsm, input) {
    fsm.unit.anims.play("idle", true);

    if (input.left.isDown) fsm.changeState(new RunningState("left", 100));
    else if (input.right.isDown)
      fsm.changeState(new RunningState("right", 100));
    else if (input.space.isDown) fsm.changeState(new JumpingState(200));
  }
}

class RunningState extends State {
  constructor(direction, speed) {
    super();
    this.direction = direction;
    this.speed = speed;
  }

  enter(fsm) {}

  update(fsm, input) {
    fsm.unit.anims.play("run", true);
    switch (this.direction) {
      case "left":
        fsm.unit.setFlipX(false);
        fsm.unit.setVelocityX(-this.speed);
        break;
      case "right":
        fsm.unit.setFlipX(true);
        fsm.unit.setVelocityX(this.speed);
        break;
    }
    if (input.left.isDown)
      fsm.changeState(new RunningState("left", this.speed));
    else if (input.right.isDown)
      fsm.changeState(new RunningState("right", this.speed));
    else fsm.changeState(new IdleState());

    if (input.space.isDown) fsm.changeState(new JumpingState(200));
  }
}

class JumpingState extends State {
  constructor(height) {
    super();
    this.height = height;
    this.jumpStartTime = null;
    this.maxHoldTime = 100; // max time to hold jump
    this.extraHeight = 200; // extra height to jump
  }

  enter(fsm) {
    if (fsm.unit.body.onFloor()) {
      fsm.unit.anims.play("jump", true);
      fsm.unit.setVelocityY(-this.height);
      this.jumpStartTime = fsm.unit.scene.time.now;
    }
  }

  update(fsm, input) {
    const currentTime = fsm.unit.scene.time.now;
    if (
      input.space.isDown &&
      this.jumpStartTime &&
      currentTime - this.jumpStartTime <= this.maxHoldTime
    ) {
      const holdDuration = currentTime - this.jumpStartTime;
      const additionalHeight =
        (holdDuration / this.maxHoldTime) * this.extraHeight;
      fsm.unit.setVelocityY(-this.height - additionalHeight);
    }

    if (input.left.isDown) {
      fsm.unit.setVelocityX(-100);
    } else if (input.right.isDown) {
      fsm.unit.setVelocityX(100);
    }

    if (!fsm.unit.anims.isPlaying) {
      fsm.changeState(new FallingState());
    }
  }
}

class FallingState extends State {
  update(fsm, input) {
    fsm.unit.anims.play("fall", true);
    if (input.left.isDown) {
      fsm.unit.setVelocityX(-100);
    } else if (input.right.isDown) {
      fsm.unit.setVelocityX(100);
    }
    if (fsm.unit.body.onFloor()) {
      fsm.changeState(new DropState());
    }
  }
}

class DropState extends State {
  enter(fsm) {
    fsm.unit.anims.play("drop", true);
    fsm.unit.setVelocityX(0);
    fsm.unit.setVelocityY(0);
  }

  update(fsm, input) {
    if (input.space.isDown) {
      fsm.changeState(new JumpingState(200));
    } else if (input.left.isDown) {
      fsm.changeState(new RunningState("left", 100));
    } else if (input.right.isDown) {
      fsm.changeState(new RunningState("right", 100));
    }
    if (
      !fsm.unit.anims.isPlaying &&
      fsm.unit.anims.currentAnim.key === "drop"
    ) {
      fsm.changeState(new IdleState());
    }
  }
}

export default class MainScene extends Phaser.Scene {
  init() {
    this.player = undefined;
    this.playerFSM = undefined;
    this.keyboard = undefined;
    this.platforms = undefined;
    this.lastPlatformX = undefined;
    this.gameWidth = this.game.config.width;
    this.gameHeight = this.game.config.height;
  }
  preload() {
    this.load.spritesheet("redhood", "images/redhood.png", {
      frameWidth: 1344 / 12, // 112
      frameHeight: 1463 / 11, // 133
    });
    this.load.image("vite", "vite.svg");
  }
  create() {
    this.player = this.physics.add
      .sprite(0, this.gameHeight)
      .setBodySize(28, 40)
      .setOffset(42, 60);
    this.createAnimation();
    this.playerFSM = new FSM(this.player, new IdleState());
    this.keyboard = this.input.keyboard.addKeys("left,right,up,down,space");
    this.player.setCollideWorldBounds(true);

    this.platforms = this.physics.add.group({
      key: "vite",
      repeat: 6,
      setXY: {
        x: this.gameWidth / 2, // temporarily put all platforms at the middle of the screen
        y: 720,
        stepY: -120, // the step or space of platforms from each other
      },
      setScale: {
        x: 3,
        y: 0.5,
      },
      immovable: true, // prevent platforms from moving when touch by player
    });
    this.physics.add.collider(this.player, this.platforms);
    this.platforms.children.iterate((child, i) => {
      child.body.checkCollision.down = false; // disable platfrom's collision on bottom part

      if (i === 0) {
        this.lastPlatformX = child.x;

        return;
      }
      if (this.lastPlatformX <= this.gameWidth / 2 + -100 * 6) {
        /*
        if the last platform has been placed on the far left side,
        put current platform to the right
        */
        child.setX(this.lastPlatformX + 100);
      } else if (this.lastPlatformX >= this.gameWidth / 2 + 100 * 6) {
        /*
        if the last platform has been placed on the far right side,
        put current platform to the left
         */
        child.setX(this.lastPlatformX - 100);
      } else {
        /* else put it randomly left or right from the last platform */
        if (Phaser.Math.Between(0, 1)) {
          child.setX(this.lastPlatformX + 100);
        } else {
          child.setX(this.lastPlatformX - 100);
        }
      }

      this.lastPlatformX = child.x;
    });
    this.physics.add.collider(this.player, this.platform);
  }
  update(time, delta) {
    this.playerFSM.update(this.keyboard);
    this.platforms.children.iterate((child, i) => {
      // move each platform to the bottom each frame
      child.setVelocityY(50);
      if (child.y > 720) {
        child.setY(0);
      }
    });
  }

  createAnimation() {
    this.player.anims.create({
      key: "run",
      frames: this.anims.generateFrameNames("redhood", {
        start: 1,
        end: 24,
      }),
      frameRate: 24,
    });
    this.player.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNames("redhood", {
        start: 127,
        end: 144,
      }),
      frameRate: 18,
    });
    this.player.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNames("redhood", {
        start: 34,
        end: 44,
      }),
      frameRate: 20,
    });
    this.player.anims.create({
      key: "fall",
      frames: this.anims.generateFrameNames("redhood", {
        start: 45,
        end: 47,
      }),
      frameRate: 9,
    });
    this.player.anims.create({
      key: "drop",
      frames: this.anims.generateFrameNames("redhood", {
        start: 48,
        end: 51,
      }),
      frameRate: 12,
    });
  }
}
