import { render, screen } from '@testing-library/react';
import { previews } from '../../registry';
import { PreviewCatalog } from './PreviewCatalog';

describe('PreviewCatalog', () => {
  it('links every registered preview to its page', () => {
    render(<PreviewCatalog />);

    previews.forEach((preview) => {
      expect(screen.getByTestId(`testbed-link-${preview.slug}`)).toHaveAttribute(
        'href',
        `/testbed/${preview.slug}`,
      );
    });
  });

  it('shows each group as a labelled section', () => {
    render(<PreviewCatalog />);

    new Set(previews.map((preview) => preview.group)).forEach((group) => {
      expect(screen.getByRole('region', { name: group })).toBeInTheDocument();
    });
  });
});
