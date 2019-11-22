/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines agbc_grassXia() function and it's dependancy (agbAnnual()) which use the Xia et al. 2014 
           model to map grassland AGBC from AVHRR calibrated MODIS imagery circa a prescribed year. The 
           resulting map includes an error layer. Units = MgC/ha.
  Usage: Source the function and provide parameters.
  Parameters: year: the year circa which the final map should represent
              collection: the MODIS imagery collection to which the model should be applied
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var modis_qaMask = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/modisFuncs.js')
    modis_qaMask = modis_qaMask.modis_qaMask

// ----------------------------------------------------------------------------------------------------------
// define function used to calculate agbc circa a prescribed year (+/- 1 year) using a prescribed MODIS imagery
var agbAnnual = function(collection, year){
  
  // get date range (year +/- 1)
  var startDate = ee.Date.fromYMD(ee.Number(year).subtract(1),1 , 1)
  var endDate = ee.Date.fromYMD(ee.Number(year).add(1),12,31)
  
  // create sequence of years
  var years = ee.List.sequence(ee.Number(year).subtract(1), ee.Number(year).add(1));
  
  // filter collection date range and quality mask pixels
      collection = collection.filterDate(startDate, endDate)
      collection = collection.map(modis_qaMask) // Apply QA mask functions to image collections.

  // create annual agb composites with error band
  var annualComposites = ee.ImageCollection.fromImages(
    years.map(function(y){
      
      // get all imgs for given year
      var ndviImg = collection.filter(ee.Filter.calendarRange(y,y,'year')).max().select('NDVI')

      // convert to avhrr equivalent NDVI
      var ndviImg_avhrr = ndviImg.multiply(0.0001)      // unscale
          ndviImg_avhrr = ndviImg_avhrr.multiply(1.04)        // From Fenshold and Proud 2012 (Herbaceous Cover)
          ndviImg_avhrr = ndviImg_avhrr.rename('mean')
      
      // calculate stdDev for avhrr calc
      var ndviImg_avhrr_sd = ndviImg_avhrr.multiply(0.3375)    // standard deviation of slope from prior reference
          ndviImg_avhrr_sd = ndviImg_avhrr_sd.rename('stdDev')
      
      var xia_agb_mean = ((ndviImg_avhrr.pow(2)).multiply(52.2)).add(ndviImg_avhrr.multiply(173.9))
      var xia_agb_sd = ee.Image().expression(
        '(((52.2 * (2 * (s/u) * (u ** 2))) ** 2) + ((173.9 * s) ** 2) + ((agb * 30.3 / 92.4) ** 2)) ** (1/2)', {
          's': ndviImg_avhrr_sd,
          'u': ndviImg_avhrr,
          'agb': xia_agb_mean // UPDATED 6/28/19 to include relative error (RMSE/92.4 [derived from data thief])
        })
      
      // combine mean and error images
      var outImg = xia_agb_mean.addBands(xia_agb_sd).rename(['agb', 'err'])
          outImg = outImg.divide(100) // Convert from gC/m2 to MgC/ha 
      
      return outImg.set('year', y)
    })
  )
  
  return ee.ImageCollection(annualComposites)
} 

// ----------------------------------------------------------------------------------------------------------
// define agbc_grassXia() function
var agbc_grassXia = function(year){   // GET MODIS 16-DAY 250m NDVI COLLECTION
  
  // load image collections
  var terraCollection = ee.ImageCollection('MODIS/006/MOD13Q1')
  var aquaCollection = ee.ImageCollection('MODIS/006/MYD13Q1')
  
  // define projection
  var proj =  ee.ImageCollection('MODIS/006/MOD13Q1').first().projection()

  // apply agbAnnual() function to each collection
  var terraAGB = agbAnnual(terraCollection, year)
  var aquaAGB  = agbAnnual(aquaCollection,  year)
  
  // combine collections
  var allAGB = terraAGB.merge(aquaAGB)
  
  // square error bands so mean can be determined using sumation in quadrature
  var varCollection = allAGB.map(function(img){ // variance
    errImage = img.select('err')
    return errImage.pow(2)
  })
  
  // reduce collections
  var errImage = varCollection.mean().sqrt()
  var avgImage = allAGB.mean().select('agb')
  
  //  recombine and return final maps
  return avgImage.addBands(errImage).rename(['agb', 'err']).reproject({crs: proj})
}

exports.agbc_grassXia = agbc_grassXia
