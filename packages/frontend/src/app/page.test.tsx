import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home page', () => {
    it('renders the main landmark with the page heading', () => {
        render(<Home />);

        // Query by role and accessible name, the way users and assistive technology find
        // elements, not by class names or DOM structure.
        expect(screen.getByRole('main')).toContainElement(
            screen.getByRole('heading', {
                level: 1,
                name: 'Monorepo Boilerplate',
            })
        );
    });
});
