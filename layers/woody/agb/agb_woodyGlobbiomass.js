/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: pre-Mar 20, 2019 [last modified]
  Purpose: Defines agb_woodyGlobiomass which creates and exports a mosaic from GlobBiomass tiles.
  Usage: Source the function and provide parameters.
  Parameters: assetId: the name to be assigned to the exported asset
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// define function that creates mosaic from GlobBiomass tiles
var agb_woodyGlobiomass = function(assetId){

  // tiles from: http://globbiomass.org/wp-content/uploads/GB_Maps/Globbiomass_global_dataset.html

  // tile row 1
  var n80w180 = ee.Image('users/spawnwisc/N80W180_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80W180_agb_err').rename('err'))

  var n80w140 = ee.Image('users/spawnwisc/N80W140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80W140_agb_err').rename('err'))

  var n80w100 = ee.Image('users/spawnwisc/N80W100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80W100_agb_err').rename('err'))

  var n80w060 = ee.Image('users/spawnwisc/N80W060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80W060_agb_err').rename('err'))

  var n80w020 = ee.Image('users/spawnwisc/N80W020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80W020_agb_err').rename('err'))

  var n80e020 = ee.Image('users/spawnwisc/N80E020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80E020_agb_err').rename('err'))

  var n80e060 = ee.Image('users/spawnwisc/N80E060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80E060_agb_err').rename('err'))

  var n80e100 = ee.Image('users/spawnwisc/N80E100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80E100_agb_err').rename('err'))

  var n80e140 = ee.Image('users/spawnwisc/N80E140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N80E140_agb_err').rename('err'))

  // tile row 2
  var n40w180 = ee.Image('users/spawnwisc/N40W180_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40W180_agb_err').rename('err'))

  var n40w140 = ee.Image('users/spawnwisc/N40W140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40W140_agb_err').rename('err'))

  var n40w100 = ee.Image('users/spawnwisc/N40W100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40W100_agb_err').rename('err'))

  var n40w060 = ee.Image('users/spawnwisc/N40W060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40W060_agb_err').rename('err'))

  var n40w020 = ee.Image('users/spawnwisc/N40W020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40W020_agb_err').rename('err'))

  var n40e020 = ee.Image('users/spawnwisc/N40E020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40E020_agb_err').rename('err'))
  
  var n40e060 = ee.Image('users/spawnwisc/N40E060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40E060_agb_err').rename('err'))

  var n40e100 = ee.Image('users/spawnwisc/N40E100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40E100_agb_err').rename('err'))

  var n40e140 = ee.Image('users/spawnwisc/N40E140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N40E140_agb_err').rename('err'))

  // tile row 3
  var n00w180 = ee.Image('users/spawnwisc/N00W180_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00W180_agb_err').rename('err'))

  var n00w100 = ee.Image('users/spawnwisc/N00W100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00W100_agb_err').rename('err'))

  var n00w060 = ee.Image('users/spawnwisc/N00W060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00W060_agb_err').rename('err'))

  var n00w020 = ee.Image('users/spawnwisc/N00W020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00W020_agb_err').rename('err'))

  var n00e020 = ee.Image('users/spawnwisc/N00E020_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00E020_agb_err').rename('err'))

  var n00e060 = ee.Image('users/spawnwisc/N00E060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00E060_agb_err').rename('err'))

  var n00e100 = ee.Image('users/spawnwisc/N00E100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00E100_agb_err').rename('err'))

  var n00e140 = ee.Image('users/spawnwisc/N00E140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/N00E140_agb_err').rename('err'))

  // tile row 4
  var s40w100 = ee.Image('users/spawnwisc/S40W100_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/S40W100_agb_err').rename('err'))

  var s40w060 = ee.Image('users/spawnwisc/S40W060_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/S40W060_agb_err').rename('err'))
  
  var s40e140 = ee.Image('users/spawnwisc/S40E140_agb').rename('agb')
                     .addBands(ee.Image('users/spawnwisc/S40E140_agb_err').rename('err'))


  // create collection from images
  var collection = ee.ImageCollection.fromImages([
    n80w180, n80w140, n80w100, n80w060, n80w020, n80e020, n80e060, n80e100, n80e140,
    n40w180, n40w140, n40w100, n40w060, n40w020, n40e020, n40e060, n40e100, n40e140,
    n00w180,          n00w100, n00w060, n00w020, n00e020, n00e060, n00e100, n00e140,
                      s40w100, s40w060,                                     s40e140
    ])


  // mosaic collection
  var mosaic = collection.mosaic()

  // export as asset
  //print(n80w180.projection().nominalScale())
  var myScale = 98.95065848290984 // From scale above

  Export.image.toAsset({
    image: mosaic, 
    description: 'globbiomasMosaic', 
    assetId: assetId, 
    scale: myScale,
    //crs: myProj,
    //region: region,
    maxPixels: 70000000000
  })
}

exports.agb_woodyGlobiomass = agb_woodyGlobiomass