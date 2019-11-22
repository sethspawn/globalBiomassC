/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Sept 26, 2019 [last modified]
  Purpose: Defines bgb_woodyReichMokany() function and it's dependencies which map woody BGB from AGB using the 
           multiple regression model of Reich et al. (2014) or, when the Reich model was deemed unfit, root-to-
           shoot ratios from Mokany et al. (2006). The appropriate method to be used is determined by the ESA
           CCI landcover map. Output units are the same as those of the input AGB map.
  Usage: Source the function and provide parameters.
  Parameters: imageAGB: the AGB map for which BGB should be mapped 
              imageLC: the ESA CCI landcover map used to dermine the appropriate BGB method.
              origin: dummy variable for regenerative origins of trees (planted = 0, natural = 1)
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// source necessary functions
var biomassToCarbon = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/biomass_Cfrac.js')
    biomassToCarbon = biomassToCarbon.biomassToCarbon 

var significantDigits = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/significantDigits.js')
    significantDigits = significantDigits.significantDigits

// ----------------------------------------------------------------------------------------------------------
// function implementing the Reich et al. model.
var reich = function(imageAGB, imageLC, origin){

      imageAGB = significantDigits(imageAGB)

  // get likely phylogeny from ESA CCI landcover classes
  var phyloClass = imageLC.remap(
    [0,10,11,12,20,30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,120,121,122,130,140,150,151,152,153,160,170,180,190,200,201,202,210],
    [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1])
      
  // convert to probablistic value - derived from aggregate user's accuracy (p) as p*xi + (1/2)(xj + xk)(1-p)
  var phylo = phyloClass.remap(
        [0, 1, 2],
        [0.3375, 0.5, 0.9375]).rename('mean')
        
      // add standard deviation band of probabalistic value
      phylo = phylo.addBands(phyloClass.remap(
        [0, 1, 2],
        [0.2781, 0.2221, 0.4337]).rename('stdDev'))
  
  // mean annual temperature from WorldClim2 (RMSE: 1.12 degrees C from Fick and Heijmans 2017, gridcell mean: -4.212)
  var tmean = ee.Image('users/spawnwisc/FILLED_wc20_bio_30s_011').rename('mean').resample() // bilinear default
  
      // add error (RMSE: 1.12 degrees C from Fick and Heijmans 2017) -- relative error (update 06/27/19)
      tmean = tmean.addBands(tmean.multiply(1.12).divide(4.212059).abs().rename('stdDev'))
      
      tmean = significantDigits(tmean)
  
  // execute model for mean BGB estimate
  var log10BGB_mean = imageAGB.select(0).expression( // Log10 of bgb
  'b0 + b1*phylo +b2*origin + b3*mat + b4*agb + b5*(phylo*origin) + b6*(phylo*(mat-9.1374)) + b7*(phylo*(agb-1.88807)) + b8*(origin*(mat-9.1374)) + b9*(origin*(agb-1.88807)) + b10*((mat-9.1374)*(agb-1.88807)) + b11*(phylo*origin*(mat-8.8508)) + b12*(phylo*origin*(agb-1.88807)) + b13*(phylo*(mat-8.8508)*(agb-1.88807)) + b14*(phylo*(mat-8.8508)*(agb-1.88807))', {
    'agb': imageAGB.select('agb').log10(),
    'phylo': phylo.select('mean'), 
    'origin': ee.Number(origin), 
    'mat': tmean.select('mean'), 
    'b0': -0.18088,
    'b1': 0.0172682,
    'b2': 0.0018117,
    'b3': -0.003032,
    'b4': 0.7940911,
    'b5': -0.000591,
    'b6': -0.001423,
    'b7': -0.031736,
    'b8': -0.000555,
    'b9': 0.021458,
    'b10': 0.0020443,
    'b11': 0.0020594,
    'b12': 0.0269889,
    'b13': 0.0050601,
    'b14': 0.0016555,
  })
  
  // execute model for estimated error of mean estimate
  var log10BGB_stdDev = imageAGB.select(0).expression( // Log10 of bgb
  'b0 + b1*Up + b2*Sp + b3*Uo + b4*Ut + b5*Ua + b6*Sa + b7*Up*Uo + b8*Sp*Uo + b9*Up*Ut + b10*Sp*Ut + b11*Up*Ua + b12*Sp*Ua + b13*Up*Sa + b14*Uo*Ut + b15*Uo*Ua + b16*Uo*Sa + b17*Ut*Ua + b18*Ut*Sa + b19*Up*Uo*Ut + b20*Sp*Uo*Ut + b21*Up*Uo*Ua + b22*Sp*Uo*Ua + b23*Up*Uo*Sa + b24*Up*Ut*Ua + b25*Sp*Ut*Ua + b26*Up*Ut*Sa + b27*Uo*Ut*Ua + b28*Uo*Ut*Sa', {
    'Ua': imageAGB.select('agb').log10().pow(2),
    'Up': phylo.select('mean').pow(2), 
    'Uo': ee.Number(origin).pow(2), 
    'Ut': tmean.select('mean').pow(2), 
    'Sa': imageAGB.select('err').log10().pow(2),
    'Sp': phylo.select('stdDev').pow(2),
    'So': ee.Number(0).pow(2),
    'St': tmean.select('stdDev').pow(2),
    'b0': 4.44E-04,
    'b1': 3.08E-05,
    'b2': 2.98E-04,
    'b3': 2.80E-05,
    'b4': 3.18E-07,
    'b5': 2.69E-03,
    'b6': 6.31E-01,
    'b7': 3.33E-05,
    'b8': 3.49E-07,
    'b9': 3.23E-07,
    'b10': 2.02E-06,
    'b11': 1.10E-04,
    'b12': 1.01E-03,
    'b13': 1.01E-03,
    'b14': 3.29E-07,
    'b15': 1.04E-04,
    'b16': 4.60E-04,
    'b17': 1.34E-06,
    'b18': 4.18E-06,
    'b19': 3.20E-07,
    'b20': 4.24E-06,
    'b21': 1.20E-04,
    'b22': 7.28E-04,
    'b23': 7.28E-04,
    'b24': 1.43E-06,
    'b25': 2.56E-05,
    'b26': 2.56E-05,
    'b27': 1.45E-06,
    'b28': 2.74E-06
  }).sqrt()
  
  var log10BGB = log10BGB_mean.addBands(log10BGB_stdDev)
  
  // return antilog10 of log10 transformed model output
  return ee.Image(10).pow(log10BGB).rename(['bgb', 'err']) //anti log10
}

