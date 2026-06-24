import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MaterialDatabase from '../components/MaterialDatabase';
import { MaterialProfile } from '../types';

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
];

describe('MaterialDatabase', () => {
  it('renders material details', () => {
    render(
      <MaterialDatabase
        materials={mockMaterials}
        selectedId="mat1"
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Test Plywood')).toBeInTheDocument();
  });
});
