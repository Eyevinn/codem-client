var ffprobe = require('node-ffprobe')
   ,     fs = require('fs')
   ,   path = require('path')
   ,builder = require('xmlbuilder')


function pickProbeData(probedata) {
    var srcdata = {
        file : probedata.file
    };
    if (probedata.metadata) {
        srcdata['title'] = probedata.metadata['title'];
    }
    for (var i = 0; i < probedata.streams.length; i++) {
        var stream = probedata.streams[i];
        // XXX We assume only one video stream and one audio stream
        if (stream.codec_type == 'video') {
            srcdata.width = stream.width;
            srcdata.height = stream.height;
            srcdata.videobitrate = stream.bit_rate;
        } else if (stream.codec_type == 'audio') {
            srcdata.audiobitrate = stream.bit_rate;
        }
    }
    return srcdata;
} 

function writeSMIL(basepath, basename) {
    var smilfile = path.join(basepath,basename) + ".smil";

    var files = fs.readdirSync(path.join(basepath,basename)).
        map(function(x) {return path.join(basename,x);});
    createSMIL(basepath, basename, files, undefined, function(smilxml) {
        fs.writeFile(smilfile, smilxml);
    });
}

function createSMIL(basepath, basename, files, err, success) {
    basepath = basepath.replace(/\/+$/,'');
    var n = files.length;
    var probedata = [];

    function buildXML(arr) {
        var root = builder.create('smil', {version: '1.0', encoding: 'UTF-8', standalone: true}); 
        root.att('title', basename);
        var rootsw = root.ele('body').ele('switch');
        arr = arr.map(pickProbeData).sort(function(a,b){return b.width - a.width;});
        for (var i in arr) {
            var srcdata = arr[i];
            var el = rootsw.ele('video', {height: srcdata.height, 
                                          width: srcdata.width, 
                                          src: srcdata.file.replace(basepath+'/','')});
            el.ele('param', {name: 'videoBitrate', 
                             value: srcdata.videobitrate, 
                             valuetype: 'data'});
            el.ele('param', {name: 'audioBitrate', 
                             value: srcdata.audiobitrate, 
                             valuetype: 'data'});
        }
        var smilxml = rootsw.end({ pretty: true });
        success(smilxml);
    }

    for (var i = 0; i<n ; i++) {
        ffprobe(path.join(basepath,files[i]), function(err, data) {
            probedata.push(data);
            if (probedata.length === n) {
                buildXML(probedata);
            }
        });
    }
}

exports.createSMIL = createSMIL;
exports.writeSMIL = writeSMIL;
