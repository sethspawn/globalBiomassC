/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines bgb_tundraWang() that maps tudra BGB from an AGB map using the model of Wang et al. 2016.
           The function also includes a threshold beyond which biomass is ussumed to be trees instead of 
           tundra plants (this is necessary do to confusion near the biome border). If the vegetation is
           assumed to be trees either according to the ESA CCI landcover map or due to the threshold, the
           Riech method is implemented using bgb_woodyReich(). Output units match those of the input.
  Usage: Source the function and provide parameters.
  Parameters: image: AGB image for which BGB should be calcualted
              landcover: ESA CCI landcover map 
              treeThresh: maximum biomass value for which vegetation should be considered "tundra plants".
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source needed functions
var bgb_woodyReich = require('users/spawnwisc/globalBiomass:finalGlobal/layers/woody/bgb/bgb_woodyReichMokany.js')
    bgb_woodyReich = bgb_woodyReich.bgb_woodyReich

var significantDigits = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/significantDigits.js')
    significantDigits = significantDigits.significantDigits

// ----------------------------------------------------------------------------------------------------------
// defines bgb_tundraWang that calculates BGB from AGB.
var bgb_tundraWang =  function(image, landcover, treeThresh){
  
      image = significantDigits(image)

  var tree = landcover.remap(
    [30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,160,180],
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 ,-1 ,-1 ,-1 ])
      tree = landcover.mask().updateMask(tree.eq(-1))
  
  // if tundra area is classified as forest or agb value is greater than threshold value -> tree    
  var asTree = image.updateMask(tree.eq(1).or(image.gt(ee.Number(treeThresh).multiply(0.492))))
  
  // otherwise treat as tundra plants
  var asTundra = image.updateMask(asTree.mask().not())

  // mean annual temperature from WorldClim2 (RMSE: 1.12 degrees C from Fick and Heijmans 2017, gridcell mean: -4.212)
  var mat = ee.Image('users/spawnwisc/FILLED_wc20_bio_30s_011').resample().rename('mean') // bilinear default
      mat = mat.addBands(mat.multiply(1.12).divide(4.212059).abs().rename('err')) // relative sd
  
      mat = significantDigits(mat)

  //slope −0.042 ± 0.021, intercept 1.01 ± 0.21 from Wang et al. 2016 (ERL)
  var rs_mean = mat.select('mean').multiply(-0.042).add(1.01).exp()
  var rs_sd = mat.expression(
    '((((B * MAT) * ((b/B)**2 + (m/MAT)**2))**2) + (a**2))**(1/2)', {
      'MAT': mat.select('mean'),
      'm':  mat.select('err'), 
      'B': -0.042,
      'b':  0.021,
      'a':  0.21
    })
  
      rs_mean = significantDigits(rs_mean)
      rs_sd = significantDigits(rs_sd)

  // calculate bgb using equation from Wang et al. 2016 
  var tundra_bgb_mean = asTundra.select('agb').multiply(rs_mean)
  var tundra_bgb_sd = asTundra.select('err').expression(
    'BGB * ((a/AGB)**2 + (r/R) ** 2) ** (1/2)',{
      'BGB': tundra_bgb_mean,
      'AGB': asTundra.select('agb'),
      'a': asTundra.select('err'),
      'R': rs_mean,
      'r': rs_sd
    })
  
  var asTundra_bgb = tundra_bgb_mean.addBands(tundra_bgb_sd).rename(['bgb', 'err'])

  // if tree, use Reich only (no Mokany)
  var asTree_bgb = bgb_woodyReich(asTree, landcover)
  
  var outImg = ee.ImageCollection([asTundra_bgb, asTree_bgb])
      outImg = outImg.reduce(ee.Reducer.firstNonNull()).rename(['bgb', 'err'])

  return outImg
}

exports.bgb_tundraWang = bgb_tundraWang
