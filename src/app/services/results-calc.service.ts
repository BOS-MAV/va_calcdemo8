import { Injectable } from '@angular/core';
import { stringify } from 'querystring';
import { MapType, MethodCall } from '@angular/compiler';
//import { ENGINE_METHOD_DIGESTS } from 'constants';

export  function numberFormat(val:number,decimalPlaces:number) :number
/*Function Name: numberFormat
 *Purpose: Formats a number to specified decimal places
 *Input:    val             - the number to be formatted
 *          decimalPlaces   - the number of decimal places to format to
 *Output:   a formatted number
 */
{
  var multiplier = Math.pow(10,decimalPlaces);
  var intRet = (Math.round(val*multiplier)/multiplier).toFixed(decimalPlaces);
  return parseFloat(intRet);
}

export function calc_bmi(ht:number, wt:number, units: number): number{
/*Function Name:    calc_bmi
 *Purpose:          calculates the BMI either using english or metric units
 *Input:            ht      - the height
 *                  wt      - the weight
 *                  units   - 1 = English, 2 = Metric
 *Output:           BMI
 */
  var ret_val:number;
  if (units === 1) //English
    ret_val = (wt/ht/ht)*703;
  else //metric
    ret_val = (wt/ht/ht);
  return ret_val;
}

export function mean_center(coeff:number[] ,cent_var: number,sex:String,race: String): number
/* Function Name:   mean_center
 * Purpose:         This function uses a coefficient to center the mean
 * Input:           coeff: an array of coefficients used for centering
 *                  cent_var: the actual variable that will be centered
 *                  sex: the gender
 *                  race: the race
 * Returns:         the centered mean
 */
{
    var ret_val;
    if (sex === "Male") //male
    {
        if (race === "White") //white
        {
            ret_val = cent_var-coeff[0];
        }
        else //African American
        {
            ret_val = cent_var-coeff[1];
        }
    }
    else // female
    {
        if (race === "White") //white
        {
            ret_val = cent_var-coeff[2];
        }
        else //African American
        {
            ret_val = cent_var-coeff[3];
        }
    } 
    return ret_val;
}
@Injectable({
    providedIn: 'root'
  })
export class ResultsCalcService {

   /*instance variables*/
    _results: number[];
    _vals: Object;
    _factor = new Map();
    _specimen = new Map();
    _convUnit = new Map();
    _SI_Unit = new Map();
   


  constructor(vals:Object,calcType: String) {
    // load maps with json
    /*let data = new Object();  not working yet
    $.ajax({
    url: "si-conversions.json",
    dataType: 'json',
    data: data,
    async: false,
    success: function(data){
    if (data.length > 0) {
        //var arrItems = [];              // The array to store JSON data.
        $.each(data, function (index, value) {
            this._factor.set(value.Analyte,value.Factor);
            this._specimen.set(value.Analyte,value.Specimen);
            this._convUnit.set(value.Analyte,value.ConvUnit);
            this._SI_Unit.set(value.Analyte,value.SI_Unit);
        });
        }
        }
        });*/
   // populate instance variables

   this._vals = this.handleUnits(vals);

   if (calcType === 'HF')  // heart failure
      {
          this.hf_calc();
      }
    else if (calcType === 'ASCVD')  // ASCVD calc
    {
        this.calc_risk_ASCVD();
    }
    else if (calcType === 'ASCVD_Diab')  // ASCVD Diabetes
    {
        this.calc_DiaASCVD();
    }
    else if (calcType === 'test')  // ASCVD Diabetes
    {
        this._results = [100, 50, 4, 10000, 75];
    }
  }
 get calc_results()
     {
         return this._results;
       }

