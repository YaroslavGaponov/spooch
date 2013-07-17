/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var errors = require("../../libs/utils/errors");

var SOURCE = "Plugin: _array";

var ERRORS = [
    [1, 'BadRequest',       'The request cannot be fulfilled due to bad syntax.'],
    [2, 'InternalError',    'The server encountered an error.'],
    [3, 'NotImplemented',   'The method you are using to access the document can not be performed by the server.'],    
];


module.exports = errors(SOURCE, ERRORS);
