/*
  Author: Seth Spawn (spawn@wisc.edu)
  Date: Sept 26, 2019 [last modified]
  Purpose: Master script that sequentially sources and runs each function in the necessary order. The end products 
           are global maps of above and belowground biomass carbon maps that consistently represent conditions 
           in the year 2010 with a 300m spatial resolution.
  Usage: Each block of code (e.g. Steps 1, 2, 3, 4, and 5) must each be run seperately and in sequence. I.e. step 2 
         creates maps that are the input to step three, and so on. As such it will require at least 5 seperate runs of
         this script to generate the final biomass carbon maps. When running a given step, I recommend that you comment 
         out the subsequent steps to avoid error messages. 
  Naming Convention: [stock]_[landcover]_[source]_[units]_[resolution] --- used when creating indivual biomass layers
  Parameters: Parameters are those defined in the referenced scripts for each function.
*/

//=============================================================================================//
// STEP 1. PREPARE AND LOAD COMMON INPUTS======================================================//
//=============================================================================================//

var year = 2010 // representative year to be passed to all functions

var landcover = ee.Image('users/spawnwisc/ESACCI-LC-L4-LCCS-Map-300m-P1Y-1992_2015-v207').select('b19') // 2010

var exportAsset300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/exportAsset300m.js')
    exportAsset300m = exportAsset300m.exportAsset300m

var aggregate300m = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/aggregate300m.js')
    aggregate300m = aggregate300m.aggregate300m

var biomassToCarbon = require('users/spawnwisc/globalBiomass:finalGlobal/commonFunctions/biomass_Cfrac.js')
    biomassToCarbon = biomassToCarbon.biomassToCarbon 

//=============================================================================================//
// STEP 2. PREPROSESS AND PREPARE INDEPENDENT AGBC LAYERS =====================================//
//=============================================================================================//

// WOODY =================================================

// GLOBBIOMASS AGBC --------------------------------------
// ----- prepare AGB mosiac from tiles (inc. error layer)
var agb_woodyGlobbiomass = require('users/spawnwisc/globalBiomass:finalGlobal/layers/woody/agb/agb_woodyGlobbiomass.js')
    agb_woodyGlobbiomass = agb_woodyGlobbiomass.agb_woodyGlobbiomass
agb_woodyGlobbiomass('finalGlobal/rawData/agb_woody_globbiomass_Mgha_100m') 
var agb_woody_globbiomass_Mgha_100m = ee.Image('users/spawnwisc/finalGlobal/rawData/agb_woody_globbiomass_Mgha_100m')

// -----  convert to C stock and aggregate to 300m resolution
aggregate300m(biomassToCarbon(agb_woody_globbiomass_Mgha_100m, landcover), 'finalGlobal/agbc_woody_globbiomass_MgCha_300m', true)


// BOUVET AGBC -------------------------------------------
// ----- prepare AGB mosiac from tiles (inc. error layer)
var agb_woodyBouvet = require('users/spawnwisc/globalBiomass:finalGlobal/layers/woody/agb/agb_woodyBouvet.js')
    agb_woodyBouvet = agb_woodyBouvet.agb_woodyBouvet
agb_woodyBouvet('finalGlobal/rawData/agb_woody_bouvet_Mgha_50m') 
var agb_woody_bouvet_Mgha_50m = ee.Image('users/spawnwisc/finalGlobal/rawData/agb_woody_bouvet_Mgha_50m')

// ADDING RMSE (17.0 Mg/ha,) ERROR LAYER FOR NOW... (UPDATE: Adding error relative to validation mean instead 06/28/2019)
    agb_woody_bouvet_Mgha_50m = agb_woody_bouvet_Mgha_50m.addBands(agb_woody_bouvet_Mgha_50m.multiply(17.0).divide(58.2).updateMask(agb_woody_bouvet_Mgha_50m.mask()))
    agb_woody_bouvet_Mgha_50m = agb_woody_bouvet_Mgha_50m.rename(['agb', 'err'])

// -----  convert to C stock and aggregate to 300m resolution
aggregate300m(biomassToCarbon(agb_woody_bouvet_Mgha_50m, landcover), 'finalGlobal/agbc_woody_bouvet_MgCha_300m', true)


// GRASS =================================================

// XIA AGBC ----------------------------------------------
// ----- prepare AGB layer from NDVI model (inc. error from RMSE, sensor conversion, & 3 years aqua/terra (6 composites))
var agbc_grassXia = require('users/spawnwisc/globalBiomass:finalGlobal/layers/grass/agbc_grassXia.js')
    agbc_grassXia = agbc_grassXia.agbc_grassXia
var agbc_grass_xia_MgCha_250m = agbc_grassXia(year)

// ----- aggregate AGB to 300m resolution
aggregate300m(agbc_grass_xia_MgCha_250m, 'finalGlobal/agbc_grass_xia_MgCha_300m', true)