    handleUnits(responses: object){
        const cleanResponses = [];
        for (const key in responses) {
            if (responses.hasOwnProperty(key)){
                const resp = responses[key];
                if (typeof(resp) === 'string' && resp.indexOf(':') >= 0) {
                    // [TODO]: do unit conversion here
                    cleanResponses[key] = resp.substring(0, resp.indexOf(':'));
                } else {
                    cleanResponses[key] = resp;
                }
            }
        }
        return cleanResponses;
    }

/*heart failure method */
   hf_calc()
  {
     var HFpEFCoeff: number [][],
        HFrEFCoeff: number [][];
    var totScore: number;
    //declare variables to hold the rest
    var age:            number = this._vals["age"],
        sex:            String = this._vals["sex"],
        sexNum:         Number = sex === "Male"?1:0,
        race:           String = this._vals["race"],
        raceNum:        Number = race === "White"?1:0,
        smoker:         String = this._vals["smoker"],
        SBP:            number = this._vals["SBP"],
        diabetes:       number = this._vals["diabetes"]?1:0,
        hypertension:   number = this._vals["hypertension"]?1:0,
        BMI:            number = this._vals["BMI"],
        height:         number = this._vals["height"],
        weight:         number = this._vals["weight"],
        pMI:            number = this._vals["pMI"]?1:0,
        aFib:           number = this._vals["aFib"]?1:0,
        COPD:           number = this._vals["COPD"]?1:0,
        scr:            number = this._vals["scr"],
        pCAD:            number = this._vals["pCAD"]?1:0,
        age_2:          number,
        age_2ln:        number,
        diabetesWeight: number,
        hypertension_t: number,
        SBP_1:          number,
        SBP_2:          number,
        BMI_2:          number,
        BMI_1:          number,
        BMI_1ln:        number,
        eGFR:           number,
        eGFR2:          number;
    var mcage2:         number[]= new Array(2),
        mcage2ln:       number[]= new Array(2),
        mcbmi1:         number[]= new Array(2),
        mcbmi2:         number[]= new Array(2),
        mcsbp1:         number[]= new Array(2),
        mcsbp2:         number[]= new Array(2),
        mcegfr1:        number[]= new Array(2),
        mcegfr2:        number[]= new Array(2),
        xBeta:          number[]= new Array(2),
        eXbeta:         number[]= new Array(2),
        smokerWeight:   number[]= new Array(2),
        risk:           number[]= new Array(2);
    //initialize arrays to hold the mean centering coefficients for HFpEF and HFrEF
    HFpEFCoeff =    [[0.0002733,0.0003444,0.0003619,0.0004377],
                    [0.001114,0.001364,0.001423,0.001686],
                    [0.03517,0.0355,0.03558,0.0342],
                    [0.001274,0.001306,0.001324,0.001214],
                    [0.007448,0.007378,0.007772,0.007733],
                    [0.0000564,0.0000554,0.0000616,0.0000609],
                    [76.21,86.17,80.08,93.05],
                    [6098,7835,6733,9054]];
    //now get HFrEF
    HFrEFCoeff  = [[0.0002733,0.0003444,0.0003619,0.0004377],
                  [0.001114,0.001364,0.001423,0.001686],
                  [0.03517,0.0355,0.03558,0.0342],
                  [0.1172,0.1179,0.1179,0.1148],
                  [0.007448,0.007378,0.007772,0.007733],
                  [0.0000564,0.0000554,0.0000616,0.0000609],
                  [76.21,86.17,80.08,93.05],
                  [6098,7835,6733,9054]];
    //map for smoking weights
    let smokingWeight = new Map();
    smokingWeight.set(0,0.2377);
    smokingWeight.set(1,0.46217);
    smokingWeight.set(2,0.24107);
    smokingWeight.set(3,0.31372);
    smokingWeight.set(4,0.2081);
    smokingWeight.set(5,0.72708);
    smokingWeight.set(6,0.13677);
    smokingWeight.set(7,0.46656);
    smokingWeight.set(8,0.24067);
    smokingWeight.set(9,0.54047);
    smokingWeight.set(10,0.30329);
    smokingWeight.set(11,0.53331);
    smokingWeight.set(12,0.2261);
    smokingWeight.set(13,0.81355);
    smokingWeight.set(14,0.53959);
    smokingWeight.set(15,0.82059);
    //temp variables to find value in map
    tempSmokeWt0:  String;
    tempSmokeWt1:  String;
    age_2 = Math.pow(age,-2);
    age_2ln = age_2*Math.log(age);
    //let's mean-center age for each model
    mcage2[0] = mean_center(HFpEFCoeff[0],age_2,sex,race);
    mcage2[1] = mean_center(HFrEFCoeff[0],age_2,sex,race);
    //mean center the age-2*ln(age)
    mcage2ln[0] = mean_center(HFpEFCoeff[1],age_2ln,sex,race);
    mcage2ln[1] = mean_center(HFrEFCoeff[1],age_2ln,sex,race);
    if (smoker === "Current")
    {
        let tempSmokeWt0 = "0"+sexNum.toString()+raceNum.toString()+"1";
        let tempSmokeWt1 = "1"+sexNum.toString()+raceNum.toString()+"1";
        smokerWeight[0] = smokingWeight.get(parseInt(tempSmokeWt0,2));
        smokerWeight[1] = smokingWeight.get(parseInt(tempSmokeWt1,2));
    }
    else if (smoker === "Former")
    {
        let tempSmokeWt0 = "0"+sexNum.toString()+raceNum.toString()+"0";
        let tempSmokeWt1 = "1"+sexNum.toString()+raceNum.toString()+"0";
        smokerWeight[0] = smokingWeight.get(parseInt(tempSmokeWt0,2));
        smokerWeight[1] = smokingWeight.get(parseInt(tempSmokeWt1,2));
    }
    else
    {
        smokerWeight[0] = 0;
        smokerWeight[1] = 0;
    }
        SBP_1 = 1/SBP;
        SBP_2 = Math.pow(SBP,-2);
     
    if (BMI == 0 || !BMI)  //calculate BMI otherwise already entered in calculator
    {
        BMI = calc_bmi(height,weight,1);
    }
    BMI_1 = Math.pow(BMI,-1);
    BMI_2 = Math.pow(BMI,-2);
    // Define BMI^{-1} * ln(BMI), used in HFrEF risk equation only
    BMI_1ln = BMI_1*Math.log(BMI);
    //let's calculate eGFR
    //first, get the serum creatinine
    if ((sex === "Female") && (scr <= 0.7)) //female and serum creatinine <= 0.7
    {
       eGFR = 144 *Math.pow((scr/0.7),-0.329) * Math.pow(0.993,age);
        if (race === "African American") //African American
            eGFR = eGFR*1.159;
    }
    else if ((sex === "Female") && (scr > 0.7)) //female and serum creatinine > 0.7
    {
        eGFR = 144 *Math.pow((scr/0.7),-1.209) * Math.pow(0.993,age);
        if (race === "African American") //African American
            eGFR = eGFR*1.159;
    }
    else if ((sex === "Male") && (scr <= 0.9)) //male and serum creatinine <= 0.9
    {
        eGFR = 144 *Math.pow((scr/0.9),-0.411) * Math.pow(0.993,age);
        if (race === "African American") //African American
            eGFR = eGFR*1.159;
    }
    else if ((sex === "Male") && (scr > 0.9)) //male and serum creatinine > 0.9
    {
        eGFR = 144 *Math.pow((scr/0.9),-1.209)* Math.pow(0.993,age);
        if (race === "African American") //African American
            eGFR = eGFR*1.159;
    }
    eGFR2 = Math.pow(eGFR,2);
    //now let's mean-center the remaining continuous variables
    //all arrays have the first element for HFpEF and second for HFrEF
    //first bmi-1       
    mcbmi1[0] = mean_center(HFpEFCoeff[2],BMI_1,sex,race);
    mcbmi1[1] = mean_center(HFrEFCoeff[2],BMI_1,sex,race);
    //next bmi-2
    mcbmi2[0] = mean_center(HFpEFCoeff[3],BMI_2,sex,race);
    mcbmi2[1] = mean_center(HFrEFCoeff[3],BMI_1ln,sex,race); //replaced BMI_2 with BMI_1ln
    //now SBP-1
    mcsbp1[0] = mean_center(HFpEFCoeff[4],SBP_1,sex,race);
    mcsbp1[1] = mean_center(HFrEFCoeff[4],SBP_1,sex,race);
    //next SBP-2
    mcsbp2[0] = mean_center(HFpEFCoeff[5],SBP_2,sex,race);
    mcsbp2[1] = mean_center(HFrEFCoeff[5],SBP_2,sex,race);
    //eGFR
    mcegfr1[0] = mean_center(HFpEFCoeff[6],eGFR,sex,race);
    mcegfr1[1] = mean_center(HFrEFCoeff[6],eGFR,sex,race);
    //egfr2
    mcegfr2[0] = mean_center(HFpEFCoeff[7],eGFR2,sex,race);
    mcegfr2[1] = mean_center(HFrEFCoeff[7],eGFR2,sex,race);
    if ((sex === "Male") && (race ==="White")) //white male
    {
        //first HFpEF
        xBeta[0] = mcage2[0]*-23673 + mcage2ln[0] * 5920.4 + diabetes*0.53733 + mcbmi1[0]*-270.14+mcbmi2[0]*3066+mcsbp1[0]*-1049.4+mcsbp2[0]*60782;
        xBeta[0] += hypertension * 0.43238 + pMI * 0.79943 + aFib * 0.64536 + smokerWeight[0] + COPD * 0.73618 + mcegfr1[0] * -0.059238;
        xBeta[0] += mcegfr2[0] * 0.0003754;
        //now HFrEF
        xBeta[1] = mcage2[1]*-36839 + mcage2ln[1] * 10034 + diabetes*0.54141 + mcbmi1[1]*319.93+mcbmi2[1]*-143.43+mcsbp1[1]*-903.06+mcsbp2[1]*55221;
        xBeta[1] += hypertension * 0.27418 + pMI * 0.86422 + pCAD * 0.58366 + aFib * 0.4946 + smokerWeight[1] + COPD * 0.37526 + mcegfr1[1] * -0.053074;
        xBeta[1] += mcegfr2[1] * 0.0003372;
    }
    else if ((sex === "Male") && (race === "African American")) //African American male
    {
        //first HFpEF
        xBeta[0] = mcage2[0]*10787 + mcage2ln[0] * -3908.1 + diabetes*0.63235 + mcbmi1[0]*-234.58+mcbmi2[0]*2750.4+mcsbp1[0]*-1217+mcsbp2[0]*70479;
        xBeta[0] += hypertension * 0.48128 + pMI * 0.98355 + aFib * 0.73928 + smokerWeight[0] + COPD * 0.61387 + mcegfr1[0] * -0.053562;
        xBeta[0] += mcegfr2[0] * 0.0002814;
        //now HFrEF
        xBeta[1] = mcage2[1]*-12596 + mcage2ln[1] * 3139.3 + diabetes*0.46185 + mcbmi1[1]*258.9+mcbmi2[1]*-113.95+mcsbp1[1]*-967.59+mcsbp2[1]*54779;
        xBeta[1] += hypertension * 0.31285 + pMI * 0.89877 + pCAD * 0.53809+ aFib * 0.65053 + smokerWeight[1] + COPD * 0.26295 + mcegfr1[1] * -0.042165;
        xBeta[1] += mcegfr2[1] * 0.0002299;
    }
    else if ((sex === "Female") && (race === "White")) //White Female
    {
        //first HFpEF
        xBeta[0] = mcage2[0]*13951 + mcage2ln[0] * -5302.1 + diabetes*0.52417 + mcbmi1[0]*-248+mcbmi2[0]*2843.3+mcsbp1[0]*-959.22+mcsbp2[0]*58317;
        xBeta[0] += hypertension * 0.74244 + pMI * 0.91079 + aFib * 0.58403 + smokerWeight[0] + COPD * 0.56266 + mcegfr1[0] * -0.059363;
        xBeta[0] += mcegfr2[0] * 0.0003701;
        //now HFrEF
        xBeta[1] = mcage2[1]*-26532 + mcage2ln[1] * 6659.8 + diabetes*0.58104 + mcbmi1[1]*168.13+mcbmi2[1]*-75.397+mcsbp1[1]*-621.61+mcsbp2[1]*28797;
        xBeta[1] += hypertension * 0.41315 + pMI * 1.0276 + pCAD * 0.50868 + aFib * 0.91438 + smokerWeight[1] + COPD * 0.43042 + mcegfr1[1] *-0.056461;
        xBeta[1] += mcegfr2[1] * 0.0003536;
    }
    else if ((sex === "Female") && (race === "African American")) //African American Female
    {
        //first HFpEF
        xBeta[0] = mcage2[0]*64403 + mcage2ln[0] * -19488 + diabetes*1.0977 + mcbmi1[0]*-159.4+mcbmi2[0]*1857.7+mcsbp1[0]*-1545.1+mcsbp2[0]*93175;
        xBeta[0] += hypertension * 0.57702 + pMI * 0.48945 + aFib * 0.74776 + smokerWeight[0] + COPD * 0.6554 + mcegfr1[0] * -0.041395;
        xBeta[0] += mcegfr2[0] * 0.0001988;
        //now HFrEF
        xBeta[1] = mcage2[1]*-25884 + mcage2ln[1] * 7016.3 + diabetes*0.63186 + mcbmi1[1]*20.933+mcbmi2[1]*-15.256+mcsbp1[1]*-1763.4+mcsbp2[1]*103730;
        xBeta[1] += hypertension * 0.29358 + pMI * 0.81117 + pCAD *0.65882 + aFib * 1.7529 + smokerWeight[1] + COPD * 0.40719 + mcegfr1[1] * -0.043111;
        xBeta[1] += mcegfr2[1] * 0.0002094;
    }
    eXbeta[0] = Math.exp(xBeta[0]);
    eXbeta[1] = Math.exp(xBeta[1]);           
    if ((sex === "Male") && (race ==="White")) //white male
    {
        risk[0] = 1- Math.pow(0.9876515,eXbeta[0]);
        risk[1] = 1 - Math.pow(0.9815184,eXbeta[1]);
    }
    else  if ((sex === "Male") && (race ==="African American")) //African American male
    {
        risk[0] = 1- Math.pow(0.9874179,eXbeta[0]);
        risk[1] = 1 - Math.pow(0.9772750,eXbeta[1]);
    }
    else if ((sex === "Female") && (race ==="White")) //white females
    {
        risk[0] = 1- Math.pow(0.9923794,eXbeta[0]);
        risk[1] = 1 - Math.pow(0.9936674,eXbeta[1]);
    }
    else if ((sex === "Female") && (race ==="African American")) //African American females
    {
        risk[0] = 1- Math.pow(0.9936079,eXbeta[0]);
        risk[1] = 1 - Math.pow(0.9941458,eXbeta[1]);
    }
    risk[0] = numberFormat(risk[0]*100,2);
    risk[1] = numberFormat(risk[1]*100,2);
    this._results = risk;
  }

