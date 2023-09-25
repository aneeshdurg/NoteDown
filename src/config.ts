class Config {
  enableDarkMode() {
    this.currentModeIsLight = false;
    this.strokeColor = "white";
    for (let cb of this.onDarkModeCBs) {
      cb();
    }
  }

  enableLightMode() {
    this.currentModeIsLight = true;
    this.strokeColor = "black";
    for (let cb of this.onLightModeCBs) {
      cb();
    }
  }

  registerModeSwitchCB(onDarkModeCB: () => void, onLightModeCB: () => void) {
    this.onDarkModeCBs.push(onDarkModeCB);
    this.onLightModeCBs.push(onLightModeCB);
  }

  strokeColor: "black" | "white" = "black";
  currentModeIsLight: boolean = true;
  onDarkModeCBs: (() => void)[] = [];
  onLightModeCBs: (() => void)[] = [];
};

const _global_config = new Config();

export function GetConfig(): Config {
  return _global_config;
}
