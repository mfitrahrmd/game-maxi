import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

export default new Phaser.Game({
  mode: "debug",
  type: Phaser.AUTO,
  parent: "app",
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
      gravity: {
        y: 800,
      },
    },
  },
  width: 1280,
  height: 720,
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