// TUNDRA ================================================

// BERNER AGBC -------------------------------------------
// ----- prepare AGB layer from NDVI model (inc. error from coeff errors, TM/ETM+, & 3 years aqua/terra (6 composites))
var agbc_tundraBerner = require('users/spawnwisc/globalBiomass:finalGlobal/layers/tundra/agbc_tundraBerner.js')
var agbc_tundraBerner = agbc_tundraBerner.agbc_tundraBerner
var agbc_tundra_berner_MgCha_250m = agbc_tundraBerner(year)

// ----- aggregate AGB to 300m resolution // UPDATE TUNDRA TO HAVE C FRAC BUILT IN
aggregate300m(agbc_tundra_berner_MgCha_250m, 'finalGlobal/agbc_tundra_berner_MgCha_300m', true)


// CROP ==================================================

// MONFREDA + NPP TREND AGBC -----------------------------
var agbc_cropNPP = require('users/spawnwisc/globalBiomass:finalGlobal/layers/crop/agbc_cropNPP.js')
    agbc_cropNPP = agbc_cropNPP.agbc_cropNPP
agbc_cropNPP(2010, 'finalGlobal/agbc_crop_monfredaNPP_MgCha_300m')


//=============================================================================================//
// STEP 3. PREPROSESS AND PREPARE INDEPENDENT BGBC LAYERS =====================================//
//=============================================================================================//

// LOAD AGB LAYERS FROM STEP 2 ===========================
var agbc_woody_globbiomass_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_woody_globbiomass_MgCha_300m')
var agbc_woody_bouvet_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_woody_bouvet_MgCha_300m')
var agbc_grass_xia_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_grass_xia_MgCha_300m')
var agbc_tundra_berner_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_tundra_berner_MgCha_300m')
var agbc_crop_monfredaNPP_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_crop_monfredaNPP_MgCha_300m')

// WOODY =================================================

// GLOBIOMASS REICH MOKANY BGBC --------------------------
var bgb_woodyReichMokany = require('users/spawnwisc/globalBiomass:finalGlobal/layers/woody/bgb/bgb_woodyReichMokany2.js')
    bgb_woodyReichMokany = bgb_woodyReichMokany.bgb_woodyReichMokany
var bgbc_woody_reichMokanyGlobiomass_MgCha_300m = bgb_woodyReichMokany(agbc_woody_globbiomass_MgCha_300m, landcover)
exportAsset300m(bgbc_woody_reichMokanyGlobiomass_MgCha_300m, 'finalGlobal/bgbc_woody_reichMokanyGlobiomass_MgCha_300m_2')


// BOUVET REICH MOKANY BGBC ------------------------------
var bgbc_woody_reichMokanyBouvet_MgCha_300m = bgb_woodyReichMokany(agbc_woody_bouvet_MgCha_300m, landcover)
exportAsset300m(bgbc_woody_reichMokanyBouvet_MgCha_300m, 'finalGlobal/bgbc_woody_reichMokanyBouvet_MgCha_300m_2')


// GRASS =================================================

// MOKANY BGBC -------------------------------------------
var bgb_grassMokany = require('users/spawnwisc/globalBiomass:finalGlobal/layers/grass/bgb_grassMokany.js')
    bgb_grassMokany = bgb_grassMokany.bgb_grassMokany
var bgbc_grass_mokany_MgCha_300m = bgb_grassMokany(agbc_grass_xia_MgCha_300m)
exportAsset300m(bgbc_grass_mokany_MgCha_300m, 'finalGlobal/bgbc_grass_mokany_MgCha_300m')


// TUNDRA ================================================

// WANG BGBC ---------------------------------------------
var bgb_tundraWang = require('users/spawnwisc/globalBiomass:finalGlobal/layers/tundra/bgb_tundraWang.js')
var bgb_tundraWang = bgb_tundraWang.bgb_tundraWang
var bgbc_tundra_wang_MgCha_300m = bgb_tundraWang(agbc_tundra_berner_MgCha_300m, landcover, 25)
exportAsset300m(bgbc_tundra_wang_MgCha_300m, 'finalGlobal/bgbc_tundra_wang_MgCha_300m')


// CROP ==================================================

// MONFREDA + NPP TREND AGBC -----------------------------
var bgbc_cropNPP = require('users/spawnwisc/globalBiomass:finalGlobal/layers/crop/bgbc_cropNPP.js')
    bgbc_cropNPP = bgbc_cropNPP.bgbc_cropNPP
bgbc_cropNPP(2010, 'finalGlobal/bgbc_crop_monfredaNPP_MgCha_300m')


// LOAD FINALIZED LAYERS =================================

