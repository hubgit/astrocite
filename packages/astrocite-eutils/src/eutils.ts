import { parseDate } from 'astrocite-core';
import { Data } from 'csl-json';

import { FIELD_MAP } from './constants';
import { EUtilsError } from './error';
import { Entry, EntryOk, isError, Response } from './schema';

const FIELD_TRANSFORMS = new Map<
    keyof EntryOk,
    (entry: EntryOk) => Partial<Data>
>([
    [
        'articleids',
        ({ articleids, uid }) => {
            const ids: { [key: string]: string } = {};

            for (const { idtype, value } of articleids) {
                ids[idtype] = value;
            }

            const data: Partial<Data> = {};

            if (ids.doi) {
                data.DOI = ids.doi;
            }

            for (const value of [ids.pubmed, ids.pmid]) {
                if (value) {
                    data.PMID = value;
                }
            }

            for (const value of [ids.pmc, ids.pmcid]) {
                if (value && value.match(/^PMC\d+$/)) {
                    data.PMCID = value;
                }
            }

            if (data.PMID && data.PMID === uid) {
                data.URL = `https://www.ncbi.nlm.nih.gov/pubmed/${data.PMID}`;
            } else if (data.PMCID && data.PMCID === `PMC${uid}`) {
                data.URL = `https://www.ncbi.nlm.nih.gov/pmc/articles/${data.PMCID}`;
            }

            return data;
        },
    ],
    [
        'authors',
        ({ authors }) => {
            return {
                author: authors
                    .map(({ name }) => {
                        const [family, given] = name.split(' ');
                        return {
                            family: family || '',
                            ...(given ? { given } : {}),
                        };
                    })
                    .filter(({ family }) => family !== ''),
            };
        },
    ],
    [
        'lang',
        ({ lang }) => {
            return {
                language: lang[0],
            };
        },
    ],
    [
        'sortdate',
        ({ sortdate }) => {
            return {
                issued: parseDate(sortdate),
            };
        },
    ],
    [
        'sortpubdate',
        ({ sortpubdate }) => {
            return {
                issued: parseDate(sortpubdate),
            };
        },
    ],
    [
        'source',
        ({ source }) => {
            return {
                journalAbbreviation: source,
                'container-title-short': source,
            };
        },
    ],
]);

const keys = Object.keys as <T>(o: T) => Array<Extract<keyof T, string>>;

function parseEntry(entry: Entry): Data | EUtilsError {
    if (isError(entry)) {
        return new EUtilsError(entry.error, entry.uid);
    }
    return keys(entry).reduce<Data>(
        (obj, key) => {
            if (!entry[key]) {
                return obj;
            }
            const transform = FIELD_TRANSFORMS.get(key);
            if (transform) {
                return { ...obj, ...transform(entry) };
            }
            const cslKey = FIELD_MAP.get(key);
            if (cslKey) {
                return { ...obj, [cslKey]: entry[key] };
            }
            return obj;
        },
        {
            id: entry.uid,
            type: 'article-journal',
        },
    );
}

export function toCSL({ error, result }: Response): Array<Data | EUtilsError> {
    return [
        ...(error ? [new EUtilsError(error, true)] : []),
        ...result.uids.map(id => parseEntry(result[id])),
    ];
}
