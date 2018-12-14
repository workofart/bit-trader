"use strict";

// BSD 2-Clause License
// Copyright (c) 2017, Viktor Jovanoski
// Modified from original source: https://github.com/bergloman/JsGridSearch
// All rights reserved.

const fs = require("fs");
const colors = require("colors");

/** This class performs grid search - an exhaustive search through all parameter combinations.
 * It can then call custom result evaluation and display heat-map in console.
 */
class GridSearch {

    /** Constructor for this object. Options must
     * provide run callback and parameters object with each property listing its possible values.
     * Run callback must return prediction metrics object.
     */
    constructor(options) {
        this._run_callback = options.run_callback;
        this._params = [];
        this._shades = [];
        this._combinations = [];
        this._results = [];
        this._prepare(options.params);
    }

    /** Save this class to file */
    save(fname) {
        let memento = {
            results: this._results,
            params: this._params,
            combinations: this._combinations
        };
        fs.writeFileSync(fname, JSON.stringify(memento), { encoding: "utf8" });
    }

    /** Load this class from file */
    load(fname) {
        let s = fs.readFileSync(fname, "utf8");
        let memento = JSON.parse(s);
        this._results = memento.results;
        this._params = memento.params;
        this._combinations = memento.combinations;
    }

    /** Shallow clones provided object. */
    clone(obj) {
        return Object.assign({}, obj);
    }

    /** Prepares all combinations of input parameters */
    _prepare(params_orig) {
        let pars = [];
        for (let par in params_orig) {
            pars.push({ name: par, values: params_orig[par] });
        }

        this._combinations = [{}];
        for (let i = 0; i < pars.length; i++) {
            let collected_new = [];
            for (let obj of this._combinations) {
                for (let j = 0; j < pars[i].values.length; j++) {
                    let obj2 = this.clone(obj);
                    obj2[pars[i].name] = pars[i].values[j];
                    collected_new.push(obj2);
                }
            }
            this._combinations = collected_new;
        }
        this._params = pars;
    }

    /** Creates all combinations of parameters and runs the callback for each one. */
    async run() {
        for (let par of this._combinations) {
            this._results.push({
                params: par,
                results: await this._run_callback(par)
            });
        }
    }

    /** Utility method that creates default value table. */
    _createDefaultTable(r, c, d) {
        let res_table = [];
        for (let i = 0; i < r; i++) {
            let tmp = [];
            for (let j = 0; j < c; j++) {
                tmp.push(d);
            }
            res_table.push(tmp);
        }
        return res_table;
    }

    /** Utility method that will find the index inside the array of filter object.
     * Filter means simply an object that contains some properties that target object must match.
     */
    _findMatchForParam(filter_arr, obj) {
        for (let i = 0; i < filter_arr.length; i++) {
            let match = true;
            for (let p in filter_arr[i]) {
                match = match && obj[p] == filter_arr[i][p];
            }
            if (match) {
                return i;
            }
        }
        return -1;
    }

    /** Returns the table of best results.
     * User specifies which parameter should be used
     * for rows and which for columns. He also needs to
     * provide callback that evaluates the results.
     */
    async getTableOfResults(colPars, rowPars, evalCallback) {
        let combinations_rows = [{}];
        let combinations_cols = [{}];
        let pars_rows = this._params.filter(x => rowPars.indexOf(x.name) >= 0);
        let pars_cols = this._params.filter(x => colPars.indexOf(x.name) >= 0);

        for (let i = 0; i < pars_rows.length; i++) {
            let collected_new = [];
            for (let obj of combinations_rows) {
                for (let j = 0; j < pars_rows[i].values.length; j++) {
                    let obj2 = this.clone(obj);
                    obj2[pars_rows[i].name] = pars_rows[i].values[j];
                    collected_new.push(obj2);
                }
            }
            combinations_rows = collected_new;
        }
        for (let i = 0; i < pars_cols.length; i++) {
            let collected_new = [];
            for (let obj of combinations_cols) {
                for (let j = 0; j < pars_cols[i].values.length; j++) {
                    let obj2 = this.clone(obj);
                    obj2[pars_cols[i].name] = pars_cols[i].values[j];
                    collected_new.push(obj2);
                }
            }
            combinations_cols = collected_new;
        }

        let res_table = this._createDefaultTable(combinations_rows.length, combinations_cols.length, -100);

        for (let res of this._results) {
            let r = this._findMatchForParam(combinations_rows, res.params);
            let c = this._findMatchForParam(combinations_cols, res.params);
            if (r < 0 || c < 0) {
                continue; // should not happen, really
            }
            let val = await evalCallback(res);
            if (res_table[r][c] < val) {
                res_table[r][c] = val;
            }
        }
        return {
            rows: combinations_rows,
            cols: combinations_cols,
            results: res_table
        };
    }

    /** Utility method for creating text display of parameter/filter object */
    _createTitle(obj) {
        let res = "";
        for (let p in obj) {
            res += `${p}=${obj[p]},`;
        }
        return res.substr(0, res.length - 1);
    }

    /** Utility function for padding given string to specified length */
    _padToWidth(s, width, c) {
        c = c || " ";
        while (s.length < width) s += c;
        return s;
    }

    /** This method prepares output colors given max range */
    _prepareColorShades(min, max) {
        let step = (max - min) / 5;
        this._shades = [];
        for (let i = 0; i < 5; i++) {
            this._shades.push(max - i * step);
        }
    }

    /** Outputs numeric values while producing mathing color for the value */
    _outputValue(val, width) {
        let s = this._padToWidth("" + val, width);
        if (this._shades[1] < val) return s.magenta;
        if (this._shades[2] < val) return s.red;
        if (this._shades[3] < val) return s.yellow;
        if (this._shades[4] < val) return s.white;
        return s.grey;
    }

    /** Display table in friendly way */
    async displayTableOfResults(colPars, rowPars, evalCallback) {
        let tab = await this.getTableOfResults(colPars, rowPars, evalCallback);
        let col_titles = tab.cols.map(x => this._createTitle(x));
        let row_titles = tab.rows.map(x => this._createTitle(x));
        let col_widths = col_titles.map(x => Math.max(x.length + 4, 8));

        let first_col_width = 0;
        row_titles.forEach(x => { first_col_width = Math.max(first_col_width, x.length + 4); });

        // calculate color ranges
        let rmin = null, rmax = null;
        tab.results.forEach(x => {
            x.forEach(y => {
                if (rmin === null || rmin > y) {
                    rmin = y;
                }
                if (rmax === null || rmax < y) {
                    rmax = y;
                }
            });
        });
        this._prepareColorShades(rmin, rmax);

        // ok, start with display
        let row = "", row2 = "";

        row += "| " + this._padToWidth("", first_col_width);
        row2 += "|-" + this._padToWidth("", first_col_width, "-");
        for (let i = 0; i < col_titles.length; i++) {
            row += "| " + this._padToWidth(col_titles[i], col_widths[i]).cyan;
            row2 += "|-" + this._padToWidth("", col_widths[i], "-");
        }
        console.log(row);
        console.log(row2);

        for (let j = 0; j < row_titles.length; j++) {
            row = "| ";
            row += this._padToWidth(row_titles[j], first_col_width).cyan;
            for (let i = 0; i < col_titles.length; i++) {
                row += "| " + this._outputValue(tab.results[j][i], col_widths[i]);
            }
            console.log(row);
        }
    }
}

exports.GridSearch = GridSearch;