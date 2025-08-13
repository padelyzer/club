// Mock Radix UI Portal to render inside the container instead of document.body
export const mockRadixPortal = () => {
  const originalPortal = jest.requireActual(
    '@radix-ui/react-dropdown-menu'
  ).Portal;

  jest.mock('@radix-ui/react-dropdown-menu', () => {
    const actual = jest.requireActual('@radix-ui/react-dropdown-menu');
    return {
      ...actual,
      Portal: ({ children }: { children: React.ReactNode }) => children,
    };
  });
};
