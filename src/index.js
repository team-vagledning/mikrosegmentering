const data = require('../data/mikrosegmentering.json')

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

const getFieldValue = (record, excelField) =>
{
    let value = record['FIELD' + excelHeaderToNumber(excelField)]

    if (isNaN(value)) {
        return parseFloat(value.replace(',', '.'))
    }
    
    return value
}

module.exports.getMikrosegment = (inputs) => {

    // Get selected yrkes
    const yrkesdata = data.filter(yrke => getFieldValue(yrke, 'A') == inputs.ssyk)

    // Fetch means and deviations, 
    // there're the same for all clusters of the same yrke
    const means = {
        medelalder: getFieldValue(yrkesdata[0], 'DH'),
        utbildningsniva: getFieldValue(yrkesdata[0], 'DI'),
        bosatt: getFieldValue(yrkesdata[0], 'DJ')
    }
    const deviations = {
        medelalder: getFieldValue(yrkesdata[0], 'DK'),
        utbildningsniva: getFieldValue(yrkesdata[0], 'DL'),
        bosatt: getFieldValue(yrkesdata[0], 'DM')
    }

    // Make centroids
    let centroids = []
    for (const r of yrkesdata) {
        centroids.push([
            (getFieldValue(r, 'C') - means.medelalder) / deviations.medelalder,
            (getFieldValue(r, 'D') - means.utbildningsniva) / deviations.utbildningsniva,
            (getFieldValue(r, 'E') - means.bosatt) / deviations.bosatt
        ])
    }

    // Make input centroid and classify
    const key = classify([
        (inputs.alder - means.medelalder) / deviations.medelalder,
        (inputs.utbildningsniva - means.utbildningsniva) / deviations.utbildningsniva,
        (inputs.bosatt - means.bosatt) / deviations.bosatt
    ], centroids)

    const m = yrkesdata[key]
    
    return {
        ssyk: getFieldValue(m, 'A'),
        mikrosegment: getFieldValue(m, 'B'),
        medelalder: getFieldValue(m, 'C'),
        medelutbildningsniva: getFieldValue(m, 'D'),
        medelandel_bosatt_sverige: getFieldValue(m, 'E'),
        andel_studerande_senaste_aret: getFieldValue(m, 'AU'),
        medelinkomst: getFieldValue(m, 'AW'),
        forvantad_automatiserng: getFieldValue(m, 'DG'),
        mobilitetsindex: getFieldValue(m, 'DH'),
        andel_float_till_arbetsloshet: getFieldValue(m, 'DO'),
    }
}


