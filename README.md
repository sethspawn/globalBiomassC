# Harmonized Global Maps of Above and Belowground Biomass Carbon Density in the Year 2010

## Background:
Remotely sensed biomass carbon density maps are widely used for myriad scientific and policy applications, but all remain limited in scope. They often represent only a single vegetation type and rarely account for carbon stocks in belowground biomass. To date, no global product integrates these disparate estimates into an all-encompassing map at a scale appropriate for many modelling or decision-making applications. We developed an approach for harmonizing vegetation-specific maps of both above and belowground biomass into a single, comprehensive representation of each. We overlaid input maps and allocated their estimates in proportion to the relative spatial extent of each vegetation type using ancillary maps of percent tree cover and landcover, and a rule-based decision schema. The resulting maps consistently and seamlessly report biomass carbon density estimates across a wide range of vegetation types in 2010 with quantified uncertainty. They do so for the globe at an unprecedented 300-meter spatial resolution and can be used to more holistically account for diverse vegetation carbon stocks in global analyses and greenhouse gas inventories.

## General Workflow:
The functions defined in scripts of the "landcover", "layers", and "synthesis" directories make use of those defined in the "commonFunctions" directory and are sourced and implemented in sequence in the "masterScript2.js" script. Note that "biomassC_croplands2000.R" in the "./layers/crop" subdirectory is an R script that was executed seperately (prior to the workflow of "masterScript2.js) to generate input cropland C maps. These maps were then uploaded to Earth Engine as image assets prior to executing masterScript2.js.

## Associated Publications:
#### The maps are described in the following manuscript:
Spawn, S.A., C.C. Sullivan, T.J. Lark, H.K. Gibbs. Harmonized Global Maps of Above and Belowground Biomass Carbon Density in the Year 2010. Scientific Data (2020) doi: 10.1038/s41597-020-0444-4.

#### The final data layers can be accessed from the Oak Ridge National Laboratory DAAC repository: 
Spawn, S.A and H.K. Gibbs, Harmonized Global Maps of Above and Belowground biomass carbon density, 2010. ORNL DAAC, Oak Ridge, Tennessee, USA. (in review) https://doi.org/10.3334/ORNLDAAC/1763
