/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines woody_globalMosaic function which combines the GlobBiomass and Bouvet maps using the 
           guidance of the ESA CCI landcover map.
           Also Defines globalMosaic() and its dependency addHerb() which combines all disparate biomass maps 
           using rule based decisions.
  Usage: Source the function and provide parameters.
  Parameters: woody: global woody biomass mosaic
              grass: global grassland biomass map
              crop: global cropland biomass map
              tundra: global tundra biomass map
              percTree: map of MODIS percent tree cover (must include associated error image)
              landcover: ESA CCI landcover map
              woodyAGB: global map of aboveground woody biomass map (used to determine tree or tundra assignment)
              tundraAGB: map of aboveground tundra biomass (used to determine tree or tundra assignment)
              imageGlobal: GlobBiomass AGB map
              imageBouvet: Bouvet AGB map.
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source necessary functions
var significantDigits = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/significantDigits.js')
    significantDigits = significantDigits.significantDigits

// ----------------------------------------------------------------------------------------------------------
// function used to combine GlobBiomass and Bouvet maps into a single woody AGB product
var woody_globalMosaic = function(imageGlobal, imageBouvet, landcover){
  
  var bandNames = imageGlobal.bandNames()
  var globbiomass = imageGlobal
  
  var woodyReclass = landcover.remap(
    [0,10,11,12,20,30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,120,121,122,130,140,150,151,152,153,160,170,180,190,200,201,202,210],
    [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  1,  1,  1,  1,  1])

  // Bouvet for all africa except closed forests
  var bouvetUse = imageBouvet.updateMask(woodyReclass.eq(1))
  
  var mosaic = ee.ImageCollection([bouvetUse, globbiomass]).reduce(ee.Reducer.firstNonNull())
  
  return mosaic.rename(bandNames)
}

exports.woody_globalMosaic = woody_globalMosaic

// ----------------------------------------------------------------------------------------------------------
// function to propotionately add herbaceous biomass to woody estimates
var addHerb = function(woody, herb, percTree){

  // get band names
  var bandNames = woody.bandNames()
  
  // create percHerb image from percTree with adjusted uncertainty
  var percTree_mean = percTree.select(0)
      percTree_mean = percTree_mean.where(percTree_mean.gt(80), 80) // since VCF saturate at 80%, rescale
      percTree_mean = percTree_mean.unitScale(0,80)
  
  var scaleFactor = percTree_mean.divide(percTree.select(0).unitScale(0,100))
  
  var percTree_sd = percTree.select(1).multiply(0.01).divide(100) // unscale and convert to fraction
      percTree_sd = percTree_sd.multiply(scaleFactor)
  
      percTree = percTree_mean.addBands(percTree_sd)
      
      percTree = percTree.where(woody.select(0).eq(0), 0)
      percTree = significantDigits(percTree)
 
  var percHerb_mean = ee.Image(1).subtract(percTree.select(0))
  var percHerb_sd = percTree.select(1)
  
  // calculate combined woody and herb biomass
  var bio_mean = woody.select(0).add(herb.select(0).multiply(percHerb_mean))
  var bio_sd = ee.Image().expression(
  '(w**2 + ((H*T * ((h/H)**2 + (t/T)**2)**(1/2))**2))**(1/2)', {
    'w': woody.select(1), // woody error
    'H': herb.select(0),  // herb biomass
    'h': herb.select(1),  // herb error
    'T': percHerb_mean,   // herb cover (%)
    't': percHerb_sd,     // herb cover error
  })
  
  return bio_mean.addBands(bio_sd).rename(bandNames)
}

