# astrocite-papers

A helper library for converting Papers citations XML to CSL JSON.

See [astrocite](https://github.com/dsifford/astrocite) for more details.

## API

### toCSL(xml)

Returns: `Array<CSL.Data>`

#### xml

Type: `Object`

The entire XML data received from Papers.

## Usage

```js
import { toCSL } from 'astrocite-papers';

// Assume xml is the XML received from Papers
const cslJSON = toCSL(xml);
```
