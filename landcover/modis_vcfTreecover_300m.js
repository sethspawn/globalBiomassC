/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines modis_vcfTreecover_300m() function gets the global vegetation continuous fields map
           for a prescribed year, extracts the "Percent_Tree_Cover" and "Percent_Tree_Cover_SD" bands, 
           aggregates these layers to a 300m resolution and exports them as an asset
  Usage: Source the function and provide parameters.
  Parameters: year: the of the desired vegetation continuous fields map.
              assetId: the name to be assigned to the exported asset.
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source the aggregate300m() function
var aggregate300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/aggregate300m.js')
    aggregate300m = aggregate300m.aggregate300m

// ----------------------------------------------------------------------------------------------------------
// define the modis_vcfTreecover_300m() function
var modis_vcfTreecover_300m = function(year, assetId){
  
  // get date range
  var startDate = ee.Date.fromYMD(year, 1, 1)
  var endDate = ee.Date.fromYMD(year,12,31)
  
  // filter VCF collection by date range and extract desired bands
  var modVCF = ee.Image(ee.ImageCollection('MODIS/051/MOD44B').filterDate(startDate,endDate).first())
      modVCF = modVCF.select(['Percent_Tree_Cover', 'Percent_Tree_Cover_SD'])
  
  // export as asset
  aggregate300m(modVCF, assetId, true)
}

exports.modis_vcfTreecover_300m = modis_vcfTreecover_300m
