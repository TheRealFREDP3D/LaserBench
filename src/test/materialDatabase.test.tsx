import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MaterialDatabase from '../components/MaterialDatabase';
import { MaterialProfile } from '../types';
import { ThemeProvider } from '../lib/themeContext';

const mockMaterials: MaterialProfile[] = [
  {
    id: 'mat1',
    name: 'Test Plywood',
    category: 'Wood',
    thickness: 3,
    laser: '10W',
    engrave: { power: 100, speed: 1000 },
    cut: { power: 255, speed: 200 },
    history: [],
  },
  {
    id: 'mat2',
    name: 'Acrylic',
    category: 'Plastics',
    thickness: 5,
    laser: '5W',
    engrave: { power: 80, speed: 800 },
    cut: { power: 200, speed: 150 },
    history: [],
  },
];

function renderDB(props: Partial<React.ComponentProps<typeof MaterialDatabase>> = {}) {
  const defaults = {
    materials: mockMaterials,
    selectedId: 'mat1',
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    onCreate: vi.fn(),
    onCreateBatch: vi.fn(),
    onDelete: vi.fn(),
    pwmMax: 1000,
  };
  return {
    ...render(
      <ThemeProvider>
        <MaterialDatabase {...defaults} {...props} />
      </ThemeProvider>
    ),
    ...defaults,
  };
}

describe('MaterialDatabase', () => {
  it('renders material details', () => {
    renderDB();
    expect(screen.getByText('Test Plywood')).toBeInTheDocument();
  });

  it('renders all materials in select', () => {
    renderDB();
    const selects = screen.getAllByRole('combobox');
    const materialSelect = selects[0];
    expect(materialSelect).toBeInTheDocument();
    expect(screen.getByText('Test Plywood')).toBeInTheDocument();
    expect(screen.getByText('Acrylic')).toBeInTheDocument();
  });

  it('calls onSelect when selecting a different material', () => {
    const onSelect = vi.fn();
    renderDB({ onSelect });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'mat2' } });
    expect(onSelect).toHaveBeenCalledWith('mat2');
  });

  it('calls onCreate when clicking add button', () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    renderDB({ onCreate, onSelect });
    fireEvent.click(screen.getByTitle('Add new material'));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalled();
  });

  it('calls onDelete when clicking delete and confirming', async () => {
    const onDelete = vi.fn();
    renderDB({ onDelete });
    fireEvent.click(screen.getByLabelText('Delete material profile'));
    const confirmBtn = await screen.findByText('Confirm');
    await act(async () => {
      fireEvent.click(confirmBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onDelete).toHaveBeenCalledWith('mat1');
  });

  it('calls onUpdate when changing material name', () => {
    const onUpdate = vi.fn();
    renderDB({ onUpdate });
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Birch Ply' } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].name).toBe('Birch Ply');
  });

  it('renders properties section with engrave/cut fields', () => {
    renderDB();
    expect(screen.getByText('Default Engrave')).toBeInTheDocument();
    expect(screen.getByText('Default Cut')).toBeInTheDocument();
    expect(screen.getByText('Thickness')).toBeInTheDocument();
  });

  it('returns null when materials array is empty', () => {
    const { container } = render(
      <ThemeProvider>
        <MaterialDatabase
          materials={[]}
          selectedId=""
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onCreate={vi.fn()}
          onCreateBatch={vi.fn()}
          onDelete={vi.fn()}
          pwmMax={1000}
        />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});
