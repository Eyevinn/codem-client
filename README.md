# Codem-client

* http://github.com/Eyevinn/codem-client

## Description

Some clients for codem-transcode (http://github.com/madebyhiro/codem-transcode):

### codem-watcher 

Watching a directory and calling codem-transcode when new .mp4-files appear.

### codem-manager

A queue manager for multiple nodes of codem-transcode. Used by doing a POST to
the manager.  Upon receiving a job request, the manager polls all transcoder
nodes for their status. Then it deploys the job on the node having most number
of free slots.

Naturally, each transcoder node needs to have a running instance of
codem-transcode.

Currently, the transcoder node MUST have the codem managers `localdestination`
path NFS mounted on the same local path. This, since the manager will request
the node to put its output in that directory.

## Requirements
node.js

## Installation
Install by using npm (http://npmjs.org/):

    `npm install codem-client`

## Configuration

The codem-manager takes a configuration file as argument with the -c flag. Example of configuration file:

    {
        localdestination: '/tmp/transcode_out/',
        port: 8099,
        transcoderapi: {
            manager: 'codem-manager',   // How transcoder nodes can reach the manager
            transcoders: [
                'http://transcoder-one:8080',
                'http://transcoder-two:8080' 
                ] 
        },
        profile: {
            '720p': {
                      width: 1280,
                      height: 720,
                      video: '1200k',
                      audio: '128k',
                      options: '-strict experimental -acodec aac -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48' 
                  },
            '360p': {
                      width: 640,
                      height: 360,
                      video: '820k',
                      audio: '64k',
                      options: '-strict experimental -acodec aac -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48'
                  },
            '160p': {
                      width: 284,
                      height: 160,
                      video: '300k',
                      audio: '46k',
                      options: '-strict experimental -acodec aac -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48'
                  }
                 }
    }

* `localdestination`  The local destination directory (must be NFS-mounted by the transcoder nodes).
* `port` The port on which the manager listens (both for clients and transcoder nodes).
* `transcoderapi` Configuration of transcoder nodes.
    * `manager` The host name or IP address on which the nodes can reach the manager.
    * `transcoders` An array of URL's to transcoder nodes.
* `profile` Configuration of transcoding profiles. The keys to the configurations is used in `formats` when POSTing a new job. Only formats matching an existing profile key will be transcoded into.
    * `profile name`
        * `width` Width of video
        * `height` Height of video
        * `video` Bitrate of video
        * `audio` Bitrate of audio
        * `options` Further options to ffmpeg

## Usage

The HTTP API of codem-manager is as follows:

Request: `POST /jobs`
    { source : "http://my.source.com/sample.mp4",
      removesource : 0,
      formats     : [720p, 360p]
    }

Responses:
* `202 Accepted` - Job accepted
* Error handling to be implemented.

source can be either a local path on the manager's disk, or a HTTP URL.
Currently the codem-manager only transcodes to the `localdestination` path configured in the codem-manager.
If removesource is set to a true value and source is on a local disk, the source file will be deleted when all transcodings have completed.

## License
Codem-client is released under the MIT license.
