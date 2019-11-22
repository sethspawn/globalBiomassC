/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 7, 2019 [last modified]
  Purpose: Defines agbc_tundraBerner() function and its dependencies that maps tundra plant AGBC by applying
           the Berner et al. 2018 model to TM/ETM+ calibrated MODIS imagery for the pan-arctic. Units = MgC/ha.
  Usage: Source the function and provide parameters.
  Parameters: year: year circa which the tundra AGB map should represent
              collection: MODIS imagery collection to which the model should be applied
              a: TM/ETM+ callibration intercept coefficient
              B: TM/ETM+ callibration slope coefficient
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var modis_qaMaskSR = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/modisFuncs.js').modis_qaMaskSR
var modis_ndviCalc = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/modisFuncs.js').modis_ndviCalc
var modis_landMask = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/modisFuncs.js').modis_landMask


// ----------------------------------------------------------------------------------------------------------
// function to calculate 80th percentile NDVI composite (following Berner et al. 2018)
var perc80_comp = function(collection){
  
  // Calculate 80th percentile of growing season ndvi
  var ndvi80 = collection.reduce(ee.Reducer.percentile([80]))//.select('ndvi_p80')
  
  // Add band describing pixels proximity to 80th percentile value
  // Calculate absolute difference, multipy by -1 so closes pixel have highest value and shift so max possible value is 1
  var ndviProx80 = collection.map(function(img){
    var proxScore = img.select('ndvi').subtract(ndvi80).abs().multiply(-1).add(1).rename('prox80')
    return img.addBands(proxScore)
  })
  
  return ndviProx80.qualityMosaic('prox80').select('ndvi')
}

// ----------------------------------------------------------------------------------------------------------
// function used to calculate annual 80th percentile NDVI composites using perc80_comp() 
var annual_ndvi = function(collection, year, a, B){
  var startDate = ee.Date.fromYMD(year, 6, 15)
  var endDate = ee.Date.fromYMD(year, 8, 31)
  
      collection = collection.filterDate(startDate, endDate)
      collection = collection.map(modis_qaMaskSR)

  var collection_ndvi = collection.map(modis_ndviCalc)
  
  // MODIS to TM/ETM+ NDVI correction:
  var ls_ndvi = collection_ndvi.map(function(img){
    return (img.multiply(B)).add(a).rename('ndvi')
  })
  
  // // return 80th percentile composite
  return perc80_comp(ls_ndvi)

}

// ----------------------------------------------------------------------------------------------------------
// function used to map tundra AGBC circa (year +/- 1) a prescribed year.
var agbc_tundraBerner = function(year){
  
  // final value will be three year mean centered on specified year
  var years = ee.List.sequence(ee.Number(year).subtract(1), ee.Number(year).add(1));
  
  // load MODIS collections
  var terraCollection = ee.ImageCollection('MODIS/006/MOD09GQ')
  var aquaCollection = ee.ImageCollection('MODIS/006/MYD09GQ')
  
  // get MODIS projection
  var proj = ee.ImageCollection('MODIS/006/MOD09GQ').first().projection()
  
  // create distribution of images from MODIS aqua and terra treating as TM and ETM+ 
  var ndviCollection = years.map(function(y){
    var terra_tm  = annual_ndvi(terraCollection, y, -0.012, 1.002)
    var terra_etm = annual_ndvi(terraCollection, y, -0.013, 1.023)
    var aqua_tm   = annual_ndvi(aquaCollection,  y, -0.012, 1.002)
    var aqua_etm  = annual_ndvi(aquaCollection,  y, -0.013, 1.023)
    
    return ee.List([terra_tm, terra_etm, aqua_tm, aqua_etm])
  })
      ndviCollection = ee.ImageCollection(ndviCollection.flatten())
  
  // create annual maps of AGBC (and error) from each annual NDVI composite
  var agbCollection = ndviCollection.map(function(img){
    
    // Apply Berner et al. 2018 Model for "plant" biomass
    var agb_mean = img.expression(
      'A * exp ** (B * ndvi)', {
        'exp': ee.Image(2.718281828459045),
        'ndvi': img.select('ndvi'),
        'A': 0.02526,
        'B': 5.32
      }).rename('agb')
    
    // Propogate error
    var agb_sd = img.expression(
      'agb * ((((a/A) ** 2) + ((b * ndvi)**2)) **2 )',{
        'agb': agb_mean,
        'ndvi': img.select('ndvi'),
        'a': 0.013075,
        'A': 0.02526,
        'b': 0.715
      }).rename('err')
    
    return agb_mean.addBands(agb_sd)
  })
  
  // calculate mean and error from collection
  var agb_mean = agbCollection.mean().select('agb')
  var agb_err = agbCollection.map(function(img){
    return img.select('err').pow(2)
  }).mean().sqrt().rename('err')
  
  // convert to carbon stock using boreal angiosperm value from Martin et al. (2018)
  var agbc_mean = agb_mean.multiply(0.492)
  var agbc_err = agb_err.expression(
    'AGBC * ((c/C)**2 + (agb/AGB)**2)**(1/2)', {
      'AGBC': agbc_mean,
      'c': 0.008,
      'C': 0.492,
      'agb': agb_err,
      'AGB': agb_mean
    }).rename('err')

  // combine and convert to MgC/ha
  var outImg = agbc_mean.addBands(agbc_err)
      outImg = outImg.multiply(10) // convert from kgC/m2 to MgC/ha
  
  // mask out water and set projection
  return outImg.updateMask(modis_landMask(year)).reproject({crs: proj})
}

exports.agbc_tundraBerner = agbc_tundraBerner
