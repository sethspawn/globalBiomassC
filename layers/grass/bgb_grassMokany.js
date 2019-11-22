/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines bgb_grassMokany() that maps grassland BGB from an AGB map by stratifying Mokany et al. 
           (2006) root-to-shoot ratios using Koppen-Gieger climate classifcation. Output units match those 
           of the input ("agb").
  Usage: Source the function and provide parameters.
  Parameters: agb: a map of aboveground grassland biomass.
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var exportAsset300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/exportAsset300m.js')
    exportAsset300m = exportAsset300m.exportAsset300m

var significantDigits = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/significantDigits.js')
    significantDigits = significantDigits.significantDigits

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var bgb_grassMokany = function(agb){
  
  // apply significant digits function to prevent flukes that emerge from very small numbers
      agb = significantDigits(agb)
  
  // reclassify the koppen classifcation
  var koppen = ee.Image('users/spawnwisc/koppenR')
      koppen = koppen.remap(
    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],
    [1,1,1,1,2,2,2,2,2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 1])
  
  // reclassify koppen to root-to-shoot ratios and apply to agb estimates
  var rs_mean = koppen.remap(
    [1, 2, 3, 4], [1.887, 4.224, 4.504, 4.804]).float()
  var bgb_mean = agb.select('agb').multiply(rs_mean).rename('bgb')
  
    // reclassify koppen to root-to-shoot ratio errors and apply to agb error estimates
  var rs_sd = koppen.remap(
    [1, 2, 3, 4], [0.304, 0.518, 1.337, 1.188])
  var bgb_sd = agb.expression(
    'bgb * ((((agb_sd/agb) ** 2) + ((rs_sd/rs) ** 2)) ** (1/2))',{
      'bgb': bgb_mean,
      'agb_sd': agb.select('err'),
      'agb': agb.select('agb'),
      'rs_sd': rs_sd,
      'rs': rs_mean
    }).rename('err')
  
  // combine mean and error layers
  return bgb_mean.addBands(bgb_sd).rename(['bgb', 'err'])
}

exports.bgb_grassMokany = bgb_grassMokany