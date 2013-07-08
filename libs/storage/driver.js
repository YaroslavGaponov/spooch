
var fs = require("fs");
var util = require("util");
var Cache = require("./cache");

var HEADER = { SIGN_OFFSET: 0, VERSION_OFFSET: 6, TABLE_ELEMETS_OFFSET: 10, SIZE: 14 };
var SIGN = "SPOOCH";
var VERSION = 0;

var RECORD_HEADER = { NEXT_OFFSET: 0, KEY_LENGTH_OFFSET: 4, VALUE_LENGTH_OFFSET: 8, SIZE: 12 };

var TABLE_ELEMETS = 1024;
var TABLE_SIZE = TABLE_ELEMETS << 2;
var EOL = 0xFFFFFFFF;


var Comparator = {
    MORE: 1, LESS: -1, EQUAL:  0,    
    compare:
        function(a, b) {
            if (a > b) return this.MORE;
            if (a < b) return this.LESS;
            return this.EQUAL;
        }
}


var Driver = module.exports = function(filename) {
    this.filename = filename; 
}

Driver.prototype.open = function() {
    this.cache = new Cache();
    var exists = fs.existsSync(this.filename);    
    if (exists) {
        this.fd = fs.openSync(this.filename, "r+");
        this.eof = fs.fstatSync(this.fd).size;
    } else {
        this.fd = fs.openSync(this.filename, "wx+");
        
        var header = new Buffer(HEADER.SIZE);
        header.write(SIGN, HEADER.SIGN_OFFSET);
        header.writeUInt32BE(VERSION, HEADER.VERSION_OFFSET);
        header.writeUInt32BE(TABLE_ELEMETS, HEADER.TABLE_ELEMETS_OFFSET);
        fs.writeSync(this.fd, header, 0, header.length, 0);
        
        var table = new Buffer(TABLE_SIZE); table.fill(EOL & 0xFF);
        fs.writeSync(this.fd, table, 0, TABLE_SIZE, HEADER.SIZE);
        this.eof = HEADER.SIZE + TABLE_SIZE;
    }
    return true;
}

Driver.prototype.close = function() {
    this.cache = null;
    fs.closeSync(this.fd);
    return true;
}

Driver.prototype.set = function(key, value) {
    
    key = Driver.stringify(key);
    value = Driver.stringify(value);
        
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    var offset = o.readUInt32BE(0);
    
    var pred_offset = null;

    var record_header = new Buffer(RECORD_HEADER.SIZE);
    record_header.writeUInt32BE(EOL, RECORD_HEADER.NEXT_OFFSET);

    while(offset != EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            offset = record_header.readUInt32BE(RECORD_HEADER.NEXT_OFFSET);
            break;            
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            break;
        }
    }
    
    var newRecord = new Buffer(RECORD_HEADER.SIZE + key.length + value.length);
    newRecord.writeUInt32BE(offset, RECORD_HEADER.NEXT_OFFSET);
    newRecord.writeUInt32BE(key.length, RECORD_HEADER.KEY_LENGTH_OFFSET);
    newRecord.writeUInt32BE(value.length, RECORD_HEADER.VALUE_LENGTH_OFFSET);
    newRecord.write(key, RECORD_HEADER.SIZE);
    newRecord.write(value, RECORD_HEADER.SIZE + key.length);
    
    var bytes = fs.writeSync(this.fd, newRecord, 0, newRecord.length, this.eof);

    if (pred_offset) {
        var o = new Buffer(4);
        o.writeUInt32BE(this.eof, 0);
        fs.writeSync(this.fd, o, 0, o.length, pred_offset);
    } else {
        var o = new Buffer(4);
        o.writeUInt32BE(this.eof, 0);
        fs.writeSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    }
    
    this.eof += bytes;

    if (this.cache) {
        this.cache.add(key, value);
    }
    
    return true;
}


Driver.prototype.get = function(key) {
    
    key = Driver.stringify(key);
    
    if (this.cache) {
        if (this.cache.get(key)) {
            return this.cache.get(key);    
        }
    }
    
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    var offset = o.readUInt32BE(0);

    var record_header = new Buffer(RECORD_HEADER.SIZE); 
    
    while(offset != EOL) {        
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);                
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            var curr_value_size = record_header.readUInt32BE(RECORD_HEADER.VALUE_LENGTH_OFFSET);
            var curr_value = new Buffer(curr_value_size);
            fs.readSync(this.fd, curr_value, 0, curr_value_size, offset + RECORD_HEADER.SIZE + curr_key_size);
            return curr_value.toString();
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            offset = record_header.readUInt32BE(RECORD_HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            return null;
        }
    }
    
    return null;
}

Driver.prototype.remove = function(key) {
    
    key = Driver.stringify(key);
        
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    var offset = o.readUInt32BE(0);
    
    var pred_offset = null;

    var record_header = new Buffer(RECORD_HEADER.SIZE);
    record_header.writeUInt32BE(EOL, RECORD_HEADER.NEXT_OFFSET);

    while(offset != EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            offset = record_header.readUInt32BE(RECORD_HEADER.NEXT_OFFSET);
            break;            
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            return false;
        }
    }
    
    if (pred_offset) {
        var o = new Buffer(4);
        o.writeUInt32BE(offset, 0);
        fs.writeSync(this.fd, o, 0, o.length, pred_offset);
    } else {
        var o = new Buffer(4);
        o.writeUInt32BE(EOL, 0);
        fs.writeSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    }
    
    if (this.cache) {
        this.cache.remove(key);
    }
    
    return true;
}

Driver.hashCode = function(str) {
    var ch, hash = 0;
    if (str.length == 0) return hash;
    for (var i=0; i<str.length; i++) {
        ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return hash & 0x7fffffff;
}


Driver.stringify = function(s) {
    return typeof s === "string" ? s : s.toString();
}






