/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines agbc_cropNPP() function that maps cropland AGBC for the focal year by calibrating derived 
           Monfreda/Wolf maps (representing conditions in 2000) to the focal year using MODIS NPP timeseries. 
           The resulting maps are exported as 300m assets (Downscaled from 8km resolution using bilinear 
           resampling method). Units = MgC/ha.
  Usage: Source the function and provide parameters.
  Parameters: year: the year to which the monfreda maps should be calibrated.
              assetId: the name to be assigned to the exported asset.
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var exportAsset300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/exportAsset300m.js')
    exportAsset300m = exportAsset300m.exportAsset300m

var modis_NPPtrend = require('users/spawnwisc/globalBiomass:finalGlobal/layers/crop/modis_NPPtrend.js')
    modis_NPPtrend = modis_NPPtrend.modis_NPPtrend

// ----------------------------------------------------------------------------------------------------------
// calculate current crop biomass from monfreda and NPP trend
var agbc_cropNPP = function(year, assetId){
  
  // get number of years between focal period and 
  var timeElapsed = ee.Number(year).subtract(2000)
  
  // create mask for monfreda map
  var mask = ee.Image('users/spawnwisc/finalGlobal/rawData/agbc_crop_Monfreda_MgCha_8km_final').mask()
  
  // agbc layer produced in R from monfreda yield maps (c 2000) and coefficients from monfreda (2008) and wolf (2015)
  var agbc_cropMonfreda = ee.Image('users/spawnwisc/finalGlobal/rawData/agbc_crop_Monfreda_MgCha_8km_final').resample()
  var bgbc_cropMonfreda = ee.Image('users/spawnwisc/finalGlobal/rawData/bgbc_crop_Monfreda_MgCha_8km_final').resample()
  
  // get NPP trend from entire MODIS 1km time series (2000-2015) (MgC/year)
  var nppTrend = modis_NPPtrend(1000).resample() // 1000 iterations for uncertainty calc
  
  // aboveground NPP (MgC/year)
  var nppTrend_agb = nppTrend.multiply(agbc_cropMonfreda.divide(agbc_cropMonfreda.add(bgbc_cropMonfreda)))
  
  // calculate focal agb and error by linear extension of monfreda using annual NPP trend
  var agbc_current_mean = nppTrend_agb.select('slope')
                                  .multiply(timeElapsed)
                                  .add(agbc_cropMonfreda)
                                  .rename('agb')
                                  
      agbc_current_mean = agbc_current_mean.where(agbc_current_mean.lt(0), 0)
  
  var agbc_current_sd = nppTrend_agb.select('slope_stdDev')
                                    .multiply(timeElapsed)
                                    .rename('err')
  
  // recombine mean and error images
  var outImg = agbc_current_mean.addBands(agbc_current_sd).updateMask(mask)
  
  // export as 300m asset to match ESA CCI landcover
  exportAsset300m(outImg, assetId)
}

exports.agbc_cropNPP = agbc_cropNPP