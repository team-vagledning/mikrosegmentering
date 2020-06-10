import data from '../data/mikrosegmentering.json'
import yrken from '../data/yrken.json'
import likhetsanalys from '../data/likhetsanalys.json'
import konkurrens from '../data/konkurrens.json'

const classify = (point, centroids) => {
    var min = Infinity, index = 0;
 
    const distance = (v1, v2) => {
        var total = 0
        for (var i = 0; i < v1.length; i++) {
           total += Math.pow(v2[i] - v1[i], 2)
        }
        return Math.sqrt(total)
     };
 
    for (var i = 0; i < centroids.length; i++) {
       var dist = distance(point, centroids[i])
       if (dist < min) {
          min = dist
          index = i
       }
    }
 
    return index
 }

const excelHeaderToNumber = (val) => {
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0

    for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
        result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1)
    }

    return result
}

const getFieldNumericValue = (record, excelField) =>
{
    let value = record['FIELD' + excelHeaderToNumber(excelField)]

    if (isNaN(value)) {
        return parseFloat(value.replace(',', '.').replace(' ', ''))
    }
    
    return value
}

const getFieldStringValue = (record, excelField) =>
{
    return record['FIELD' + excelHeaderToNumber(excelField)]
}

const getYrke = (ssyk, withRelated = true) => {
    // Get selected yrke
    const yrke = yrken.filter(yrke => getFieldNumericValue(yrke, 'A') == ssyk).pop()

    // Get yrkesdata
    const yrkesdata = data.filter(yrke => getFieldNumericValue(yrke, 'A') == ssyk).pop()
    
    // Result set
    let results = {
        ssyk: getFieldNumericValue(yrke, 'A'),
        name: getFieldStringValue(yrke, 'B'),
        forvantad_automatisering: getFieldNumericValue(yrkesdata, 'DG'),           
        forvantad_automatisering_klass: getFieldStringValue(yrkesdata, 'DH'),       
        mobilitetsindex: getFieldNumericValue(yrkesdata, 'DI'),                     
        konkurrens: null,
    }

    // Check for konkurrens
    if (konkurrens.hasOwnProperty(ssyk)) {
        results['konkurrens'] = konkurrens[ssyk]
    }

    // Get related yrken
    if (withRelated) {
        const related = likhetsanalys[ssyk].map((r) => {
            return getYrke(r, false)
        })

        results['relaterade_yrken'] = related
    }

    return results
}

const getMikrosegment = (inputs) => {

    // Get selected yrkes
    const yrkesdata = data.filter(yrke => getFieldNumericValue(yrke, 'A') == inputs.ssyk)

    // Fetch means and deviations, 
    // there're the same for all clusters of the same yrke
    const means = {
        medelalder: getFieldNumericValue(yrkesdata[0], 'DH'),
        utbildningsniva: getFieldNumericValue(yrkesdata[0], 'DI'),
        bosatt: getFieldNumericValue(yrkesdata[0], 'DJ')
    }
    const deviations = {
        medelalder: getFieldNumericValue(yrkesdata[0], 'DK'),
        utbildningsniva: getFieldNumericValue(yrkesdata[0], 'DL'),
        bosatt: getFieldNumericValue(yrkesdata[0], 'DM')
    }

    // Make centroids
    let centroids = []
    for (const r of yrkesdata) {
        centroids.push([
            (getFieldNumericValue(r, 'C') - means.medelalder) / deviations.medelalder,
            (getFieldNumericValue(r, 'D') - means.utbildningsniva) / deviations.utbildningsniva,
            (getFieldNumericValue(r, 'E') - means.bosatt) / deviations.bosatt
        ])
    }

    // Make input centroid and classify
    const key = classify([
        (inputs.alder - means.medelalder) / deviations.medelalder,
        (inputs.utbildningsniva - means.utbildningsniva) / deviations.utbildningsniva,
        (inputs.bosatt - means.bosatt) / deviations.bosatt
    ], centroids)

    const m = yrkesdata[key]
    
    const yrke = {
        ssyk: getFieldNumericValue(m, 'A'),
        mikrosegment: getFieldNumericValue(m, 'B'),
        medelalder: getFieldNumericValue(m, 'C'),
        medelutbildningsniva: getFieldNumericValue(m, 'D'),
        medelandel_bosatt_sverige: getFieldNumericValue(m, 'E'),
        andel_studerande_senaste_aret: getFieldNumericValue(m, 'AU'),
        medelinkomst: getFieldNumericValue(m, 'AW'),
        andel_flodat_till_arbetsloshet: getFieldNumericValue(m, 'DP'),       
        andel_kvar_i_yrket: getFieldNumericValue(m, 'DQ'),
        andel_bytt_yrke_topp_3: [
            Object.assign({
                ssyk: getFieldNumericValue(m, 'DR'),
                andel: getFieldNumericValue(m, 'DU')
            }, getYrke(getFieldNumericValue(m, 'DR'), false)),

            Object.assign({
                ssyk: getFieldNumericValue(m, 'DS'),
                andel: getFieldNumericValue(m, 'DV')
            }, getYrke(getFieldNumericValue(m, 'DS'), false)),

            Object.assign({
                ssyk: getFieldNumericValue(m, 'DT'),
                andel: getFieldNumericValue(m, 'DW')
            }, getYrke(getFieldNumericValue(m, 'DT'), false)),
        ],
        andel_bytt_yrke_ovriga: getFieldNumericValue(m, 'DX')
    }

    return Object.assign(yrke, getYrke(inputs.ssyk))
}

module.exports.getYrke = getYrke
module.exports.getMikrosegment = getMikrosegment