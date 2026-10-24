# Vehicle make and model suggestions

The make list in `src/lib/vehicle-catalog.ts` contains 124 selected passenger and commercial vehicle brands. The model suggestions in `src/lib/vehicle-models.ts` merge:

1. Editorial names already used for Suriname and Japanese imports, plus selected regional and newer brands.
2. A dated snapshot of the US National Highway Traffic Safety Administration's [vPIC API](https://vpic.nhtsa.dot.gov/api/), stored in `src/lib/vehicle-models-vpic.json`.

Run `node scripts/update-vpic-models.mjs` to refresh the snapshot. The script resolves an exact make ID from `GetAllMakes`, then fetches `GetModelsForMakeId` for each matched make. It records the retrieval time and source and refuses to overwrite a populated make with a suddenly empty result. It omits vPIC results for MAN and Ora because even the matched names return unrelated products, and for BMW, Honda and Suzuki because the endpoint mixes motorcycle models with cars. Their editorial model lists remain available. vPIC focuses on US registered vehicles, so it does not cover every model or market worldwide. The list is for suggestions; editors may type any make or model, including new, historical or local names.

