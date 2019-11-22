/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 26, 2019 [last modified]
  Purpose: Defines biomassToCarbon() function that converts maps of woody biomass density to woody biomass 
           carbon density by stratifying biomass C fractions for woody biomass that are reported in Martin 
           et al. (2018) using aggregated classes of the Koppen-Gieger climatic classificationand the ESA 
           CCI landcover classification to create a corresponding map of biomass carbon density
  Usage: Source the function and provide parameters.
  Parameters: img: the map of woody biomass dentity to be converted to carbon density
              landcover: the landcover map (ESA CCI) to be used to determine tree phylogeny
*/

// ==========================================================================================================
 
// ----------------------------------------------------------------------------------------------------------
var biomassToCarbon = function(img, landcover){
  var koppen = ee.Image('users/spawnwisc/koppenR')
  
  // reclass koppen classification to climatic regions used by Martin et al. (2018)
  var zones = koppen.remap(
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],
    [1,1,1,1,2,3,2,3,2, 3, 3, 2, 3, 3, 2, 2, 3, 3, 3, 4, 4, 3, 3, 4, 4, 3, 3, 4, 4, 4, 4, 5])

  // reclass ESA CCI classes to corresponding Martin et al. (2018) phylogenies. 
  var phylo = landcover.remap(
    [0,10,11,12,20,30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,120,121,122,130,140,150,151,152,153,160,170,180,190,200,201,202,210],
    [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1])

  var strata = zones.multiply(10).add(phylo) // creates unique id for each cFrac strata
  
  // based on Martin et al. 2018 and superclass positional accuracy of ESA CCI
  var cFrac_mean = strata.remap( // x0: gymno; x1: mixed; x2: agio;
    [10   , 11   , 12   , 20   , 21    , 22   , 30  , 31   , 32   , 40   , 41   , 42   , 50   , 51   , 52   ],
    [0.450, 0.452, 0.454, 0.484, 0.478, 0.465, 0.489, 0.483, 0.472, 0.476, 0.480, 0.488, 0.479, 0.476, 0.471])
  
  // accounting for s.e. of C frac and superclass positional accuracy of ESA CCI
  var cFrac_sd = strata.remap( // x0: gymno; x1: mixed; x2: agio;
    [10     , 11     , 12     , 20     , 21     , 22     , 30     , 31     , 32     , 40     , 41    , 42    , 50    , 51    , 52    ],
    [0.00762, 0.00417, 0.00328, 0.00921, 0.00841, 0.00648, 0.00616, 0.00590, 0.00485, 0.00940, 0.0114, 0.0129, 0.0124, 0.0155, 0.0113])
  
  // convert biomass (and error) to carbon using the maps defined above. 
  var biomassC_mean = img.select(0).multiply(cFrac_mean)
  var biomassC_err = img.select(1).expression(
    'bioC * (((b/B) ** 2) + ((c/C) ** 2)) ** (1/2)', {
      'bioC': biomassC_mean,
      'b': img.select('err'),
      'B': img.select(0),
      'c': cFrac_sd,
      'C': cFrac_mean
    }).rename('err')
  
  return biomassC_mean.addBands(biomassC_err)
}

exports.biomassToCarbon = biomassToCarbon
