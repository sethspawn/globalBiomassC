/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Mar 20, 2019 [last modified]
  Purpose: Defines modis_NPPtrend() function and it's dependancies which calculate the mean NPP change
           throughout the entire MODIS NPP timeseries using a monte carlo method to further estimate the 
           error associated with each pixel's mean estimate. Change calculated as Sen Slope estimator.
  Usage: Source the function and provide parameters.
  Parameters: iter: the number of interations to be used for resampling.
              inList: list of random numbers
              outList: list to be filled with images from the iterations
              collection: collection of MODIS NPP imagery to which a year band should be added
              min: lower bound of range between which random numbers should be generated
              max: upper bound of range between which random numbers should be generated 
              xMin: lower bound of range between which random numbers should be generated in each iteration
              xMax: upper bound of range between which random numbers should be generated in each iteration
              nMin: minimum length of randomly generated list
              nMax: maximum length of randomly generated list
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// creates a list (length = n) of random integers inclusively between min and max with no duplication
function randomSubarray(min, max, size) {
    var arr = Array.apply(null, {length: max + 1}).map(Number.call, Number).slice(min);
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return ee.List(shuffled.slice(0, size));
}

// ----------------------------------------------------------------------------------------------------------
// creates a list (lenth = count) countaining variable length lists of random integers
var randomIndiciesNoRep = function(xMin, xMax, nMin, nMax, count){
  var list = ee.List([])
  var nMin = Math.ceil(nMin);   // min acceptable value of list element 
  var nMax = Math.floor(nMax);  // max possible value of list element
    for (var i = 0; i<count; i++){
      var n1 = Math.floor(Math.random() * (nMax - nMin + 1)) + nMin
      var ls = randomSubarray(xMin, xMax, n1)
      var list = ee.List(list).add(ls)
    }
  return list
}

// ----------------------------------------------------------------------------------------------------------
// adds a year band to npp images for slope calculation
var yearBand = function(collection){
  collection = collection.toList(collection.size())
  collection = collection.map(function(img){
    return ee.Image(img).addBands(ee.Image(collection.indexOf(img)).int8().rename('year'))
  })
  return ee.ImageCollection(collection)
}

// ----------------------------------------------------------------------------------------------------------
// iterating function to calcuclate senslope on subsets of NPP collection 
var bootstrapSenSlope = function(inList, outList){
  var npp = ee.ImageCollection('MODIS/055/MOD17A3')
      npp = npp.filterDate(ee.Date.fromYMD(2000,1,1), ee.Date.fromYMD(2015,12,31))
      npp = npp.map(function(img){
        return img.select('Npp').multiply(0.0001).multiply(10) // MgC/ha/yr
      })
      npp = yearBand(npp) 
      npp = npp.toList(npp.size()) // convert to list for subsetting
  
  // subset based on positions specified by random list
  var subset = ee.ImageCollection(ee.List(inList).map(function(e){return npp.get(e)}))
  
  // Theil-Sen nonparamentric slope - less sensitive to outliers than OLS
  var senSlope = subset.select(['year', 'Npp']).reduce(ee.Reducer.sensSlope())
  
  return ee.List(outList).add(ee.Image(senSlope))
}

// ----------------------------------------------------------------------------------------------------------
// calculate NPP trend and error from 2000-2015 (full time series)
var modis_NPPtrend = function(iter){
  
  // create list of random positions for iterating
  var sampleList = randomIndiciesNoRep(0, 14, 2, 15, iter)

  // iterate through sample list to generate 1000 senSlope estimates
  var outList = ee.List([])
  var senSlopes = ee.ImageCollection(ee.List(sampleList.iterate(bootstrapSenSlope, outList)))

  // calculate summary images
  var senSlope_mean = senSlopes.mean().select('slope')
  var senSlope_sd = senSlopes.reduce(ee.Reducer.stdDev()).select('slope_stdDev')

  return senSlope_mean.addBands(senSlope_sd)
}

exports.modis_NPPtrend = modis_NPPtrend