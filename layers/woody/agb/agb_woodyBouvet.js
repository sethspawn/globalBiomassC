/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Sept 26, 2019 [last modified]
  Purpose: Defines agb_woodyBouvet() function that creates a mosaic image from the biomass map tiles provided
           by Alexander Bouvet (10/8/2018). It also defines agb_woodyBouvet_addErr() which adds an error band 
           using the analytic function provided by Alexander Bouvet (9/26/2018).
  Usage: Source the function and provide parameters.
  Parameters: agb: the AGB mosaic produced by agb_woodyBouvet()
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// define function that creates mosaic from Bouvet tiles
var agb_woodyBouvet = function(){
  
  // load tiles 
  var cAf = ee.Image('users/spawnwisc/AGB_50m_Central_and_Eastern_Africa')
  var mAf = ee.Image('users/spawnwisc/AGB_50m_Madagascar')
  var nAf = ee.Image('users/spawnwisc/AGB_50m_Northern_Africa')
  var sAf = ee.Image('users/spawnwisc/AGB_50m_Southern_Africa')
  var wAf = ee.Image('users/spawnwisc/AGB_50m_Western_Africa')

  // mosaic tiles
  var mosaic = ee.ImageCollection([cAf, mAf, nAf, sAf, wAf]).mosaic()
      mosaic = mosaic.updateMask(mosaic.lte(85).and(mosaic.gt(0)))
  
  var scale = 49.47532924145493
  var radius = 6371000;
  var pixelsPerDegree = Math.round(2 * Math.PI * radius / 360 / scale);
  var degreesPerPixel = 1 / pixelsPerDegree;
  
  // bounds of CCI non-ice land
  var west = -180;
  var east = 180;
  var north = 84;
  var south = -61;
  var width = pixelsPerDegree * (east - west);
  var height = pixelsPerDegree * (north - south);
  
  Export.image.toAsset({
    image: mosaic,
    description: 'bouvet_AGB_50m_Africa',
    assetId: 'bouvet_AGB_50m_Africa',
    crs: 'EPSG:4326',
    crsTransform: [degreesPerPixel, 0, west, 0, -degreesPerPixel, north],
    dimensions: [width, height].join('x'),
    maxPixels: 300000000000
  })
}

exports.agb_woodyBouvet = agb_woodyBouvet

// ----------------------------------------------------------------------------------------------------------
// define function that adds error band to Bouvet map
var agb_woodyBouvet_addErr = function(agb){
  var err = (agb.multiply(1.0551)).subtract((agb.pow(2)).multiply(0.007)).subtract(agb.pow(3).multiply(0.0000273))
  return agb.addBands(err).rename(['agb', 'err'])
}

exports.agb_woodyBouvet_addErr = agb_woodyBouvet_addErr