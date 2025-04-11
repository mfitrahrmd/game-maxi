import Phaser from "phaser";

// Finite State Machine
class StateMachine {
  constructor(initialState, context) {
    this.context = context;
    this.states = new Map();
    this.currentState = null;
  }

  addState(name, state, setAsCurrent = false) {
    this.states.set(name, state);
    if (setAsCurrent) {
      this.changeState(name);
    }

    return this;
  }

  changeState(newState) {
    if (this.currentState) {
      this.currentState.exit(this);
    }
    const state = this.states.get(newState);
    // if (!state) {
    //   this.currentState = new NullState();

    //   return;
    // }
    this.currentState = state;
    this.currentState.enter(this);
  }

  update(input) {
    this.currentState?.update(this, input);
  }
}

class State {
  constructor(stateMachine, name) {
    this.stateMachine = stateMachine;
    this.name = name;
  }

  enter(fsm) {}
  update(fsm, input) {}
  exit(fsm) {}
}

class UnArmedState extends State {
  constructor(stateMachine) {
    super(stateMachine, "unarmed");
  }

  enter(fsm) {
    this.subStateMachine = new StateMachine("idle", this.stateMachine.context);
    this.subStateMachine
      .addState("idle", new UnarmedIdleState(this.subStateMachine), true)
      .addState(
        "run-left",
        new UnarmedRunningState(this.subStateMachine, "left", 100)
      )
      .addState(
        "run-right",
        new UnarmedRunningState(this.subStateMachine, "right", 100)
      )
      .addState("jump", new UnarmedJumpingState(this.subStateMachine, 200))
      .addState("fall", new UnarmedFallingState(this.subStateMachine))
      .addState("drop", new UnarmedDropState(this.subStateMachine));
  }

  update(fsm, input) {
    this.subStateMachine.update(input);
    if (input.t.isDown) {
      this.stateMachine.changeState("armed");
    }
  }

  exit(fsm) {
    this.subStateMachine = null;
  }
}

class UnarmedIdleState extends State {
  constructor(stateMachine) {
    super(stateMachine, "idle");
  }

  enter(fsm) {
    fsm.context.setVelocityX(0);
  }

  update(fsm, input) {
    fsm.context.anims.play("idle", true);

    if (input.left.isDown) this.stateMachine.changeState("run-left");
    else if (input.right.isDown) this.stateMachine.changeState("run-right");
    else if (input.space.isDown) this.stateMachine.changeState("jump");
  }
}

class UnarmedRunningState extends State {
  constructor(stateMachine, direction, speed) {
    super(stateMachine, "run");
    this.direction = direction;
    this.speed = speed;
  }

  enter(fsm) {}

  update(fsm, input) {
    fsm.context.anims.play("run", true);
    switch (this.direction) {
      case "left":
        fsm.context.setFlipX(false);
        fsm.context.setVelocityX(-this.speed);
        break;
      case "right":
        fsm.context.setFlipX(true);
        fsm.context.setVelocityX(this.speed);
        break;
    }
    if (input.left.isDown) this.stateMachine.changeState("run-left");
    else if (input.right.isDown) this.stateMachine.changeState("run-right");
    else this.stateMachine.changeState("idle");

    if (input.space.isDown) this.stateMachine.changeState("jump");
  }
}

class UnarmedJumpingState extends State {
  constructor(stateMachine, height) {
    super(stateMachine, "jump");
    this.height = height;
    this.jumpStartTime = null;
    this.maxHoldTime = 100; // max time to hold jump
    this.extraHeight = 200; // extra height to jump
  }

  enter(fsm) {
    if (fsm.context.body.onFloor()) {
      fsm.context.anims.play("jump", true);
      fsm.context.setVelocityY(-this.height);
      this.jumpStartTime = fsm.context.scene.time.now;
    }
  }

