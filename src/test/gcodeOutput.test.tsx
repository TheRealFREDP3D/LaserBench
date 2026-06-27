import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GCodeOutput from '../components/GCodeOutput';
import { MaterialProfile } from '../types';

const mockMaterial: MaterialProfile = {
  id: 'mat1',
  name: 'Material',
  category: 'Wood',
  thickness: 3,
  laser: '5W',
  engrave: { power: 100, speed: 1000 },
  cut: { power: 255, speed: 100 },
  history: [],
};

const SAMPLE_GCODE = 'G0 X10 Y10\nM3 S100\nG1 X20 Y20\nM5';

describe('GCodeOutput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders gcode lines', () => {
    render(
      <GCodeOutput gcode="G0 X10 Y10\nM3 S100" patternType="matrix" material={mockMaterial} />
    );
    expect(screen.getByText(/G0 X10 Y10/)).toBeInTheDocument();
  });

  it('displays line count', () => {
    render(<GCodeOutput gcode={SAMPLE_GCODE} patternType="matrix" material={mockMaterial} />);
    expect(screen.getByText(/Lines: 4/)).toBeInTheDocument();
  });

  it('copies gcode to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<GCodeOutput gcode={SAMPLE_GCODE} patternType="matrix" material={mockMaterial} />);
    fireEvent.click(screen.getByTitle('Copy to Clipboard'));
    expect(writeText).toHaveBeenCalledWith(SAMPLE_GCODE);
  });

  it('shows edit button when onEdit is provided', () => {
    render(
      <GCodeOutput
        gcode={SAMPLE_GCODE}
        patternType="matrix"
        material={mockMaterial}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTitle('Edit G-Code')).toBeInTheDocument();
  });

  it('hides edit button when onEdit is not provided', () => {
    render(<GCodeOutput gcode={SAMPLE_GCODE} patternType="matrix" material={mockMaterial} />);
    expect(screen.queryByTitle('Edit G-Code')).not.toBeInTheDocument();
  });

  it('enters edit mode and shows textarea', () => {
    const onEdit = vi.fn();
    render(
      <GCodeOutput
        gcode={SAMPLE_GCODE}
        patternType="matrix"
        material={mockMaterial}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTitle('Edit G-Code'));
    expect(screen.getByText('Editing')).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('confirms edit and calls onEdit with draft', () => {
    const onEdit = vi.fn();
    render(
      <GCodeOutput
        gcode={SAMPLE_GCODE}
        patternType="matrix"
        material={mockMaterial}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTitle('Edit G-Code'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'G0 X0 Y0' } });
    fireEvent.click(screen.getByTitle('Apply edits'));
    expect(onEdit).toHaveBeenCalledWith('G0 X0 Y0');
  });

  it('cancels edit and restores original', () => {
    const onEdit = vi.fn();
    render(
      <GCodeOutput
        gcode={SAMPLE_GCODE}
        patternType="matrix"
        material={mockMaterial}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTitle('Edit G-Code'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'CHANGED' } });
    fireEvent.click(screen.getByTitle('Cancel edit'));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reset restores original draft', () => {
    render(
      <GCodeOutput
        gcode={SAMPLE_GCODE}
        patternType="matrix"
        material={mockMaterial}
        onEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Edit G-Code'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'CHANGED' } });
    fireEvent.click(screen.getByTitle('Reset to original'));
    expect(textarea).toHaveValue(SAMPLE_GCODE);
  });

  it('download creates a link and triggers download', async () => {
    const clickSpy = vi.fn();
    let createdUrl = '';
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      createdUrl = `blob:${blob}`;
      return createdUrl;
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(function (
      this: typeof document.body,
      node: Node
    ) {
      if ((node as HTMLElement).tagName === 'A') {
        (node as HTMLAnchorElement).click = clickSpy;
      }
      return Node.prototype.appendChild.call(this, node);
    });
    render(<GCodeOutput gcode={SAMPLE_GCODE} patternType="matrix" material={mockMaterial} />);
    fireEvent.click(screen.getByTitle('Download File'));
    expect(clickSpy).toHaveBeenCalled();
    createObjectURLSpy.mockRestore();
    appendChildSpy.mockRestore();
  });
});