var bgbc_woody_globbiomass_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_woody_reichMokanyGlobiomass_MgCha_300m_2')
var bgbc_woody_bouvet_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_woody_reichMokanyBouvet_MgCha_300m_2')
var bgbc_grass_xia_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_grass_mokany_MgCha_300m')
var bgbc_tundra_berner_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_tundra_wang_MgCha_300m')
var bgbc_crop_monfredaNPP_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_crop_monfredaNPP_MgCha_300m')

//=============================================================================================//
// STEP 4. PREPROSESS AND PREPARE LANDCOVER LAYERS ============================================//
//=============================================================================================//

// MODIS TREECOVER =======================================
var modis_vcfTreecover_300m = require('users/spawnwisc/globalBiomass:finalGlobal/landcover/modis_vcfTreecover_300m.js')
    modis_vcfTreecover_300m = modis_vcfTreecover_300m.modis_vcfTreecover_300m

modis_vcfTreecover_300m(2010, 'finalGlobal/modis_vcfTreecover_perc_300m')

// LOAD FINALIZED LAYERS =================================

var modis_vcfTreecover_perc_300m = ee.Image('users/spawnwisc/finalGlobal/modis_vcfTreecover_perc_300m')

//=============================================================================================//
// STEP 5. COMBINE LAYERS =====================================================================//
//=============================================================================================//

// LOAD FINALIZED LAYERS =================================

// -- AGBC from Step 2
var agbc_woody_globbiomass_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_woody_globbiomass_MgCha_300m')
var agbc_woody_bouvet_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_woody_bouvet_MgCha_300m')
var agbc_grass_xia_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_grass_xia_MgCha_300m')
var agbc_tundra_berner_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_tundra_berner_MgCha_300m')
var agbc_crop_monfredaNPP_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/agbc_crop_monfredaNPP_MgCha_300m')

// -- BGBC from Step 3
var bgbc_woody_globbiomass_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_woody_reichMokanyGlobiomass_MgCha_300m_2')
var bgbc_woody_bouvet_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_woody_reichMokanyBouvet_MgCha_300m_2')
var bgbc_grass_xia_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_grass_mokany_MgCha_300m')
var bgbc_tundra_berner_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_tundra_wang_MgCha_300m')
var bgbc_crop_monfredaNPP_MgCha_300m = ee.Image('users/spawnwisc/finalGlobal/bgbc_crop_monfredaNPP_MgCha_300m')

// -- Treecover from Step 4
var modis_vcfTreecover_perc_300m = ee.Image('users/spawnwisc/finalGlobal/modis_vcfTreecover_perc_300m')


// HARMONIZE LAYERS ======================================

var harmonizingFuncs = require('users/spawnwisc/globalBiomass:finalGlobal/synthesis/harmonizing_funcs.js')

var woody_globalMosaic = harmonizingFuncs.woody_globalMosaic
var globalMosaic = harmonizingFuncs.globalMosaic

// 1. Create unified woody layer:

var agbc_woody_MgCha_300m = woody_globalMosaic(agbc_woody_globbiomass_MgCha_300m, 
                                               agbc_woody_bouvet_MgCha_300m, 
                                               landcover)

exportAsset300m(agbc_woody_MgCha_300m, 'finalGlobal/agbc_woody_MgCha_300m')

var bgbc_woody_MgCha_300m = woody_globalMosaic(bgbc_woody_globbiomass_MgCha_300m, 
                                               bgbc_woody_bouvet_MgCha_300m, 
                                               landcover)

// 2. Create harmonized global mosaics:

var agbc_MgCha_300m = globalMosaic(agbc_woody_MgCha_300m, 
                                   agbc_grass_xia_MgCha_300m, 
                                   agbc_crop_monfredaNPP_MgCha_300m, 
                                   agbc_tundra_berner_MgCha_300m, 
                                   modis_vcfTreecover_perc_300m, 
                                   landcover,
                                   agbc_woody_MgCha_300m,          // for tundra vs. woody allocation
                                   agbc_tundra_berner_MgCha_300m)  // for tundra vs. woody allocation

var bgbc_MgCha_300m = globalMosaic(bgbc_woody_MgCha_300m, 
                                  bgbc_grass_xia_MgCha_300m, 
                                  bgbc_crop_monfredaNPP_MgCha_300m, 
                                  bgbc_tundra_berner_MgCha_300m, 
                                  modis_vcfTreecover_perc_300m, 
                                  landcover,
                                  agbc_woody_MgCha_300m,          // for tundra vs. woody allocation
                                  agbc_tundra_berner_MgCha_300m)  // for tundra vs. woody allocation

exportAsset300m(agbc_MgCha_300m, 'finalGlobal/FINAL_agbc_MgCha_300m_rev1')
exportAsset300m(bgbc_MgCha_300m, 'finalGlobal/FINAL_bgbc_MgCha_300m_rev1')