  update(fsm, input) {
    const currentTime = fsm.context.scene.time.now;
    if (
      input.space.isDown &&
      this.jumpStartTime &&
      currentTime - this.jumpStartTime <= this.maxHoldTime
    ) {
      const holdDuration = currentTime - this.jumpStartTime;
      const additionalHeight =
        (holdDuration / this.maxHoldTime) * this.extraHeight;
      fsm.context.setVelocityY(-this.height - additionalHeight);
    }

    if (input.left.isDown) {
      fsm.context.setVelocityX(-100);
    } else if (input.right.isDown) {
      fsm.context.setVelocityX(100);
    }

    if (!fsm.context.anims.isPlaying) this.stateMachine.changeState("fall");
  }
}

class UnarmedFallingState extends State {
  constructor(stateMachine) {
    super(stateMachine, "fall");
  }

  update(fsm, input) {
    fsm.context.anims.play("fall", true);
    if (input.left.isDown) {
      fsm.context.setVelocityX(-100);
    } else if (input.right.isDown) {
      fsm.context.setVelocityX(100);
    }
    if (fsm.context.body.onFloor()) this.stateMachine.changeState("drop");
  }
}

class UnarmedDropState extends State {
  constructor(stateMachine) {
    super(stateMachine, "drop");
  }

  enter(fsm) {
    fsm.context.anims.play("drop", true);
    fsm.context.setVelocityX(0);
    fsm.context.setVelocityY(0);
  }

  update(fsm, input) {
    if (input.space.isDown) {
      this.stateMachine.changeState("jump");
    } else if (input.left.isDown) {
      this.stateMachine.changeState("run-left");
    } else if (input.right.isDown) {
      this.stateMachine.changeState("run-right");
    }
    if (
      !fsm.context.anims.isPlaying &&
      fsm.context.anims.currentAnim.key === "drop"
    ) {
      this.stateMachine.changeState("idle");
    }
  }
}

class ArmedState extends State {
  constructor(stateMachine) {
    super(stateMachine, "armed");
  }

  enter(fsm) {
    this.subStateMachine = new StateMachine("idle", this.stateMachine.context);
    this.subStateMachine.addState(
      "idle",
      new ArmedIdleState(this.subStateMachine),
      true
    );
  }

  update(fsm, input) {
    this.subStateMachine.update(input);
    if (input.t.isDown) {
      this.stateMachine.changeState("unarmed");
    }
  }

  exit(fsm) {
    this.subStateMachine = null;
  }
}

class ArmedIdleState extends State {
  constructor(stateMachine) {
    super(stateMachine, "idle");
  }

  enter(fsm) {
    fsm.context.setVelocityX(0);
  }

  update(fsm, input) {
    fsm.context.anims.play("armed-idle", true);
  }
}

export default class MainScene extends Phaser.Scene {
  init() {
    this.player = undefined;
    this.playerStateMachine = undefined;
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
    this.load.spritesheet(
      "redhood-armed-idle",
      "images/redhood-armed-idle.png",
      {
        frameWidth: 2016 / 18,
        frameHeight: 133,
      }
    );
    this.load.image("vite", "vite.svg");
  }
  create() {
    this.player = this.physics.add
      .sprite(this.gameWidth / 2, this.gameHeight)
      .setBodySize(28, 40)
      .setOffset(42, 60);
    this.createAnimation();
    this.playerStateMachine = new StateMachine("unarmed", this.player);
    this.playerStateMachine.addState(
      "unarmed",
      new UnArmedState(this.playerStateMachine),
      true
    );
    this.playerStateMachine.addState(
      "armed",
      new ArmedState(this.playerStateMachine)
    );
    this.keyboard = this.input.keyboard.addKeys("left,right,up,down,space,t");
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
    this.playerStateMachine.update(this.keyboard);
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
    this.player.anims.create({
      key: "armed-idle",
      frames: this.anims.generateFrameNames("redhood-armed-idle"),
      frameRate: 18,
    });
  }
}
