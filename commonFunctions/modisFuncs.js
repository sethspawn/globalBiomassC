/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Mar 21, 2019 [last modified]
  Purpose: Defines a set of simple functions for use with MODIS imagery
  Usage: Source the function and provide parameters.
  Parameters: image: the MODIS image to which the function should be applied
              year: the year for which imagery should be collected
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// Function to mask poor quality pixels using the MODIS SummaryQA band.
function modis_qaMask(image) {
  var qa = image.select('SummaryQA')
  var mask = qa.eq(0)
  return image.updateMask(mask)
}

exports.modis_qaMask = modis_qaMask

// ----------------------------------------------------------------------------------------------------------
// Function to filter daily modis surface reflectance pixels based on QA band
function modis_qaMaskSR(image) {
  var qa = image.select('QC_250m')                        // get QA band
  var qaBitMask = Math.pow(2, 0)                          // calculate QA threshold from QA bits 
  return image.updateMask(qa.bitwiseAnd(qaBitMask).eq(0)) // filter out poor quality pixels
}

exports.modis_qaMaskSR = modis_qaMaskSR

// ----------------------------------------------------------------------------------------------------------
// Function to calculate NDVI from MODIS 250m surface reflectance bands
function modis_ndviCalc(image){
  return image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('ndvi')
}

exports.modis_ndviCalc = modis_ndviCalc

// ----------------------------------------------------------------------------------------------------------
// Function to filter modis NPP pixels based on QA band
var modis_qaMaskNPP = function(image) {
  var qa = image.select('Npp_QC')
  var qaBitMask = Math.pow(2, 0)
  return image.updateMask(qa.bitwiseAnd(qaBitMask).eq(0))
}

exports.modis_qaMaskNPP = modis_qaMaskNPP

// ----------------------------------------------------------------------------------------------------------
var modis_landMask = function(year){
  var mod = ee.ImageCollection('MODIS/006/MOD44W')
      mod = mod.filterDate(ee.Date.fromYMD(year,1,1), ee.Date.fromYMD(year,12,31))
      mod = ee.Image(mod.first())
      mod = mod.select('water_mask')

  return mod.not().selfMask()
}

exports.modis_landMask = modis_landMask