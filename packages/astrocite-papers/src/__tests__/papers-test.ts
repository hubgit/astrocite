import { promises } from 'fs';
import { join } from 'path';

import { parse } from '../papers';

const FIXTURES_DIR = join(__dirname, './fixtures');

describe('Papers XML', () => {
    let fixtures: string[] = [];

    beforeAll(async () => {
        fixtures = await promises.readdir(FIXTURES_DIR);
    });

    it('should parse all fixtures to CSL JSON correctly', async () => {
        for (const file of fixtures) {
            const xml = await promises.readFile(
                join(FIXTURES_DIR, file),
                'utf-8',
            );
            expect(parse(xml)).toMatchSnapshot();
        }
    });
});
