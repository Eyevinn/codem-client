# Codem-watcher

## Description
Codem-watcher is a program that monitors a folder for new MP4 files and transcode the
file into multiple files each with different bitrates. The transcoding is performed by
[codem-transcode](www.transcodem.com). The resulting files are copied to the specified
destination folder and a SMIL file are created. These files can then be delivered
by for example a Wowza Streaming Engine.

## Installation
Recommended installation procedure is to use [npm](npmjs.org):

    # npm install codem-watcher

Use the `-g` option to install it globally

    # npm install -g codem-watcher
    
To start the program find where ´npm´ installs your packages and this script. Then run

    # /PATH/TO/PROGRAM/bin/codem-watcher

## Configuration

The configuration is a simple text file including a valid JSON object. Example config:

    {
      watchfolder: '/mnt/resource/incoming',
      destination: '/mnt/resource/test/',
      transcoderapi: 'http://localhost:3080/jobs',
      profile: {
        '720p': {
          'width': 1280,
          'height': 720,
          'video': '1300000',
          'audio': '128000',
          'encoder': "-s 1280x720 -strict experimental -acodec aac -ab 128k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 1100000" 
        },
        '360p': {
          'width': 640,
          'height': 360,
          'video': '820000',
          'audio': '64000',
          'encoder': "-s 640x360 -strict experimental -acodec aac -ab 64k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 750000"
        },
        '160p': {
          'width': 284,
          'height': 160,
          'video': '300000',
          'audio': '46000',
          'encoder': "-s 284x160 -strict experimental -acodec aac -ab 48k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 240000"
        }
      }
   }

Use the CLI option (´-c´) and point to the configuration file

    # codem-watcher -c watcher-config.json

## Issues and support
If you run into any issues while using codem-transcode please use the Github issue 
tracker to see if it is a known problem or report it as a new one.

## License
Codem-watcher is released under the MIT license see http://opensource.org/licenses/MIT
