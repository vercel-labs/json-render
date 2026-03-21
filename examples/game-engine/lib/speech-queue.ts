interface SpeechRequest {
  text: string;
  voiceId: string;
  resolve: (url: string) => void;
  reject: (error: unknown) => void;
}

class SpeechQueue {
  private queue: SpeechRequest[] = [];
  private processing = 0;
  private maxConcurrent = 1;

  constructor() {
    this.processQueue = this.processQueue.bind(this);
  }

  async add(text: string, voiceId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, voiceId, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.processing++;

    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: request.text,
          voiceId: request.voiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      const data = await response.json();
      request.resolve(data.audioUrl);
    } catch (error) {
      request.reject(error);
    } finally {
      this.processing--;
      this.processQueue();
    }
  }
}

const speechQueue = new SpeechQueue();
export default speechQueue;
