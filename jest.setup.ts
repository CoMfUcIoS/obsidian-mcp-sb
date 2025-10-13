// Suppress console.error globally in tests
let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleError = console.error;
  console.error = (..._args: any[]) => {};
});

afterAll(() => {
  console.error = originalConsoleError;
});
