import { fireEvent, render, screen, within } from '@testing-library/react';
import { SEED_MONSTER_CATALOG } from '@/modules/game-rules';
import {
  emptyUploaderViewModel,
  extraMonsterEntry,
  readyUploaderViewModel,
  sampleCatalog,
} from './MonsterSpriteUploader.fixtures';
import { getLevelOptions, toCatalogRowViewModels } from './MonsterSpriteUploader.map';
import { MonsterSpriteUploaderView } from './MonsterSpriteUploader';
import type { MonsterSpriteUploaderViewModel } from './MonsterSpriteUploader.types';

jest.mock('./MonsterSpriteUploader.hook', () => ({ useMonsterSpriteUploader: jest.fn() }));

// Radix Switch/Select measure with ResizeObserver, which jsdom lacks.
beforeAll(() => {
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

const SOFT_WARNING_TEXT = 'Boss monsters at level 1-2 can make the center tile easier than usual — this is allowed.';
const GENERIC_ERROR_TEXT = 'Could not add — see console.';

function renderView(overrides: Partial<MonsterSpriteUploaderViewModel> = {}) {
  const viewModel = { ...emptyUploaderViewModel, ...overrides };
  const utils = render(<MonsterSpriteUploaderView {...viewModel} />);
  return {
    ...utils,
    rerenderView: (next: Partial<MonsterSpriteUploaderViewModel>) =>
      utils.rerender(<MonsterSpriteUploaderView {...viewModel} {...next} />),
  };
}

function submitButton() {
  return screen.getByRole('button', { name: 'Add monster' });
}

describe('MonsterSpriteUploaderView submit button', () => {
  it('is disabled with no fields filled', () => {
    renderView();
    expect(submitButton()).toBeDisabled();
  });

  it('is disabled when canSubmit is false even with every field filled', () => {
    renderView({ ...readyUploaderViewModel, canSubmit: false });
    expect(submitButton()).toBeDisabled();
  });

  it('is enabled when canSubmit is true', () => {
    renderView({ ...readyUploaderViewModel, canSubmit: true });
    expect(submitButton()).toBeEnabled();
  });

  it('calls onSubmit when enabled and the form is submitted', () => {
    const onSubmit = jest.fn();
    renderView({ ...readyUploaderViewModel, canSubmit: true, onSubmit });
    fireEvent.click(submitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not call onSubmit when canSubmit is false', () => {
    const onSubmit = jest.fn();
    renderView({ canSubmit: false, onSubmit });
    fireEvent.submit(submitButton().closest('form') as HTMLFormElement);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows "Adding…" and stays disabled while submitting', () => {
    renderView({ ...readyUploaderViewModel, status: 'submitting', canSubmit: false });
    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  });
});

describe('MonsterSpriteUploaderView boss soft warning', () => {
  it('renders the warning text when showsBossSoftWarning is true', () => {
    renderView({ isBoss: true, level: 1, showsBossSoftWarning: true });
    expect(screen.getByText(SOFT_WARNING_TEXT)).toBeInTheDocument();
  });

  it('does not render the warning text when showsBossSoftWarning is false', () => {
    renderView({ isBoss: true, level: 1, showsBossSoftWarning: false });
    expect(screen.queryByText(SOFT_WARNING_TEXT)).not.toBeInTheDocument();
  });
});

describe('MonsterSpriteUploaderView field errors', () => {
  it('links the name error to the Name input via aria-describedby', () => {
    renderView({ fieldErrors: { name: 'Name needs at least one letter or digit.' }, status: 'error' });
    const input = screen.getByLabelText('Name');
    const error = screen.getByText('Name needs at least one letter or digit.');
    expect(input).toHaveAttribute('aria-describedby', error.id);
    expect(error.id).not.toBe('');
  });

  it('links the idle error to the Idle sprite input', () => {
    renderView({ fieldErrors: { idle: 'Idle sprite is required.' }, status: 'error' });
    const input = screen.getByLabelText('Idle sprite');
    const error = screen.getByText('Idle sprite is required.');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('links the attack error to the Attack sprite input', () => {
    renderView({ fieldErrors: { attack: 'The attack sprite must be a GIF.' }, status: 'error' });
    const input = screen.getByLabelText('Attack sprite');
    const error = screen.getByText('The attack sprite must be a GIF.');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('links the level error to the Level trigger', () => {
    const message = 'Non-boss monsters go up to level 3; boss monsters go up to level 4.';
    renderView({ fieldErrors: { level: message }, status: 'error' });
    const trigger = screen.getByRole('combobox');
    const error = screen.getByText(message);
    expect(trigger).toHaveAttribute('aria-describedby', error.id);
  });

  it('renders each error inside its own field row, under the matching label', () => {
    renderView({
      fieldErrors: { name: 'name problem', idle: 'idle problem', attack: 'attack problem' },
      status: 'error',
    });
    const nameRow = screen.getByLabelText('Name').parentElement as HTMLElement;
    const idleRow = screen.getByLabelText('Idle sprite').parentElement as HTMLElement;
    const attackRow = screen.getByLabelText('Attack sprite').parentElement as HTMLElement;
    expect(within(nameRow).getByText('name problem')).toBeInTheDocument();
    expect(within(idleRow).getByText('idle problem')).toBeInTheDocument();
    expect(within(attackRow).getByText('attack problem')).toBeInTheDocument();
    expect(within(nameRow).queryByText('idle problem')).not.toBeInTheDocument();
  });

  it('has no aria-describedby on inputs without an error', () => {
    renderView();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Idle sprite')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Attack sprite')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-describedby');
  });
});

describe('MonsterSpriteUploaderView generic error line', () => {
  it('renders on status error with no field error', () => {
    renderView({ status: 'error', fieldErrors: {} });
    expect(screen.getByText(GENERIC_ERROR_TEXT)).toBeInTheDocument();
  });

  it.each([['name'], ['level'], ['idle'], ['attack']] as const)(
    'is hidden when the %s field error is present',
    (field) => {
      renderView({ status: 'error', fieldErrors: { [field]: 'field problem' } });
      expect(screen.getByText('field problem')).toBeInTheDocument();
      expect(screen.queryByText(GENERIC_ERROR_TEXT)).not.toBeInTheDocument();
    },
  );

  it('is not rendered when status is idle', () => {
    renderView({ status: 'idle' });
    expect(screen.queryByText(GENERIC_ERROR_TEXT)).not.toBeInTheDocument();
  });

  it('renders the success line on status success', () => {
    renderView({ status: 'success' });
    expect(screen.getByText('Added — catalog regenerated.')).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_ERROR_TEXT)).not.toBeInTheDocument();
  });
});

describe('MonsterSpriteUploaderView catalog rows', () => {
  it('renders one row per catalog entry', () => {
    renderView();
    expect(screen.getAllByTestId('monster-catalog-row')).toHaveLength(sampleCatalog.length);
  });

  it('gives each of the 4 seed rows a "Seed" badge and no delete control', () => {
    renderView();
    const rows = screen.getAllByTestId('monster-catalog-row');
    const seedRows = rows.filter((row) =>
      SEED_MONSTER_CATALOG.some((seed) => within(row).queryByText(seed.name) && within(row).queryByText(`Lvl ${seed.level}`)),
    );
    expect(SEED_MONSTER_CATALOG).toHaveLength(4);
    expect(seedRows).toHaveLength(4);
    seedRows.forEach((row) => {
      expect(within(row).getByText('Seed')).toBeInTheDocument();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Seed')).toHaveLength(4);
  });

  it('renders no "Seed" badge on a non-seed row', () => {
    renderView();
    const row = screen
      .getAllByTestId('monster-catalog-row')
      .find((candidate) => within(candidate).queryByText(extraMonsterEntry.name)) as HTMLElement;
    expect(within(row).getByText(`Lvl ${extraMonsterEntry.level}`)).toBeInTheDocument();
    expect(within(row).queryByText('Seed')).not.toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders no delete control anywhere in the catalog', () => {
    renderView();
    expect(screen.queryByRole('button', { name: /delete|remove/i })).not.toBeInTheDocument();
  });
});

describe('MonsterSpriteUploaderView Level picker options', () => {
  // Radix Select needs these jsdom gaps filled to open.
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.hasPointerCapture = jest.fn();
    window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  });

  function openLevelPicker() {
    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    return screen.getByRole('listbox');
  }

  it('offers 3 options with Boss off', () => {
    renderView({ isBoss: false, levelOptions: getLevelOptions(false) });
    const options = within(openLevelPicker()).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['1 — Little', '2 — Little', '3 — Big']);
  });

  it('offers 4 options with Boss on', () => {
    renderView({ isBoss: true, levelOptions: getLevelOptions(true) });
    const options = within(openLevelPicker()).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['1 — Little', '2 — Little', '3 — Big', '4 — Big']);
  });

  it('calls onLevelChange with the numeric level when an option is chosen', () => {
    const onLevelChange = jest.fn();
    renderView({ isBoss: true, levelOptions: getLevelOptions(true), onLevelChange });
    fireEvent.click(within(openLevelPicker()).getByRole('option', { name: '4 — Big' }));
    expect(onLevelChange).toHaveBeenCalledWith(4);
  });
});

describe('MonsterSpriteUploaderView file input reset', () => {
  it('remounts both file inputs when the catalog grows', () => {
    const { rerenderView } = renderView();
    const idleBefore = screen.getByLabelText('Idle sprite');
    const attackBefore = screen.getByLabelText('Attack sprite');

    rerenderView({ catalogRows: toCatalogRowViewModels([...sampleCatalog, { ...extraMonsterEntry, level: 3 }]) });

    expect(screen.getByLabelText('Idle sprite')).not.toBe(idleBefore);
    expect(screen.getByLabelText('Attack sprite')).not.toBe(attackBefore);
  });

  it('keeps the same input elements when only status changes', () => {
    const { rerenderView } = renderView();
    const idleBefore = screen.getByLabelText('Idle sprite');
    const attackBefore = screen.getByLabelText('Attack sprite');

    rerenderView({ status: 'submitting' });
    rerenderView({ status: 'error' });
    rerenderView({ status: 'success' });

    expect(screen.getByLabelText('Idle sprite')).toBe(idleBefore);
    expect(screen.getByLabelText('Attack sprite')).toBe(attackBefore);
  });

  it('keeps the same input elements when only the name changes', () => {
    const { rerenderView } = renderView();
    const idleBefore = screen.getByLabelText('Idle sprite');
    rerenderView({ name: 'Fire Ogre' });
    expect(screen.getByLabelText('Idle sprite')).toBe(idleBefore);
  });
});
