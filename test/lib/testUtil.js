const csv = require('csv-parser'),
      fs = require('fs'),
      util  = require('util');


const parseCSV = async (fileName) => {
    return new Promise((resolve) => {
        let output = [];
        fs.createReadStream(`../data/${fileName}.csv`)
            .pipe(csv())
            .on('data', (data) => {
                // console.log(data);
                output.push(data);
            })
            .on('end', () => {
                resolve(output);
            });
    }, (err) => {
        console.error(err);
    });
}
module.exports = {
    parseCSV: parseCSV
};
