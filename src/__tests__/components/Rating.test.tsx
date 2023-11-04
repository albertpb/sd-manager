import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import Rating from 'renderer/components/Rating';

describe('rating component', () => {
  it('should render', () => {
    expect(render(<Rating id="test" value={4} />)).toBeTruthy();
  });
});
