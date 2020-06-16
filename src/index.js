import data from '../data/mikrosegmentering.json'
import yrken from '../data/yrken.json'
import likhetsanalys from '../data/likhetsanalys.json'
import konkurrens from '../data/konkurrens.json'
import lankommuner from '../data/lankommuner.json'
import utbildningar from '../data/utbildningar.json'
import utbildningar_geografi from '../data/utbildningar_geografi.json'

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

const getUtbildningar = (ssyk, lan = false) => {
    // Get utbildningar
    const utb = utbildningar.filter((u) => getFieldNumericValue(u, 'D') == ssyk)
    
    const buildUtbildningLank = (utbildningstyp, lank) => {

        if (lan) {
            const geo = utbildningar_geografi.filter((u) => getFieldStringValue(u, 'B') == lan && getFieldStringValue(u, 'A') == utbildningstyp).pop()

            if (geo) {

                const suffix = getFieldStringValue(geo, 'C')

                if (suffix.length > 1) {
                    if (utbildningstyp == "Komvux") {
                        let s1 = lank.split('/')
                        let s2 = s1[s1.length - 1].split('-')

                        if (s2.length > 2) {
                            s2.pop()
                        }

                        s2.push(getFieldStringValue(geo, 'D'))
                    
                        s2 = s2.join('-')
                        s1[s1.length - 1] = s2

                        lank = s1.join('/')

                
                    } else {
                        lank += getFieldStringValue(geo, 'C')
                    }
                }
            }
        }

        return lank
    }

    return utb.map((u) => {

        if (getFieldStringValue(u, 'I').length < 2) {
            return false
        }

        return {
            utbildningstyp: getFieldStringValue(u, 'A'),
            beskrivning: getFieldStringValue(u, 'G'),
            lank: buildUtbildningLank(
                getFieldStringValue(u, 'A'),
                getFieldStringValue(u, 'I')
            ),
        }
    }).filter((u) => u !== false)
}

const getYrke = (ssyk, withRelated = true, lan) => {
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
        utbildningar: getUtbildningar(ssyk, lan)
    }

    // Check for konkurrens
    if (konkurrens.hasOwnProperty(ssyk)) {
        results['konkurrens'] = konkurrens[ssyk]
    }

    // Get related yrken
    if (withRelated) {
        const related = likhetsanalys[ssyk].map((r) => {
            return getYrke(r, false, lan)
        })

        results['relaterade_yrken'] = related
    }

    return results
}

const getMikrosegment = (inputs) => {

    // Find län from kommun
    const lan = Object.keys(lankommuner).filter((key) => { return lankommuner[key].includes(inputs.kommun)}).pop()

    // Get selected yrkes
    const yrkesdata = data.filter(yrke => getFieldNumericValue(yrke, 'A') == inputs.ssyk)

    // Fetch means and deviations, 
    // there're the same for all clusters of the same yrke
    const means = {
        medelalder: getFieldNumericValue(yrkesdata[0], 'DJ'),
        utbildningsniva: getFieldNumericValue(yrkesdata[0], 'DK'),
        bosatt: getFieldNumericValue(yrkesdata[0], 'DL')
    }
    const deviations = {
        medelalder: getFieldNumericValue(yrkesdata[0], 'DM'),
        utbildningsniva: getFieldNumericValue(yrkesdata[0], 'DN'),
        bosatt: getFieldNumericValue(yrkesdata[0], 'DO')
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

    return Object.assign(yrke, getYrke(inputs.ssyk, true, lan))
}

module.exports.getYrke = getYrke
module.exports.getMikrosegment = getMikrosegment