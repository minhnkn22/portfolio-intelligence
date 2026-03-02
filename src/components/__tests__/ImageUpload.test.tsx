import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUpload from '../ImageUpload';

// Mock FileReader
const mockReadAsDataURL = jest.fn();
const mockFileReader = {
  readAsDataURL: mockReadAsDataURL,
  result: 'data:image/png;base64,abc123',
  onload: null as (() => void) | null,
};
(global as any).FileReader = jest.fn(() => mockFileReader);

function createFile(name: string, type: string): File {
  return new File(['dummy'], name, { type });
}

describe('ImageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadAsDataURL.mockImplementation(function (this: any) {
      if (this.onload) this.onload();
    });
  });

  it('renders the dropzone', () => {
    render(<ImageUpload />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('accepts image files', async () => {
    render(<ImageUpload />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = createFile('portfolio.png', 'image/png');

    fireEvent.change(input, { target: { files: [file] } });

    // react-dropzone processes async
    await waitFor(() => {
      expect(mockReadAsDataURL).toHaveBeenCalled();
    });
  });

  it('shows preview after upload', async () => {
    render(<ImageUpload />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = createFile('portfolio.png', 'image/png');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('preview-image')).toBeInTheDocument();
    });
  });

  it('rejects non-image files', async () => {
    render(<ImageUpload />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = createFile('document.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    // Should not trigger FileReader for rejected files
    await new Promise((r) => setTimeout(r, 100));
    expect(mockReadAsDataURL).not.toHaveBeenCalled();
  });
});
