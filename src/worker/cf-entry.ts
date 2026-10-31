import { Files } from '@cloudflare/sandbox';
import { DurableObject } from 'cloudflare:workers';
import { app, type WorkerBindings } from './index';

/**
 * Isolated per-session MicroVM Sandbox backed by Cloudflare Containers + @cloudflare/sandbox 1.0
 * Direct outbound Internet is disabled by default; all Meta & fal.ai calls go through the Worker.
 */
export class MuseSandbox extends DurableObject<WorkerBindings> {
  private readonly container: any;
  private readonly files: Files;

  constructor(ctx: any, env: WorkerBindings) {
    super(ctx, env);
    if (!ctx.container) {
      throw new Error('No container is configured for MuseSandbox Durable Object');
    }
    this.container = ctx.container;
    this.files = new Files(this.container);
  }

  private ensureStarted() {
    if (!this.container.running) {
      this.container.start({
        enableInternet: false,
      });
    }
  }

  async writeFile(filePath: string, content: string | ArrayBuffer): Promise<void> {
    this.ensureStarted();
    await this.files.mkdir('/workspace', { recursive: true });
    await this.files.writeFile(filePath, content, { cwd: '/workspace' });
  }

  async readFileText(filePath: string): Promise<string> {
    this.ensureStarted();
    const res = await this.files.readFile(filePath, { cwd: '/workspace' });
    return await res.text();
  }

  async listWorkspaceFiles(): Promise<Array<{ name: string; type: string }>> {
    this.ensureStarted();
    await this.files.mkdir('/workspace', { recursive: true });
    const entries = await this.files.readDirectory('/workspace');
    return entries.map((e) => ({ name: e.name, type: e.type }));
  }

  async execCommand(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    this.ensureStarted();
    const proc = await this.container.exec(args, { cwd: '/workspace' });
    const output = await proc.output();
    return {
      exitCode: typeof output.exitCode === 'number' ? output.exitCode : 0,
      stdout: output.stdout ? new TextDecoder().decode(output.stdout) : '',
      stderr: output.stderr ? new TextDecoder().decode(output.stderr) : '',
    };
  }
}

export default app;
