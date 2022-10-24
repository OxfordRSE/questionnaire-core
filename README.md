# questionnaire-core

## Using the package

This package should be used to build specific questionnaires, e.g:

* [Clinical Instrument Schedule (Revised)](https://github.com/OxfordRSE/questionnaire-cis-r/)

### Minimum requirements

The package created should expose a `questionnaire()` function to generate a fresh `Questionnaire` object.

If the `Questionnaire` properties are specified in `props`, for example, the package should export at a minimum:

```typescript
import {Questionnaire} from "questionnaire-core";

export const questionnaire: () => Questionnaire = () => new Questionnaire(props);
```

