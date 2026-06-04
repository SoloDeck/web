# Testing Rules

## Test Structure

*(Note: Adjust this structure based on the specific testing tools adopted by the web workspace (e.g., Vitest, React Testing Library, Playwright).)*

```text
src/
├── components/
│   └── ui/
│       └── __tests__/       ← Unit tests for UI primitives
├── features/
│   └── deals/
│       ├── components/
│       │   └── __tests__/   ← Component tests (React Testing Library)
│       ├── hooks/
│       │   └── __tests__/   ← Hook tests
│       └── services/
│           └── __tests__/   ← Service tests (Mocking Axios)
```

---

## Unit Testing (Hooks & Services)

- Use a test runner like Vitest/Jest.
- Mock API calls (e.g., using MSW - Mock Service Worker) instead of mocking `axios` directly if possible, to test the full React Query lifecycle.
- Test custom hooks using `@testing-library/react-hooks` or standard component wrappers.

---

## Component Testing (React Testing Library)

- Render components with the necessary providers (e.g., `QueryClientProvider`, `RouterProvider`).
- Test user interactions (click, type, drag) rather than implementation details.
- Query elements by role or text, not by DOM structure or specific Tailwind classes.

```tsx
// Example pseudo-test
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DealCard } from '../DealCard';

test('renders deal information and handles click', async () => {
  render(<DealCard id="1" title="Test Deal" value={5000} />);
  
  expect(screen.getByText('Test Deal')).toBeInTheDocument();
  
  await userEvent.click(screen.getByRole('button', { name: /chi tiết/i }));
  // assert expected behavior
});
```

---

## E2E Testing (Playwright/Cypress) - Future

- Target critical user journeys:
  - Login flow
  - Creating a deal
  - Dragging a deal across Kanban columns
  - Generating a proposal

## Minimum Requirements (If tests are mandated)

- Any highly reusable UI component in `src/components/ui/` should be unit tested.
- Critical business logic in custom hooks must have tests covering edge cases.
- API service functions should be verified to handle proper payload mapping.