// ----------------------------------------------------------------------------------------------------------
// function to combine all disparate estimates into a single map
var globalMosaic = function(woody, grass, crop, tundra, percTree, landcover, woodyAGB, tundraAGB){
  
  // trim significant digits to avoid uncertainty outliers (6/28/19)
      woody = significantDigits(woody)
      grass = significantDigits(grass)
      crop = significantDigits(crop)
      tundra = significantDigits(tundra)
  
  // set any grass values < 0 to 0 
      grass = grass.unmask().where(grass.select(0).lt(0), 0)
      grass = grass.unmask().where(grass.select(1).lt(0), 0)
  
  // PREPARE layers ---------------------------------------
  
  // get band names
  var bandNames = woody.bandNames()

  // load masks
  var borealMask = ee.Image('users/spawnwisc/borealMask')
  var tundraMask = ee.Image('users/spawnwisc/tundraMask10km')
      tundraMask = tundraMask.updateMask(borealMask.unmask().not())

  // latlon image for masking
  var lat = ee.Image.pixelLonLat().select('latitude')

  // --- define herb fill
  // set crop to grass value where missing data
      crop = crop.unmask()
      crop = crop.where(crop.eq(0), grass).resample() //resample to smooth out grass/crop transition

  var herb_lc = landcover.remap( // 1 = CROP, 2 = GRASS
    [0,10,11,12,20,30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,120,121,122,130,140,150,151,152,153,160,170,180,190,200,201,202,210],
    [2,1 ,1 ,1 ,1 ,1 ,1 ,2 ,2 ,2 ,2 ,2 ,2 ,2 ,2 ,2 ,2 ,2 ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ,2  ])
  
  var herb_bio = ee.ImageCollection([
    crop.updateMask(herb_lc.eq(1)),
    grass.updateMask(herb_lc.eq(2))])
      .reduce(ee.Reducer.firstNonNull()) 

  // TUNDRA biome ----------------------------------------
  
  // If cover is "sparse" class and trees present, automatically assign bener value - no other woody
  var sparce = landcover.remap(
    [120,121,122,140,150,151,152,153,200,201,202,203,130], 
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
      sparce = landcover.mask().updateMask(sparce.eq(-1))

  // If tree cover > 10 and globbiomass is > than tundra, use globbiomass otherwise assume tundra.
  var useWoody = ee.Image(1).updateMask(percTree.select(0).gt(10))
      useWoody = useWoody.updateMask(woodyAGB.select(0).gt(tundraAGB.select(0))).updateMask(sparce.unmask().not())

  var tundraSparce = tundra.updateMask(sparce)
  var tundraTree = addHerb(woody, grass, percTree).updateMask(useWoody)
  var tundraOther = tundra.updateMask(useWoody.unmask().not())
  var tundraMosaic = ee.ImageCollection([tundraSparce, tundraTree, tundraOther])
      tundraMosaic = tundraMosaic.reduce(ee.Reducer.firstNonNull()).rename(bandNames).updateMask(tundraMask)

  // BOREAL biome ----------------------------------------

  var borealHerb_bio = herb_bio.updateMask(sparce.mask().not()) // remove pixels defined as sparse above -- treated as pure tundra

  // --- split boreal biome north and south of lat 60 
  //since grass confounds tundra continuity (assumes grass above 60 is tundra)
  var borealDiv = ee.Number(60)
  
  var N = ee.Image(1).updateMask(lat.gt(borealDiv)).rename('b1')
  var N_weight = lat.subtract(borealDiv.subtract(1)).updateMask(lat.lt(borealDiv.add(1))).updateMask(lat.gt(borealDiv.subtract(1)))
      N_weight = N_weight.unitScale(0, 2).rename('b1')
      N_weight = ee.ImageCollection([N_weight, N]).reduce(ee.Reducer.firstNonNull())
  
  var S = ee.Image(1).updateMask(lat.lt(borealDiv)).rename('b1')
  var S_weight = N_weight.subtract(1).abs().rename('b1')
      S_weight = ee.ImageCollection([S_weight, S]).reduce(ee.Reducer.firstNonNull())
  
  // --- Boreal North (N of 60 degrees)
  var N_borealSparce = tundra.updateMask(sparce) // sparce same as tundra
  var N_borealTree = addHerb(woody, grass, percTree).updateMask(useWoody)
  var N_borealOther = tundra.updateMask(useWoody.unmask().not()) // assume tundra veg
  var N_borealMosaic = ee.ImageCollection([N_borealSparce, N_borealTree, N_borealOther])
      N_borealMosaic = N_borealMosaic.reduce(ee.Reducer.firstNonNull()).rename(bandNames)
      N_borealMosaic = N_borealMosaic.updateMask(borealMask).multiply(N_weight)

  // --- Boreal South (S of 60 degrees) 
  var S_borealSparce = tundra.updateMask(sparce)
  var S_borealOther = addHerb(woody, borealHerb_bio, percTree)// WHY IS TUNDRA BEING APPLIED TO TREE COVER?????
  var S_borealMosaic = ee.ImageCollection([S_borealSparce, S_borealOther])
      S_borealMosaic = S_borealMosaic.reduce(ee.Reducer.firstNonNull()).rename(bandNames)
      S_borealMosaic = S_borealMosaic.updateMask(borealMask).multiply(S_weight)

  // --- Boreal Mosaic 
  var borealMosaic = ee.ImageCollection([N_borealMosaic, S_borealMosaic])
      borealMosaic = borealMosaic.reduce(ee.Reducer.sum()).rename(bandNames)

  // OTHER Biomes ----------------------------------------

  var otherMosaic = addHerb(woody, herb_bio, percTree)
      otherMosaic = otherMosaic.updateMask(borealMask.unmask().not()).updateMask(tundraMask.unmask().not())
  
  // GLOBAL Mosaic ---------------------------------------

  var globalMosaic = ee.ImageCollection([tundraMosaic, borealMosaic, otherMosaic, grass, ee.Image(0).addBands(ee.Image(0)).rename(bandNames)])
      globalMosaic = globalMosaic.reduce(ee.Reducer.firstNonNull()).rename(bandNames)
      globalMosaic = globalMosaic.where(landcover.gte(210), 0)
      globalMosaic = globalMosaic.updateMask(landcover.neq(210))
  
  return globalMosaic
}

exports.globalMosaic = globalMosaic