import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadGCode, makeGCodeFilename } from '../lib/downloadGCode';

describe('downloadGCode', () => {
  describe('makeGCodeFilename', () => {
    it('formats filename with pattern and material', () => {
      const name = makeGCodeFilename('matrix', 'Birch Plywood');
      expect(name).toBe('laserbench_matrix_birch_plywood.gcode');
    });

    it('sanitizes special characters in material name', () => {
      const name = makeGCodeFilename('power_ramp', 'MDF 3mm (Large)');
      expect(name).toBe('laserbench_power_ramp_mdf_3mm__large_.gcode');
    });

    it('lowercases the material name', () => {
      const name = makeGCodeFilename('speed_ramp', 'ACRYLIC');
      expect(name).toBe('laserbench_speed_ramp_acrylic.gcode');
    });
  });

  describe('downloadGCode', () => {
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      clickSpy = vi.fn();
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        (node as HTMLAnchorElement).click = clickSpy as unknown as () => void;
        return node;
      });
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {
        return {} as ChildNode;
      });
    });

    afterEach(() => {
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('creates a blob URL and triggers download', () => {
      downloadGCode('G0 X0 Y0', 'test.gcode');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('appends link with correct download attribute', () => {
      downloadGCode('G0 X0 Y0', 'myfile.gcode');
      const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(link.download).toBe('myfile.gcode');
      expect(link.href).toMatch(/^blob:/);
    });
  });
});
