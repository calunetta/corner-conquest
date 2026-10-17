import { render } from '@testing-library/react';
import { FundingChoicesLoader } from './funding-choices-loader';

const SCRIPT_SRC_ENV = 'NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC';
const FIXTURE_SCRIPT_SRC = 'https://consent.example.test/funding-choices.js';

describe('FundingChoicesLoader', () => {
  const originalScriptSrc = process.env[SCRIPT_SRC_ENV];

  afterEach(() => {
    if (originalScriptSrc === undefined) delete process.env[SCRIPT_SRC_ENV];
    else process.env[SCRIPT_SRC_ENV] = originalScriptSrc;
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('renders nothing and adds no script when the env var is unset', () => {
    delete process.env[SCRIPT_SRC_ENV];
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { container } = render(<FundingChoicesLoader />);

    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('script[src]')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('adds a script tag with the configured src when the env var is set', () => {
    process.env[SCRIPT_SRC_ENV] = FIXTURE_SCRIPT_SRC;

    render(<FundingChoicesLoader />);

    expect(document.querySelector(`script[src="${FIXTURE_SCRIPT_SRC}"]`)).not.toBeNull();
  });
});