// ----------------------------------------------------------------------------------------------------------
// function calling the reich model after deliniating probable planted vs natural origin.
var bgb_woodyReich = function(imageAGB, imageLC){
  
  // load ifl extent
  var ifl = ee.Image('users/spawnwisc/IFL_2013_esacci')
  
  // load sdpt extent and probability
  var sdpt = ee.Image('users/spawnwisc/finalGlobal/sdpt_bin')
  var sdpt_prob = ee.Image('users/spawnwisc/finalGlobal/sdpt_planted_int').divide(100)
      sdpt_prob = sdpt_prob.updateMask(sdpt)

  // load probability of planted trees
  var gfa_planted_prob = ee.Image('users/spawnwisc/finalGlobal/adjGFA_planted_int')
  
  // create layers describing the proability of planted vs natural trees in each gridcell
  var planted_prob = gfa_planted_prob.unmask(50).divide(100)
      planted_prob = planted_prob.where(sdpt_prob.gt(0), sdpt_prob)
      planted_prob = planted_prob.where(ifl.gt(0), 0)

  var natural_prob = planted_prob.mask().subtract(planted_prob)
  
  // call function to get planted and natural estimates and weight accordingly
  var planted = reich(imageAGB, imageLC, 0).multiply(planted_prob)

  var natural = reich(imageAGB, imageLC, 1).multiply(natural_prob)

  // calculate average value and error
  var err = ((natural.select('err').pow(2)).add(planted.select('err').pow(2))).sqrt()
  
  var avg = natural.add(planted)
      avg = avg.select('bgb').addBands(err)
  
  return avg
  
}

exports.bgb_woodyReich = bgb_woodyReich


