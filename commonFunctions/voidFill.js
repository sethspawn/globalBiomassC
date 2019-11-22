/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 27, 2019 [last modified]
  Purpose: Defines voidFill() function that extrapolates the values of edge pixels out to a specified 
           distance. This is done, if necessary, to abate issues that emerge to different masks being used 
           in the creation of various inputs.
  Usage: Source the function and provide parameters.
  Parameters: img: the image to which the function should be applied.
              distance: the distance in meters to which edge values should be extrapolated
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// define the voidFill() function
// adopted from: https://code.earthengine.google.com/a2f3a94c934e683488551bbde177cb9d
var voidFill = function(img, distance){
  var costFillValue = 10000;

  var source = img.mask();
  var cost0 = ee.Image(costFillValue).where(source, 0).cumulativeCost(source, distance);
  var cost1 = ee.Image(costFillValue).where(source, 1).cumulativeCost(source, distance);
  var cost2 = img.unmask(costFillValue).cumulativeCost(source, distance);

  var fill = cost2.subtract(cost0).divide(cost1.subtract(cost0));
  var filled = img.unmask(0).add(fill);

  return filled
}

exports.voidFill = voidFill
