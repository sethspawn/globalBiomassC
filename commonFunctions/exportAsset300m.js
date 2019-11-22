/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 26, 2019 [last modified]
  Purpose: Defines exportAsset300m() that exports an image as an asset having the same spatial resolution as 
           the ESA CCI landcover products.
  Usage: Source the function and provide parameters.
  Parameters: img: the map of woody biomass dentity to be converted to carbon density
              assetIdd: name to be assigned to the new asset
*/

// ==========================================================================================================

// define function
var exportAsset300m = function(img, assetId){ 
  
  // export method for global data from Matt Hancher: 
  // https://code.earthengine.google.com/842bb3b598dcb9b1e8d6c6e33123943c
  var scale = 309.2208077591178
  var radius = 6371000;
  var pixelsPerDegree = Math.round(2 * Math.PI * radius / 360 / scale);
  var degreesPerPixel = 1 / pixelsPerDegree;
  
  // Bounds of CCI non-ice land
  var west = -180;
  var east = 180;
  var north = 84;
  var south = -61;
  var width = pixelsPerDegree * (east - west);
  var height = pixelsPerDegree * (north - south);
  
  Export.image.toAsset({
    image: img.float(),
    description: assetId.replace('/', '_'),
    assetId: assetId,
    crs: 'EPSG:4326',
    crsTransform: [degreesPerPixel, 0, west, 0, -degreesPerPixel, north],
    dimensions: [width, height].join('x'),
    maxPixels: 700000000000
  })
}

exports.exportAsset300m = exportAsset300m