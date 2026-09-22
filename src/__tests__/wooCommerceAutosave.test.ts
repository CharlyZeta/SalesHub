import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooCommerceConfig } from '../types';

/**
 * Lógica de controlador de autoguardado con debounce (W3 / FIX-W003).
 * Replica y valida el ciclo de vida de persistencia y publicación desatendida.
 */
export class WooAutosaveController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingConfig: WooCommerceConfig | null = null;
  private state: 'idle' | 'saving' | 'saved' = 'idle';

  constructor(
    private readonly onUpdateConfig: (cfg: WooCommerceConfig) => void,
    private readonly publishToServer: (cfg: WooCommerceConfig) => Promise<boolean>,
    private readonly debounceMs: number = 900
  ) {}

  public notifyChange(newConfig: WooCommerceConfig, isFirstRender = false): void {
    if (isFirstRender) return;
    if (!newConfig.url.trim()) return;

    this.pendingConfig = newConfig;
    this.state = 'saving';

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (this.pendingConfig) {
        const toSave = this.pendingConfig;
        this.pendingConfig = null;
        this.onUpdateConfig(toSave);
        await this.publishToServer(toSave);
        this.state = 'saved';
      }
    }, this.debounceMs);
  }

  public flushOnUnmount(): void {
    if (this.timer && this.pendingConfig && this.pendingConfig.url.trim()) {
      clearTimeout(this.timer);
      this.timer = null;
      const toSave = this.pendingConfig;
      this.pendingConfig = null;
      this.onUpdateConfig(toSave);
      this.state = 'saved';
    }
  }

  public getState(): 'idle' | 'saving' | 'saved' {
    return this.state;
  }

  public hasPending(): boolean {
    return this.pendingConfig !== null;
  }
}

describe('FIX-W003: Autoguardado con Debounce de Ajustes WooCommerce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseConfig: WooCommerceConfig = {
    url: 'https://tienda-ejemplo.com',
    consumerKey: 'ck_test_123',
    consumerSecret: 'cs_test_456',
    autoSync: false,
    syncIntervalHours: 1,
    conectado: true,
  };

  it('BR-001: el primer render no debe disparar eventos de autoguardado', () => {
    const onUpdate = vi.fn();
    const onPublish = vi.fn().mockResolvedValue(true);
    const controller = new WooAutosaveController(onUpdate, onPublish);

    controller.notifyChange(baseConfig, true);
    vi.advanceTimersByTime(2000);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
    expect(controller.getState()).toBe('idle');
  });

  it('AF-01: no debe disparar persistencia si la URL está vacía o contiene solo espacios', () => {
    const onUpdate = vi.fn();
    const onPublish = vi.fn().mockResolvedValue(true);
    const controller = new WooAutosaveController(onUpdate, onPublish);

    controller.notifyChange({ ...baseConfig, url: '   ' }, false);
    vi.advanceTimersByTime(2000);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
    expect(controller.hasPending()).toBe(false);
  });

  it('AC-001: tras 900 ms de inactividad persiste y publica al servidor', async () => {
    const onUpdate = vi.fn();
    const onPublish = vi.fn().mockResolvedValue(true);
    const controller = new WooAutosaveController(onUpdate, onPublish, 900);

    const changedConfig = { ...baseConfig, autoSync: true, syncIntervalHours: 2 };
    controller.notifyChange(changedConfig, false);

    expect(controller.getState()).toBe('saving');
    expect(onUpdate).not.toHaveBeenCalled();

    // Avanzamos 500 ms (todavía dentro del debounce)
    vi.advanceTimersByTime(500);
    expect(onUpdate).not.toHaveBeenCalled();

    // Avanzamos 450 ms más (completa los 900 ms)
    vi.advanceTimersByTime(450);
    await vi.runAllTimersAsync();

    expect(onUpdate).toHaveBeenCalledWith(changedConfig);
    expect(onPublish).toHaveBeenCalledWith(changedConfig);
    expect(controller.getState()).toBe('saved');
  });

  it('AC-002 / AF-02: si el modal se desmonta con guardado pendiente, se persiste inmediatamente', () => {
    const onUpdate = vi.fn();
    const onPublish = vi.fn().mockResolvedValue(true);
    const controller = new WooAutosaveController(onUpdate, onPublish, 900);

    const changedConfig = { ...baseConfig, syncIntervalHours: 4 };
    controller.notifyChange(changedConfig, false);

    // Solo pasaron 200 ms y el usuario cierra el modal
    vi.advanceTimersByTime(200);
    expect(controller.hasPending()).toBe(true);
    expect(onUpdate).not.toHaveBeenCalled();

    controller.flushOnUnmount();

    expect(onUpdate).toHaveBeenCalledWith(changedConfig);
    expect(controller.hasPending()).toBe(false);
  });
});