//=====================================================================================================
var bgb_woodyMokany_shrub = function(imageAGB){
  var bgb_mean = imageAGB.select('agb').multiply(1.837)
  var bgb_sd = imageAGB.select(0).expression(
    'BGB * ((agb/AGB)**2 + (rs/RS)**2) ** (1/2)',{
      'BGB': bgb_mean,
      'agb': imageAGB.select('err'),
      'AGB': imageAGB.select('agb'),
      'rs': 0.589, // SE of shrubland R:S (Mokany et al. 2006)
      'RS': 1.837 // Mean shrubland R:S (Mokany et al. 2006)
    })
  return bgb_mean.addBands(bgb_sd).rename(['bgb', 'err'])
}

//=====================================================================================================
var bgb_woodyMokany_savannah = function(imageAGB){
  var bgb_mean = imageAGB.select('agb').multiply(0.642)
  var bgb_sd = imageAGB.select(0).expression(
    'BGB * ((agb/AGB)**2 + (rs/RS)**2) ** (1/2)',{
      'BGB': bgb_mean,
      'agb': imageAGB.select('err'),
      'AGB': imageAGB.select('agb'),
      'rs': 0.111, // SE of shrubland R:S (Mokany et al. 2006)
      'RS': 0.642 // Mean shrubland R:S (Mokany et al. 2006)
    })
  return bgb_mean.addBands(bgb_sd).rename(['bgb', 'err'])
}

//=====================================================================================================
var bgb_woodyReichMokany = function(imageAGB, imageLC){
  
  //carbon fraction for threshold
  
  // reclassify landcover by method to be used
  var lcMethod = imageLC.remap(
    [ 0,10,11,12,20,30,40,50,60,61,62,70,71,72,80,81,82,90,100,110,120,121,122,130,140,150,151,152,153,160,170,180,190,200,201,202,210],
    [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,-1,-1,-1,-1,-1,-1,-1, -1, -1, -3, -3, -3, -1, -1, -1, -2, -3, -2, -1, -1, -3, -1, -1, -1, -1, -1])
  
  // apply reich method to all land with the exception of shrubland and open broadleaf (savannah) classes
  var reichAGB = imageAGB.updateMask(lcMethod.eq(-1))
  var reichBGB = bgb_woodyReich(reichAGB, imageLC)
  
  // apply mokany root:shoot for open broadleaf (savannah) classes
  var savannahAGB = imageAGB.updateMask(lcMethod.eq(-2))
  var savannahBGB = bgb_woodyMokany_savannah(savannahAGB)
  
  // conditionally apply mokany to shrubland areas
  var shrubAGB = imageAGB.updateMask(lcMethod.eq(-3))
  
  // create shrub threshold image (any shrub greater than 85 Mg/ha is treated as forest)
  var threshImg = biomassToCarbon(ee.Image(85).addBands(ee.Image(0)).rename(['agb', 'err']),imageLC)
  
  // if shrub biomass is greater than 85 Mg/ha (i.e. Bouvet et al. threshold) assume misclassified as shrub - use reich
  var shrubAGBasForestAGB = shrubAGB.updateMask(shrubAGB.select('agb').gte(threshImg.select('agb'))) // amazon and east africa
  var shrubAGBasForestBGB = bgb_woodyReich(shrubAGBasForestAGB, imageLC)
  
  // otherwise apply shrubland method
      shrubAGB = shrubAGB.updateMask(shrubAGB.select('agb').lt(threshImg.select('agb')))
  var shrubBGB = bgb_woodyMokany_shrub(shrubAGB)
  
  // combine both shrub methods using first non null reducer
  var shrubMosaic = ee.ImageCollection([shrubAGBasForestBGB, shrubBGB]).reduce(ee.Reducer.firstNonNull()).rename(['bgb', 'err'])
  
  // combine all bgb estimates using first non null reducer
  var mosaic = ee.ImageCollection([reichBGB, savannahBGB, shrubMosaic]).reduce(ee.Reducer.firstNonNull())
  
  return mosaic.rename(['bgb', 'err'])
}

exports.bgb_woodyReichMokany = bgb_woodyReichMokany

var imageLC= ee.Image('users/spawnwisc/ESACCI-LC-L4-LCCS-Map-300m-P1Y-1992_2015-v207').select('b19') // 2010

var threshImg = biomassToCarbon(ee.Image(85).addBands(ee.Image(0)).rename(['agb', 'err']),imageLC)
// Map.addLayer(threshImg)