#
# Author: Seth Spawn (spawn@wisc.edu)
# Date: May 13, 2019 [last modified]
# Purpose: Creates raster layers reporting above and belowground biomass carbon density in the annual
#          herabaceous crops of global croplands. Biomass carbon density is calcualted as NPP from 
#          globally gridded crop yields circa 2000 (Monfreda et al. 2008) using the methods and parameters
#          of Wolf et al. (2015) and Monfreda et al. (2008). Raster values represent the area-wieghted 
#          average of any combination of crop-specific estimates for 70 globally distributed crops that 
#          may occupy a given 8km grid cell. The confounding effects of multiply harvest on estimated 
#          peak biomass were corrected by normalizing total biomass caron denisty estimates by a cropping
#          frequency index for each gridcell. The final layers were then uploaded to google earth engine
#          to be calibrated to 2010 conditions and for subsequent integration.
# Usage: Update the imput file path's and execute the script.
# Inputs: Global Crop Yield Rasters: http://www.earthstat.org/harvested-area-yield-175-crops/
#         Global Harvested Area Rasters: http://www.earthstat.org/harvested-area-yield-175-crops/
#         Global Cropland Area Raster: http://www.earthstat.org/cropland-pasture-area-2000/
#         Crop Specific Parameters: Monfreda et al. (2008), Wolf et al. (2015), Summarized in Spawn et al. (in Review)
# Outputs: agbc_crop_Monfreda_MgCha_8km_final.tif - Global Raster of Cropland AGBC (UNITS = MgC/ha)
#          bgbc_crop_Monfreda_MgCha_8km_final.tif - Global Raster of Cropland BGBC (UNITS = MgC/ha)
#
#=======================================================================================================

rm(list = ls())

require(raster)
require(rgdal)
require(plyr)

#-------------------------------------------------------------------------------------------------------
# prepare to filter crops to herbaceous annuals; determine their relative extent

setwd('D:/Global Crops/HarvestedAreaYield175Crops_Geotiff')

# get crop types to filter the collection 175 crops
crop.types = read.csv('Updated_NPP_Params175.csv', header = T, stringsAsFactors = F)
crop.types$Group[which(crop.types$Group == 'corage')] = 'forage'
crop.types$Group[which(crop.types$Group == 'cruit')] = 'fruit'

# make data frame containing crop, type and coeffs
crops = unique(list.files(recursive = T, pattern = '_HarvestedAreaHectares.tif$'))
crops = as.character(do.call(rbind.data.frame, (strsplit(crops, '_')))[,1])
crops = data.frame(crop.id = crops)
crops = join(crops, crop.types, by = 'crop.id')

# filter crops to just retain herbaceous annuals (alfalfa and clover considered perennials)
groups_inc = c('cereals', 'oil crops','forage', 'fiber', 'pulses', 'sugar crops', 'roots and tubers')
herbAnnual_crops = crops[which((crops$Group %in% groups_inc) & crops$Herbaceous.Shrub.Tree == 'herbaceous'),]
herbAnnual_crops = herbAnnual_crops[-which(herbAnnual_crops$crop.id %in% c('alfalfa', 'clover')),]

rm(list = c('groups_inc', 'crop.types', 'crops'))

#-------------------------------------------------------------------------------------------------------

# get file names of all rasters
Yield175 = unique(list.files(recursive = T, pattern = '_YieldPerHectare.tif$'))
FracArea175 = unique(list.files(recursive = T, pattern = '_HarvestedAreaFraction.tif$'))

# Create layer of total cropland per gridcell; load it.
frac.area = stack(FracArea175)
tot.frac.area = stackApply(frac.area, rep(1, length(FracArea175)), fun = sum)
writeRaster(tot.frac.area, 'TotalFractionalArea.tif', format = 'GTiff')
rm(frac.area)
tot.frac.area = raster('TotalFractionalArea.tif')

