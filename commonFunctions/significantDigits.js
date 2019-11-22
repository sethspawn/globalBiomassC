/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Jun 28, 2019 [last modified]
  Purpose: Defines significantDigits() function which truncates decimal length of pixel values.
  Usage: Source the function and provide parameters.
  Parameters: img: the image to which the function should be applied.
*/

// ==========================================================================================================

// ----------------------------------------------------------------------------------------------------------
// define the significantDigits() function
var significantDigits = function(img){
  img = img.multiply(100).add(0.5).int()
  return img.float().divide(100)
}

exports.significantDigits = significantDigits