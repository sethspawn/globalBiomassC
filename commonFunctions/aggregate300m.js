/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Mar 20, 2019 [last modified]
  Purpose: Defines aggregate300m() function that aggregates biomass and error maps to 300m spatial 
           resolution and exports them as an asset.
  Usage: Source the function and provide parameters.
  Parameters: image: the map to be aggregated
              assetIdd: name to be assigned to the new asset
              err: whether map includes an error band (true/false)
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
//  source exportAsset300m function
var exportAsset300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/exportAsset300m.js')
    exportAsset300m = exportAsset300m.exportAsset300m

// function to aggregate error using summation in quadrature [e.g. sqrt((sum(err^2)/count)]
var aggregateError = function(errImage){
  var err2 = errImage.updateMask(errImage.gt(0)).pow(2)
  var errAgg = err2.reduceResolution(ee.Reducer.mean()).sqrt()
  return errAgg.unmask(0).mask(1).rename('err')
}

// define function for aggregating mean and error images to 300m resolution and exporting as asset
var aggregate300m = function(image, assetId, err){
  
  // get extent and projection info from ESA CCI landcover map
  var esaLandcover = ee.Image('users/spawnwisc/ESACCI-LC-L4-LCCS-Map-300m-P1Y-1992_2015-v207')
  var proj = esaLandcover.projection()
  var bounds = esaLandcover.geometry()
  
  // get agb image and reduce resolution with mean reducer
  var meanImg = image.select(0).float()
  var meanImg300 = meanImg.reduceResolution(ee.Reducer.mean())
  
  // if there is an error band, aggegate in in accordance with summation in quadrature
  if (err = true){
    meanImg = meanImg.addBands(aggregateError(image.select(1).float()))
  }
      meanImg = meanImg.reproject({crs:proj})
  
  // implementation of export method for global data from Matt Hancher: 
  // https://code.earthengine.google.com/842bb3b598dcb9b1e8d6c6e33123943c
  exportAsset300m(meanImg, assetId)
}

exports.aggregate300m =  aggregate300m


