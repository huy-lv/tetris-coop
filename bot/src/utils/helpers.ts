export class Logger {
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  info(message: string, ...args: any[]) {
    console.log("ℹ", message, ...args);
  }

  success(message: string, ...args: any[]) {
    console.log("✓", message, ...args);
  }

  error(message: string, ...args: any[]) {
    console.log("✗", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.log("⚠", message, ...args);
  }

  debug_(message: string, ...args: any[]) {
    if (this.debug) {
      console.log("🐛", message, ...args);
    }
  }

  bot(message: string, ...args: any[]) {
    console.log("🤖", message, ...args);
  }

  game(message: string, ...args: any[]) {
    console.log("🎮", message, ...args);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTime(): string {
  return new Date().toLocaleTimeString();
}
