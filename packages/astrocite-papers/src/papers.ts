import { Data, ItemType, Person } from 'csl-json';
import { evaluateXPathToNodes, evaluateXPathToString, Node } from 'fontoxpath';
// @ts-ignore
import { sync as parseXML } from 'slimdom-sax-parser';

const FIELD_MAPS: Map<string, keyof Data> = new Map([
    ['title', 'title'],
    ['publisher', 'publisher'],
    ['url', 'URL'],
    ['volume', 'volume'],
    ['number', 'issue'],
    ['doi', 'DOI'],
    ['bundle/publication/title', 'container-title'],
]);

const TYPE_MAP: Map<number, ItemType> = new Map([
    [0, 'book'],
    [400, 'article-journal'],
]);

// @ts-ignore
const FIELD_TRANSFORMS: Map<keyof Data, (node: Node) => any> = new Map([
    [
        'type',
        node => {
            const type = evaluateXPathToString('type', node);

            if (type === '') {
                return;
            }

            return TYPE_MAP.get(Number(type));
        },
    ],
    [
        'author',
        node => {
            const authorNodes = evaluateXPathToNodes('authors/author', node);

            if (!authorNodes.length) {
                return;
            }

            const items: Person[] = [];

            for (const authorNode of authorNodes) {
                items.push({
                    given: [
                        evaluateXPathToString('firstName', authorNode),
                        evaluateXPathToString('middleNames', authorNode),
                    ]
                        .filter(Boolean)
                        .join(' '),
                    family: evaluateXPathToString('lastName', authorNode),
                });
            }

            return items;
        },
    ],
    [
        'page',
        node => {
            const startPage = evaluateXPathToString('startpage', node);

            if (startPage === '') {
                return;
            }

            const parts = [startPage];

            const endPage = evaluateXPathToString('endpage', node);

            if (endPage !== '') {
                parts.push(endPage);
            }

            return parts.join('-');
        },
    ],
    [
        'issued',
        node => {
            const publicationDate = evaluateXPathToString(
                'publication_date',
                node,
            );

            const matches = publicationDate.match(/^99(\d{4})(\d{2})(\d{2})/);

            if (!matches) {
                return;
            }

            const [year, month, day] = matches.slice(1).map(Number);

            const parts: number[] = [];

            if (year) {
                parts.push(year);
            }

            if (month >= 1 && month <= 12) {
                parts.push(month);
            }

            if (day >= 1 && day <= 31) {
                parts.push(day);
            }

            return {
                'date-parts': [parts],
            };
        },
    ],
]);

function parseItem(node: Node): Data {
    const output: Partial<Data> = {};

    for (const [key, transform] of FIELD_TRANSFORMS.entries()) {
        const result = transform(node);

        if (result !== undefined) {
            output[key] = result;
        }
    }

    for (const [xpath, key] of FIELD_MAPS.entries()) {
        const result = evaluateXPathToString(xpath, node);

        if (result !== '') {
            output[key] = result as any;
        }
    }

    return output as Data;
}

export function parse(xml: string): Data[] {
    const documentNode = parseXML(xml);

    const items = evaluateXPathToNodes(
        '/citation/publications/publication',
        documentNode,
    );

    return items.map(parseItem);
}