# Create data frame with crop-specific parameters
crops = as.character(do.call(rbind.data.frame, (strsplit(Yield175, '_')))[,1])
params = as.data.frame(cbind(crop.id = crops, yield = Yield175, frac = FracArea175))
herbAnnual_params = join(params, herbAnnual_crops, by = 'crop.id', type = 'left')
herbAnnual_params = herbAnnual_params[complete.cases(herbAnnual_params),]

# Create empty stacks to which crop-specific biomass layers will output
agb.lyrs = stack()
bgb.lyrs = stack()

# Make agbc and bgbc density layers for each crop (n = 70), output to stack
for(i in 1:nrow(herbAnnual_params)){
  
  # select a crop and it's associated parameters
  x = herbAnnual_params[i,] 
  
  # load that crop's rasters
  r.yield = raster(as.character(x$yield)) # Yield raster for select crop (Mg/ha)
  r.area = raster(as.character(x$frac)) # Fraction of gridcell represented by crop
  
  r.w.area = r.area/tot.frac.area # Fraction of gridcell crop area represented by crop
  
  # Extract Raster Value
  r.y = getValues(r.yield)     # Mg/ha
  r.a = getValues(r.w.area)    # Fraction of cultivated fraction of pixel
  
  # Calculate agbc
  Ydw = r.y * x$DMh                           # dry yield
  Yc = Ydw * x$CCdm                           # yield in units carbon
  Hdw = Ydw + (Ydw * 0.025)                   # harvestable dry mass (Assuming 2.5% loss)
  Hc = Hdw * x$CCdm                           # harvesetable dry in units carbon
  AGBdw = Hdw/x$HI                            # aboveground biomass in units dry mass
  RESc = ((AGBdw - Hdw) * 0.44) + (Hc - Yc)   # carbon in residue
  AGBc = RESc + Yc                            # aboveground biomass c
  wieghted.AGBc = AGBc* r.a                   # weight value relative to occupied area of corresponding pixel
  
  # Calculate bgbc
  BGBc = AGBdw * x$RS * 0.44                  # belowground biomass C
  weighted.BGBc = BGBc * r.a                  # weight value relative to occupied area of corresponding pixel
  
  # Create new agbc and bgbc rasters
  agb.r = setValues(r.yield, wieghted.AGBc) 
  bgb.r = setValues(r.yield, weighted.BGBc) 
  
  # Add new rasters to their respective stacks
  agb.lyrs = addLayer(agb.lyrs, agb.r)
  bgb.lyrs = addLayer(bgb.lyrs, bgb.r)
  
}

# calculate sum of weightd raster values to get total biomass C density of annual herbacous crops
agb.c = stackApply(agb.lyrs, rep(1, nrow(herbAnnual_params)), fun = sum)
bgb.c = stackApply(bgb.lyrs, rep(1, nrow(herbAnnual_params)), fun = sum)


#-------------------------------------------------------------------------------------------------------
# Correct for multi cropping by assuming that total fractional acreas (e.g. 1.2) 
# divided by actual cropland fraction of grid cell (e.g. 0.6) = cropping frequency.
# Divide by cropping frequency (if greater than 1) to estimate peak biomass.

### Calculate cropping frequency
setwd('D:/CroplandPastureArea2000_Geotiff/CroplandPastureArea2000_Geotiff')
ramankutty.area = raster('cropland2000_area.tif')

# match raster extents
extent(tot.frac.area)
extent(ramankutty.area) = extent(tot.frac.area)

# calculate croping frequency index (if less than 1, set to 1 - e.g. single harvest)
multi = tot.frac.area/ramankutty.area
multi.v = getValues(multi)
multi.v[which(multi.v < 1)] = 1
multi = setValues(multi, multi.v)

# Calculate final crop biomass
final.agb.c = agb.c/multi
final.bgb.c = bgb.c/multi

# Write final raster
setwd('D:/Global Crops/HarvestedAreaYield175Crops_Geotiff')
writeRaster(final.agb.c, 'agbc_crop_Monfreda_MgCha_8km_final.tif', format = 'GTiff', overwrite = T)
writeRaster(final.bgb.c, 'bgbc_crop_Monfreda_MgCha_8km_final.tif', format = 'GTiff', overwrite = T)