 /*method to calculate risk for ASCVD*/
 
    calc_risk_ASCVD() {
    //declare variables to hold the values
    var age:                number = this._vals["age"],
        age5:               number,
        age5Weight:         number,
        sex:                String = this._vals["sex"],
        sexNum:             number = sex==="Male"?1:0,
        sexWeight:          number,
        race:               String = this._vals["race"],
        raceNum:            number = race==="White"?1:0,
        race_t:             number,
        raceWeight:         number,
        diabetes:           number = this._vals["diabetes"]?1:0,
        diabetesWeight:     number,
        smokerNum:          number = this._vals["smoker"]?1:0,
        smokerWeight:       number,
        hypertension:       number = this._vals["hypertension"]?1:0,
        hypertension_t:     number,
        statin:             number = this._vals["statin"]?1:0,
        statin_t:           number,
        bpSys:              number = this._vals["SBP"],
        diastolic:          number = this._vals["DBP"],
        bpSys10:            number,
        bpSysWeight:        number,
        totchl:             number = this._vals["totchl"],
        hdlc:               number = this._vals["hdl"],
        hdlcWeight:         number,
        hdlc10:             number,  
        ldlc:               number = this._vals["ldl"],
        hypertensionWeight: number,
        statinWeight:       number,
        xbeta:              number,
        eXbeta:             number,
        risk:               number[]= new Array(1);
    //(05/2020) this now needs to be split out based on statin or not statin use
    age5 = age/5;
    age5Weight = age5*0.20551;
    sexWeight = sexNum * 0.46515;
    raceWeight = raceNum * -0.17661;
    diabetesWeight = diabetes * 0.48240;
    smokerWeight = smokerNum * 0.41682;
    if (totchl > 150 && totchl < 201)
    {
        totchl = 0.01114;
    }
    else if (totchl > 200 && totchl < 251)
    {
        totchl = 0.15278;
    }
    else if (totchl > 250)
    {
        totchl = 0.45186;
    }
    else
    {
        totchl = 0;
    }
    hdlc10 = hdlc/10;
    hdlcWeight = hdlc10 * -0.07256;
    bpSys10 = bpSys/10;
    bpSysWeight = bpSys10*0.08852;
    hypertensionWeight = 0.31875 * hypertension;
    statinWeight = -0.07573 * statin;
    xbeta = age5Weight + sexWeight + raceWeight + diabetesWeight + smokerWeight +
        totchl + hdlcWeight + bpSysWeight + hypertensionWeight + statinWeight;
    eXbeta = Math.exp(xbeta-2.93853);
    risk[0] = 1 - Math.pow(0.98731,eXbeta);
    risk[0] = numberFormat(risk[0]*100,2);
    this._results = risk;
    }
    /*calc ASCVD for diabetic population */
     calc_DiaASCVD()
    {
        //declare variables
        var age:            number = this._vals["age"],
        ageWeight:          number,
        ageLogSQWeight:     number,
        sex:                String = this._vals["sex"],
        sexNum:             number = sex==="Male"?0:1,
        sexWeight:          number,
        race:               String = this._vals["race"],
        raceNum:            number = race==="White"?0:1,
        raceWeight:         number,
        smokerNum:          number = this._vals["smoker"]?1:0,
        smokerWeight:       number,
        diabetes:           number = this._vals["diabetes"]?1:0,
        hypertension:       number = this._vals["hypertension"]?1:0,
        hypertension_t:     number,
        statin:             number = this._vals["statin"]?1:0,
        statinWeight:       number,
        bpSys:              number = this._vals["SBP"],
        totchl:             number = this._vals["totchl"],
        totchlWeight:       number,
        chlAgeWeight:       number,
        hdlc:               number = this._vals["hdl"],
        hdlcWeight:         number,
        ageHdlWeight:       number,
        bpMed:              number = this._vals["bpmed"]?1:0,
        bpSysbpMedWeight:   number,
        bpSysbpAgeWeight:   number,
        ageSmokeWeight:     number,
        a1c:                number = this._vals["a1c"],
        a1cWeight:          number,
        egfr:               number = this._vals["egfr"],
        egfrWeight:         number,
        insulin:            number = this._vals["insulin"]?1:0,
        insulinWeight:      number,
        sulfonyl:           number = this._vals["sulfonyl"]?1:0,
        sulfonylWeight:     number,
        otherDiab:          number = this._vals["otherDiab"]?1:0,
        otherDiabWeight:    number,
        microAlb:           number = this._vals["microAlb"],
        microAlbWeight:     number,
        xbeta:              number,
        eXbeta:             number,
        risk:               number[]= new Array(4);
        ageWeight = Math.log(age)*18.9496;
        console.log("x");
        ageLogSQWeight = Math.log(age)*Math.log(age)*-1.82065;
        sexWeight = sexNum * -0.21382;
        raceWeight = raceNum * 0.003490576;
        smokerWeight = smokerNum * 3.90106;
        totchlWeight = Math.log(totchl)*1.38594;
        chlAgeWeight = Math.log(totchl)*Math.log(age)*-0.17667;
        hdlcWeight = Math.log(hdlc) * 0.42114;
        ageHdlWeight = Math.log(hdlc)*Math.log(age)*-0.17799;
        bpSysbpMedWeight = Math.log(bpSys)*bpMed*0.62768;
        bpSysbpAgeWeight = Math.log(age)*Math.log(bpSys)*bpMed*-0.14554;
        ageSmokeWeight = Math.log(age)*smokerNum*-0.92560;
        statinWeight = statin*-0.033734;
        if (diabetes===1)
        {
            a1cWeight = Math.log(a1c/100)*0.92618;
            egfrWeight = Math.log(egfr)*-0.35818;
            insulinWeight = insulin * 0.28100;
            sulfonylWeight = sulfonyl * 0.10185;
            otherDiabWeight = otherDiab * -0.080862;
            microAlbWeight = microAlb * 0.002264563;
        }
        else
        {
            a1cWeight = 0;
            egfrWeight = 0;
            insulinWeight=0;
            sulfonylWeight = 0;
            otherDiabWeight = 0;
            microAlbWeight = 0;
        }
        xbeta = ageWeight + ageLogSQWeight+sexWeight + raceWeight + smokerWeight + totchlWeight+ chlAgeWeight+ hdlcWeight+ageHdlWeight+
                bpSysbpMedWeight+bpSysbpAgeWeight+ageSmokeWeight+ statinWeight+ a1cWeight+egfrWeight+ insulinWeight+sulfonylWeight+
                otherDiabWeight+microAlbWeight;
        eXbeta = Math.exp(xbeta-49.7547);
        risk[0] = 1 - Math.pow(0.94992,eXbeta);
        risk[0] = numberFormat(risk[0]*100,2);
        // calculate mi
        ageWeight = Math.log(age)*33.5917;
        ageLogSQWeight = Math.log(age)*Math.log(age)*-3.95840;
        sexWeight = sexNum * -0.14536;
        raceWeight = raceNum * -0.26031;
        smokerWeight = smokerNum * 2.15214;
        totchlWeight = Math.log(totchl)*1.70872;
        chlAgeWeight = Math.log(totchl)*Math.log(age)*-0.22920;
        hdlcWeight = Math.log(hdlc) * -1.78410;
        ageHdlWeight = Math.log(hdlc)*Math.log(age)*0.29576;
        bpSysbpMedWeight = Math.log(bpSys)*bpMed*0.87932;
        bpSysbpAgeWeight = Math.log(age)*Math.log(bpSys)*bpMed*-0.21101;
        ageSmokeWeight = Math.log(age)*smokerNum*-0.47557;
        statinWeight = 0.037998 * statin;
        if (diabetes === 1)
        {
            a1cWeight = Math.log(a1c/100)*0.86555;
            egfrWeight = Math.log(egfr)*-0.43044;
            insulinWeight = insulin * 0.27731;
            sulfonylWeight = sulfonyl * 0.082256;
            otherDiabWeight = otherDiab * -0.059207;
            microAlbWeight = microAlb * 0.001920131;
        }
        else
        {
            a1cWeight = 0;
            egfrWeight = 0;
            insulinWeight=0;
            sulfonylWeight = 0;
            otherDiabWeight = 0;
            microAlbWeight = 0;
        }
        xbeta = ageWeight + ageLogSQWeight+sexWeight + raceWeight + smokerWeight + totchlWeight+ chlAgeWeight+ hdlcWeight+ageHdlWeight+
                    bpSysbpMedWeight+bpSysbpAgeWeight+ageSmokeWeight+ statinWeight+ a1cWeight+egfrWeight+ insulinWeight+sulfonylWeight+
                    otherDiabWeight+microAlbWeight;
        eXbeta = Math.exp(xbeta-72.9997);
        risk[1] = 1 - Math.pow(0.97855,eXbeta);
        risk[1] = numberFormat(risk[1]*100,2);
        // calculate AIS
        ageWeight = Math.log(age)*25.7558;
        ageLogSQWeight = Math.log(age)*Math.log(age)*-2.67664;
        sexWeight = sexNum * -0.13267;
        raceWeight = raceNum * 0.26215;
        smokerWeight = smokerNum * 4.29949;
        totchlWeight = Math.log(totchl)*-0.17577;
        chlAgeWeight = Math.log(totchl)*Math.log(age)*0.19084;
        hdlcWeight = Math.log(hdlc) * 1.88671;
        ageHdlWeight = Math.log(hdlc)*Math.log(age)*-0.50053;
        bpSysbpMedWeight = Math.log(bpSys)*bpMed*0.81686;
        bpSysbpAgeWeight = Math.log(age)*Math.log(bpSys)*bpMed*-0.18904;
        ageSmokeWeight = Math.log(age)*smokerNum*-1.01281;
        statinWeight = -0.053618 * statin;
        if (diabetes === 1)
        {
            a1cWeight = Math.log(a1c/100)*1.08183;
            egfrWeight = Math.log(egfr)*-0.16523;
            insulinWeight = insulin * 0.17974;
            sulfonylWeight = sulfonyl * 0.080476;
            otherDiabWeight = otherDiab * -0.074728;
            microAlbWeight = microAlb * 0.002229916;
        }
        else
            {
                a1cWeight = 0;
                egfrWeight = 0;
                insulinWeight=0;
                sulfonylWeight = 0;
                otherDiabWeight = 0;
                microAlbWeight = 0;
            }
        xbeta = ageWeight + ageLogSQWeight+sexWeight + raceWeight + smokerWeight + totchlWeight+ chlAgeWeight+ hdlcWeight+ageHdlWeight+
                bpSysbpMedWeight+bpSysbpAgeWeight+ageSmokeWeight+ statinWeight+ a1cWeight+egfrWeight+ insulinWeight+sulfonylWeight+
                otherDiabWeight+microAlbWeight;
        eXbeta = Math.exp(xbeta-64.6638);
        risk[2] = 1 - Math.pow(0.98002,eXbeta);
        risk[2] = numberFormat(risk[2]*100,2);
        // calculate death
        ageWeight = Math.log(age)*-15.5846;
        ageLogSQWeight = Math.log(age)*Math.log(age)*3.01077;
        sexWeight = sexNum * -0.31028;
        raceWeight = raceNum * 0.016973;
        smokerWeight = smokerNum * 3.06123;
        totchlWeight = Math.log(totchl)*0.40314;
        chlAgeWeight = Math.log(totchl)*Math.log(age)*-0.009322967;
        hdlcWeight = Math.log(hdlc) * 5.91861;
        ageHdlWeight = Math.log(hdlc)*Math.log(age)*-1.44213;
        bpSysbpMedWeight = Math.log(bpSys)*bpMed*-0.13179;
        bpSysbpAgeWeight = Math.log(age)*Math.log(bpSys)*bpMed*0.0373375;
        ageSmokeWeight = Math.log(age)*smokerNum*-0.76306;
        statinWeight = -0.16998 * statin;
        if (diabetes === 1)
        {
            a1cWeight = Math.log(a1c/100)*0.74074;
            egfrWeight = Math.log(egfr)*-0.59522;
            insulinWeight = insulin * 0.44208;
            sulfonylWeight = sulfonyl * 0.19415;
            otherDiabWeight = otherDiab * -0.13477;
            microAlbWeight = microAlb * 0.003061906;
        }
        else
        {
            a1cWeight = 0;
            egfrWeight = 0;
            insulinWeight=0;
            sulfonylWeight = 0;
            otherDiabWeight = 0;
            microAlbWeight = 0;
        }
        xbeta = ageWeight + ageLogSQWeight+sexWeight + raceWeight + smokerWeight + totchlWeight+ chlAgeWeight+ hdlcWeight+ageHdlWeight+
                bpSysbpMedWeight+bpSysbpAgeWeight+ageSmokeWeight+ statinWeight+ a1cWeight+egfrWeight+ insulinWeight+sulfonylWeight+
                otherDiabWeight+microAlbWeight;
        eXbeta = Math.exp(xbeta+12.3901);
        risk[3] = 1 - Math.pow(0.98686,eXbeta);
        risk[3]  = numberFormat(risk[3]*100,2);
        this._results = risk;
 }
}
